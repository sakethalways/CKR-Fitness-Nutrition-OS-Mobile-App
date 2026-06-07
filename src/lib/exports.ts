import { Client, Meal } from "@/data/types";

type Section = { slot: string; meals: Meal[] };

export const buildWhatsAppText = (
  client: Client,
  sections: Section[],
  range: { low: number; high: number }
): string => {
  const lines: string[] = [];
  lines.push(`🥗 *CKR Nutrition Plan — ${client.name}*`);
  lines.push(`Target: ${client.calorieTarget} kcal/d · Protein ${client.proteinTarget}g`);
  lines.push(`Stay between *${range.low}–${range.high} kcal* across the day`);
  lines.push("");
  for (const s of sections) {
    lines.push(`*${s.slot.toUpperCase()}* — pick one`);
    for (const m of s.meals) {
      lines.push(
        `• *${m.mealName}* — ${m.calories} kcal · P${Math.round(m.proteinG)} C${Math.round(m.carbsG)} F${Math.round(m.fatG)}`
      );
      // The ingredient quantities are the most useful part for the client.
      if (m.quantities) lines.push(`   ${m.quantities}`);
    }
    lines.push("");
  }
  lines.push("Built with CKR Fitness · Nutrition OS");
  return lines.join("\n");
};

export const buildPlanHTML = (
  client: Client,
  sections: Section[],
  range: { low: number; high: number }
): string => {
  const slotBlocks = sections
    .map(
      (s) => `
    <div class="slot">
      <div class="slot-head">
        <div class="slot-name">${s.slot}</div>
        <div class="slot-pick">pick one</div>
      </div>
      ${s.meals
        .map(
          (m) => `
        <div class="meal">
          <div class="meal-head">
            <div class="meal-name">${escapeHtml(m.mealName)}</div>
            <div class="meal-kcal">${m.calories} <span class="unit">kcal</span></div>
          </div>
          <div class="meal-meta">
            <span class="macro p">P ${Math.round(m.proteinG)}g</span>
            <span class="macro c">C ${Math.round(m.carbsG)}g</span>
            <span class="macro f">F ${Math.round(m.fatG)}g</span>
          </div>
          ${
            m.quantities
              ? `<div class="meal-qty">${escapeHtml(m.quantities)}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
  `
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    background: #0A0B0D;
    color: #FFFFFF;
    padding: 20px 24px;
    font-size: 14px;
    line-height: 1.4;
  }
  .brand-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .brand-mark {
    width: 32px; height: 32px; border-radius: 8px;
    background: #C6F432; color: #0A0B0D;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 18px; letter-spacing: -1px; flex-shrink: 0;
  }
  .brand-name { font-size: 10px; letter-spacing: 1px; color: #C6F432; font-weight: 700; }
  .brand-sub { font-size: 12px; color: #94A3B8; }
  h1 { font-size: 24px; letter-spacing: -0.5px; margin: 8px 0 2px; font-weight: 700; }
  .client-meta { font-size: 12px; color: #94A3B8; margin-bottom: 12px; line-height: 1.3; }
  .range-card {
    margin-bottom: 16px; padding: 12px 14px;
    background: rgba(198,244,50,0.08);
    border: 1px solid rgba(198,244,50,0.30);
    border-radius: 12px;
  }
  .range-label { font-size: 9px; letter-spacing: 1px; color: #C6F432; font-weight: 700; }
  .range-value { font-size: 22px; font-weight: 700; color: #D8FF5C; letter-spacing: -0.3px; margin-top: 2px; }
  .range-hint { font-size: 11px; color: #94A3B8; margin-top: 4px; }
  .slot { margin-bottom: 14px; page-break-inside: avoid; }
  .slot-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; border-bottom: 1px solid rgba(198,244,50,0.4); padding-bottom: 6px; }
  .slot-name { font-size: 13px; letter-spacing: 1.5px; font-weight: 700; color: #C6F432; }
  .slot-pick { font-size: 9px; letter-spacing: 0.5px; color: #64748B; }
  .meal {
    padding: 10px 12px; margin-bottom: 6px;
    background: #14161B;
    border: 0.5px solid rgba(255,255,255,0.06);
    border-radius: 8px;
  }
  .meal-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .meal-name { font-size: 13px; font-weight: 600; flex: 1; }
  .meal-kcal { font-size: 16px; font-weight: 700; color: #D8FF5C; letter-spacing: -0.2px; white-space: nowrap; }
  .meal-kcal .unit { font-size: 9px; color: #64748B; margin-left: 1px; font-weight: 500; }
  .meal-meta { margin-top: 4px; display: flex; gap: 6px; flex-wrap: wrap; }
  .meal-qty { margin-top: 6px; font-size: 11px; color: #B6C2D1; line-height: 1.45; border-top: 0.5px dashed rgba(255,255,255,0.10); padding-top: 6px; }
  .macro { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
  .macro.p { color: #60A5FA; background: rgba(96,165,250,0.12); }
  .macro.c { color: #C6F432; background: rgba(198,244,50,0.12); }
  .macro.f { color: #FBBF24; background: rgba(251,191,36,0.12); }
  .footer { margin-top: 16px; padding-top: 12px; border-top: 0.5px solid rgba(255,255,255,0.06); font-size: 10px; color: #475569; text-align: center; }
</style>
</head>
<body>
  <div class="brand-row">
    <div class="brand-mark">C</div>
    <div>
      <div class="brand-name">CKR FITNESS</div>
      <div class="brand-sub">Nutrition OS</div>
    </div>
  </div>
  <h1>${escapeHtml(client.name)}</h1>
  <div class="client-meta">${client.age}${client.gender} · ${client.weight}kg · ${client.height}cm · ${client.goal} · ${client.activityLevel}</div>
  <div class="range-card">
    <div class="range-label">DAILY CALORIE RANGE</div>
    <div class="range-value">${range.low} – ${range.high} kcal</div>
    <div class="range-hint">Pick one meal per slot. Any combination lands within target.</div>
  </div>
  ${slotBlocks}
  <div class="footer">Built with CKR Fitness · Nutrition OS · Internal trainer tool</div>
</body>
</html>`;
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
