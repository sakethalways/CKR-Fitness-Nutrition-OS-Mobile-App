/**
 * CKR Meals — two-way Google Sheet <-> Supabase sync.
 *
 * Paste this into the Apps Script editor of the meals spreadsheet
 * (Extensions -> Apps Script). See MEAL_SHEET_SYNC_SETUP.md for full setup.
 *
 * WHAT IT DOES
 *   The sheet and the Supabase `meals` table are kept in sync both ways:
 *     • Edit a cell in the sheet  -> the app updates (within a minute).
 *     • Edit/add/delete in the app -> the sheet updates on the next sync.
 *     • Delete a row in the sheet -> the meal is deleted in the app.
 *     • Delete a meal in the app  -> the row disappears from the sheet.
 *
 * CONFLICTS: last-write-wins. If the SAME meal is edited in both the sheet and
 *   the app between two syncs, whichever was saved most recently wins.
 *
 * HOW IT STAYS CORRECT
 *   One function — reconcile() — is the single brain. It pulls the full DB
 *   state, reads the full sheet, and computes the desired end state per row:
 *     - row in both, values differ  -> newer side wins (sheet_updated_at vs
 *       db updated_at)
 *     - row in DB only:
 *         tombstoned (deleted in app) -> remove from sheet
 *         created in app since last sync (created_at > last) -> add to sheet
 *         otherwise (it was deleted from the sheet) -> delete from DB
 *     - row in sheet only:
 *         tombstoned -> it was deleted in app -> drop the sheet row
 *         otherwise (new in sheet) -> insert into DB (id assigned, written back)
 */

// ===== CONFIG — set these in Project Settings -> Script Properties =====
//   FUNCTION_URL  = https://<project-ref>.functions.supabase.co/meals-sync
//   SYNC_SECRET   = the same value you set as SHEET_SYNC_SECRET on Supabase
function cfg_(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw new Error("Missing Script Property: " + key);
  return v;
}

var SHEET_NAME = "Meals";

// Visible data columns, in order. The header row must match these exactly.
var COLS = [
  "id",
  "meal_code",
  "meal_number",
  "meal_name",
  "meal_type",
  "diet",
  "cal_bracket",
  "quantities",
  "calories",
  "protein_g",
  "carbs_g",
  "fat_g",
  "client_tags",   // comma-separated in the sheet
  "allergens",     // comma-separated in the sheet
  "notes",
  "rating",
  "base_description",
  "protein_anchor",
  "meal_section",
  "reel_url"
];
// Hidden bookkeeping column appended after COLS. Do not edit by hand.
var SHEET_TS_COL = "sheet_updated_at";

var ARRAY_FIELDS = { client_tags: true, allergens: true };
var NUMBER_FIELDS = {
  id: true, meal_number: true, calories: true, protein_g: true,
  carbs_g: true, fat_g: true, rating: true
};

// Allowed values. Single-value fields get strict dropdowns; multi-value fields
// get a header note + case auto-correction (a cell can hold several, comma-sep).
var MEAL_TYPE_VALUES = ["Breakfast", "Lunch / Dinner", "Snack"];
var DIET_VALUES = ["Veg", "Non-Veg"];
var CAL_BRACKET_VALUES = [
  // Main meals (Breakfast / Lunch / Dinner)
  "350–400 kcal", "400–450 kcal", "450–500 kcal", "500–550 kcal",
  "550–600 kcal", "600–650 kcal", "650–700 kcal", "700–750 kcal",
  // Snacks
  "150–200 kcal", "200–250 kcal", "250–300 kcal", "300–350 kcal"
];
var CLIENT_TAG_VALUES = ["Sweet Craving", "Busy", "Standard", "Vegetarian", "Veg"];
var ALLERGEN_VALUES = ["Dairy", "Gluten", "Nuts", "Eggs", "Soy", "Shellfish", "Fish", "Sesame"];
// field -> canonical value list, for case-insensitive auto-correction.
var CANON = { client_tags: CLIENT_TAG_VALUES, allergens: ALLERGEN_VALUES };

// ---------- Menu + triggers ----------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("CKR Sync")
    .addItem("Sync now", "reconcile")
    .addItem("Install auto-sync (every 5 min)", "installTriggers")
    .addItem("Set up dropdowns & rules", "setupValidation")
    .addItem("Remove auto-sync", "removeTriggers")
    .addToUi();
}

function installTriggers() {
  removeTriggers();
  ScriptApp.newTrigger("reconcile").timeBased().everyMinutes(5).create();
  var ss = SpreadsheetApp.getActive();
  ScriptApp.newTrigger("onEditStamp").forSpreadsheet(ss).onEdit().create();
  SpreadsheetApp.getActive().toast("Auto-sync installed (every 5 min).");
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === "reconcile" || fn === "onEditStamp") ScriptApp.deleteTrigger(t);
  });
}

/**
 * Runs on every edit. Two jobs:
 *  1) Multi-select for client_tags / allergens — picking a value from the
 *     dropdown ADDS it to the cell's comma list (picking an existing one
 *     removes it), so you can build "Nuts, Dairy" by clicking twice.
 *  2) Stamp the edited row's sheet_updated_at so reconcile knows it changed.
 */
function onEditStamp(e) {
  try {
    var sh = e.range.getSheet();
    if (sh.getName() !== SHEET_NAME) return;
    var row = e.range.getRow();
    if (row === 1) return; // header

    // 1) Multi-select toggle (single-cell edits only, so e.value/oldValue exist).
    if (e.range.getNumRows() === 1 && e.range.getNumColumns() === 1) {
      var col = e.range.getColumn();
      var field = null;
      if (col === COLS.indexOf("client_tags") + 1) field = "client_tags";
      else if (col === COLS.indexOf("allergens") + 1) field = "allergens";
      if (field) {
        var list = CANON[field];
        var picked = e.value == null ? "" : String(e.value).trim();
        // Only treat as a "pick" when a single allowed value was chosen. A
        // manually typed combo (e.g. "Nuts, Dairy") is left as-is.
        if (picked && list.indexOf(picked) !== -1) {
          var prev = e.oldValue == null ? "" : String(e.oldValue);
          var parts = prev.split(",")
            .map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 0; });
          var at = parts.indexOf(picked);
          if (at === -1) parts.push(picked); else parts.splice(at, 1); // toggle
          e.range.setValue(parts.join(", "));
        }
      }
    }

    // 2) Stamp the row.
    var tsCol = COLS.length + 1; // 1-based, just after visible cols
    sh.getRange(row, tsCol).setValue(new Date().toISOString());
  } catch (err) {
    // Never let a stamp failure block the user's edit.
  }
}

// ---------- Dropdowns / validation ----------

/**
 * Add strict dropdowns to the single-value columns and helper notes to the
 * multi-value columns. Safe to run any time; survives syncs (a full rewrite
 * clears cell VALUES, not validation rules). Run once via the menu.
 */
function setupValidation() {
  var sh = getOrCreateSheet_();
  var maxRows = 2000; // covers far more rows than the catalogue will ever have

  // Single-value columns: strict dropdown (reject anything off-list).
  applyDropdown_(sh, "meal_type", MEAL_TYPE_VALUES, false);
  applyDropdown_(sh, "diet", DIET_VALUES, false);
  applyDropdown_(sh, "cal_bracket", CAL_BRACKET_VALUES, false);

  // Multi-value columns: show a dropdown for convenience, but ALLOW typing so a
  // cell can hold several values like "Nuts, Dairy". Header note lists allowed
  // words; capitalisation is auto-corrected on sync.
  applyDropdown_(sh, "client_tags", CLIENT_TAG_VALUES, true);
  applyDropdown_(sh, "allergens", ALLERGEN_VALUES, true);
  noteOnHeader_(sh, "client_tags",
    "Multi-select: pick from the dropdown one at a time — each pick is added, " +
    "pick again to remove. (Typing comma-separated also works.)\nAllowed: " +
    CLIENT_TAG_VALUES.join(", "));
  noteOnHeader_(sh, "allergens",
    "Multi-select: pick from the dropdown one at a time — each pick is added, " +
    "pick again to remove. (Typing comma-separated also works.)\nAllowed: " +
    ALLERGEN_VALUES.join(", ") +
    "\nLeave blank if none. Capitalisation is auto-corrected on sync.");

  function applyDropdown_(s, field, values, allowMultiple) {
    var col = COLS.indexOf(field) + 1;
    if (col < 1) return;
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true)
      .setAllowInvalid(allowMultiple) // false = reject; true = allow typed combos
      .setHelpText(
        allowMultiple
          ? "Pick one, or type several separated by commas: " + values.join(", ")
          : "Pick one: " + values.join(", ")
      )
      .build();
    s.getRange(2, col, maxRows, 1).setDataValidation(rule);
  }
  function noteOnHeader_(s, field, note) {
    var col = COLS.indexOf(field) + 1;
    if (col < 1) return;
    s.getRange(1, col).setNote(note);
  }

  SpreadsheetApp.getActive().toast("Dropdowns & rules applied.");
}

// ---------- Core reconcile ----------

function reconcile() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return; // a sync is already running
  try {
    var sheet = getOrCreateSheet_();
    var lastSync = getLastSync_();
    var nowIso = new Date().toISOString();

    // 1) Pull DB state.
    var exp = call_({ action: "export" });
    var dbMeals = {};
    (exp.meals || []).forEach(function (m) { dbMeals[String(m.id)] = m; });
    var tomb = {};
    (exp.deletions || []).forEach(function (d) { tomb[String(d.id)] = d; });

    // 2) Read sheet rows.
    var sheetRows = readSheet_(sheet); // [{ data:{}, tsSheet:ISO, rowIndex }]
    var sheetById = {};
    var newSheetRows = []; // rows with no id (brand new)
    sheetRows.forEach(function (r) {
      var id = r.data.id;
      if (id === "" || id == null) newSheetRows.push(r);
      else sheetById[String(id)] = r;
    });

    // 3) Decide.
    var upserts = [];       // existing rows changed -> DB
    var inserts = [];       // new sheet rows -> DB (then write id back)
    var deletesFromDB = []; // ids deleted in sheet -> delete in DB
    var clearTombstones = [];// app-deletes mirrored to sheet
    var finalById = {};     // desired final visible row, keyed by id (string)

    var allIds = {};
    Object.keys(dbMeals).forEach(function (k) { allIds[k] = true; });
    Object.keys(sheetById).forEach(function (k) { allIds[k] = true; });

    Object.keys(allIds).forEach(function (idStr) {
      var d = dbMeals[idStr];
      var s = sheetById[idStr];

      if (d && s) {
        // Last-write-wins by actual time (parse — DB uses +00:00, sheet uses Z).
        var sheetNewer = s.tsSheet && ms_(s.tsSheet) > ms_(d.updated_at);
        if (sheetNewer) {
          var up = s.data; up.id = Number(idStr);
          upserts.push(up);
          // Keep sheet values; keep the human edit time. Next cycle the DB's
          // post-upsert updated_at will be newer, so DB re-wins harmlessly.
          finalById[idStr] = { data: rowFromSheetData_(s.data), ts: s.tsSheet };
        } else {
          // DB wins (or equal) — stamp with the DB time so it's never mistaken
          // for a fresh sheet edit on the next cycle.
          finalById[idStr] = { data: rowFromDb_(d), ts: d.updated_at };
        }
      } else if (d && !s) {
        if (tomb[idStr]) {
          // deleted in app -> already absent from sheet; just clear tombstone
          clearTombstones.push(Number(idStr));
        } else if (d.created_at && ms_(d.created_at) > ms_(lastSync)) {
          finalById[idStr] = { data: rowFromDb_(d), ts: d.updated_at }; // new in app
        } else {
          deletesFromDB.push(Number(idStr)); // deleted from sheet -> delete DB
        }
      } else if (!d && s) {
        if (tomb[idStr]) {
          // deleted in app -> drop the stale sheet row, clear tombstone
          clearTombstones.push(Number(idStr));
        } else {
          // id present in sheet but not DB and no tombstone: treat as new
          inserts.push(s);
        }
      }
    });

    // brand-new sheet rows (no id) -> insert
    newSheetRows.forEach(function (r) { inserts.push(r); });

    // 4) Apply to DB.
    var mutateRes = call_({
      action: "mutate",
      upserts: upserts.map(stripForDb_),
      inserts: inserts.map(function (r) { return stripForDb_(r.data); }),
      deletes: deletesFromDB,
      clearTombstones: clearTombstones
    });

    // Inserted rows come back IN ORDER -> add to final state with new ids.
    var insertedRows = (mutateRes && mutateRes.inserted) || [];
    for (var i = 0; i < insertedRows.length; i++) {
      var ins = insertedRows[i];
      finalById[String(ins.id)] = { data: rowFromDb_(ins), ts: ins.updated_at };
    }

    // 5) Rewrite the sheet to the final state (handles removals too).
    writeSheet_(sheet, finalById, nowIso);
    setLastSync_(nowIso);

    SpreadsheetApp.getActive().toast(
      "Synced. " +
      upserts.length + " updated, " +
      insertedRows.length + " added, " +
      deletesFromDB.length + " deleted."
    );
  } finally {
    lock.releaseLock();
  }
}

// ---------- HTTP ----------

function call_(payload) {
  // The anon key is a valid project JWT, so sending it satisfies the function's
  // "Verify JWT" setting whether it's on or off — no dashboard toggle needed.
  // The anon key is public/safe; real auth is the x-sync-secret below.
  var anon = cfg_("ANON_KEY");
  var res = UrlFetchApp.fetch(cfg_("FUNCTION_URL"), {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-sync-secret": cfg_("SYNC_SECRET"),
      "Authorization": "Bearer " + anon,
      "apikey": anon
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error("Sync failed (" + code + "): " + text);
  }
  return JSON.parse(text);
}

// ---------- Sheet helpers ----------

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  // Ensure header.
  var header = COLS.concat([SHEET_TS_COL]);
  var firstRow = sh.getRange(1, 1, 1, header.length).getValues()[0];
  var needsHeader = false;
  for (var i = 0; i < header.length; i++) {
    if (firstRow[i] !== header[i]) { needsHeader = true; break; }
  }
  if (needsHeader) {
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    sh.setFrozenRows(1);
    sh.hideColumns(COLS.length + 1); // hide bookkeeping col
  }
  return sh;
}

function readSheet_(sh) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var width = COLS.length + 1;
  var values = sh.getRange(2, 1, lastRow - 1, width).getValues();
  var rows = [];
  for (var r = 0; r < values.length; r++) {
    var raw = values[r];
    // Skip fully blank rows.
    var blank = true;
    for (var c = 0; c < COLS.length; c++) {
      if (raw[c] !== "" && raw[c] != null) { blank = false; break; }
    }
    if (blank) continue;

    var data = {};
    for (var c2 = 0; c2 < COLS.length; c2++) {
      data[COLS[c2]] = raw[c2];
    }
    var tsSheet = raw[COLS.length];
    rows.push({
      data: data,
      tsSheet: tsSheet ? String(tsSheet) : "",
      rowIndex: r + 2
    });
  }
  return rows;
}

/** Final sheet row (visible cols) from a DB row. */
function rowFromDb_(d) {
  var o = {};
  COLS.forEach(function (k) {
    if (ARRAY_FIELDS[k]) o[k] = (d[k] || []).join(", ");
    else o[k] = d[k] == null ? "" : d[k];
  });
  return o;
}

/** Final sheet row from sheet data (normalise arrays back to display strings). */
function rowFromSheetData_(data) {
  var o = {};
  COLS.forEach(function (k) {
    o[k] = data[k] == null ? "" : data[k];
  });
  return o;
}

/** Convert a visible sheet row into a DB-shaped object for the edge function. */
function stripForDb_(data) {
  var o = {};
  COLS.forEach(function (k) {
    var v = data[k];
    if (ARRAY_FIELDS[k]) {
      o[k] = String(v || "")
        .split(",")
        .map(function (s) { return canon_(k, s.trim()); })
        .filter(function (s) { return s.length > 0; });
    } else if (NUMBER_FIELDS[k]) {
      if (k === "id") {
        if (v !== "" && v != null) o[k] = Number(v);
      } else {
        o[k] = v === "" || v == null ? 0 : Number(v);
      }
    } else {
      o[k] = v === "" ? null : v;
    }
  });
  // meal_section is just a mirror of meal_type — derive it so nobody has to fill
  // it and it can never drift.
  o.meal_section = o.meal_type;
  return o;
}

function writeSheet_(sh, finalById, nowIso) {
  // Order rows by meal_number then cal_bracket for a stable, readable sheet.
  var entries = Object.keys(finalById).map(function (id) { return finalById[id]; });
  entries.sort(function (a, b) {
    var an = Number(a.data.meal_number) || 0, bn = Number(b.data.meal_number) || 0;
    if (an !== bn) return an - bn;
    return String(a.data.cal_bracket).localeCompare(String(b.data.cal_bracket));
  });

  var width = COLS.length + 1;
  var out = entries.map(function (entry) {
    var row = entry.data;
    var line = COLS.map(function (k) { return row[k] == null ? "" : row[k]; });
    // Per-row source timestamp (NOT the sync time) so an unchanged row is never
    // mistaken for a fresh sheet edit next cycle.
    line.push(entry.ts || nowIso);
    return line;
  });

  // Clear old data region, then write.
  var lastRow = sh.getLastRow();
  if (lastRow >= 2) sh.getRange(2, 1, lastRow - 1, width).clearContent();
  if (out.length > 0) sh.getRange(2, 1, out.length, width).setValues(out);
}

// ---------- last-sync marker ----------

/** Case-insensitively snap a multi-value token to its canonical spelling. */
function canon_(field, token) {
  if (!token) return "";
  var list = CANON[field];
  if (!list) return token;
  var low = token.toLowerCase();
  for (var i = 0; i < list.length; i++) {
    if (list[i].toLowerCase() === low) return list[i];
  }
  return token; // unknown value kept as typed, so a real typo stays visible
}

/** Parse an ISO timestamp to epoch ms; 0 if missing/invalid. */
function ms_(iso) {
  if (!iso) return 0;
  var t = new Date(iso).getTime();
  return isNaN(t) ? 0 : t;
}

function getLastSync_() {
  return (
    PropertiesService.getScriptProperties().getProperty("LAST_SYNC") ||
    "1970-01-01T00:00:00.000Z"
  );
}
function setLastSync_(iso) {
  PropertiesService.getScriptProperties().setProperty("LAST_SYNC", iso);
}
