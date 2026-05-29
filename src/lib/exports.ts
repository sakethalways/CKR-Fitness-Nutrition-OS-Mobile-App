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
        `• ${m.mealName} — ${m.calories} kcal · P${Math.round(m.proteinG)} C${Math.round(m.carbsG)} F${Math.round(m.fatG)}`
      );
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
    padding: 36px 32px;
  }
  .brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
  .brand-mark {
    width: 36px; height: 36px; border-radius: 10px;
    background: #C6F432; color: #0A0B0D;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 22px; letter-spacing: -1px;
  }
  .brand-name { font-size: 11px; letter-spacing: 2px; color: #C6F432; font-weight: 700; }
  .brand-sub { font-size: 15px; color: #94A3B8; }
  h1 { font-size: 30px; letter-spacing: -0.5px; margin: 18px 0 4px; }
  .client-meta { font-size: 13px; color: #94A3B8; }
  .range-card {
    margin-top: 22px; padding: 16px 18px;
    background: rgba(198,244,50,0.08);
    border: 1px solid rgba(198,244,50,0.30);
    border-radius: 16px;
  }
  .range-label { font-size: 10px; letter-spacing: 1.5px; color: #C6F432; font-weight: 700; }
  .range-value { font-size: 26px; font-weight: 700; color: #D8FF5C; letter-spacing: -0.5px; margin-top: 4px; }
  .range-hint { font-size: 12px; color: #94A3B8; margin-top: 2px; }
  .slot { margin-top: 22px; page-break-inside: avoid; }
  .slot-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
  .slot-name { font-size: 12px; letter-spacing: 2px; font-weight: 700; color: #FFFFFF; }
  .slot-pick { font-size: 10px; letter-spacing: 1px; color: #64748B; }
  .meal {
    padding: 14px 16px; margin-bottom: 8px;
    background: #14161B;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
  }
  .meal-head { display: flex; justify-content: space-between; align-items: baseline; }
  .meal-name { font-size: 15px; font-weight: 600; }
  .meal-kcal { font-size: 18px; font-weight: 700; color: #D8FF5C; letter-spacing: -0.3px; }
  .meal-kcal .unit { font-size: 10px; color: #64748B; margin-left: 2px; font-weight: 500; letter-spacing: 0; }
  .meal-meta { margin-top: 6px; display: flex; gap: 8px; flex-wrap: wrap; }
  .ref { font-size: 11px; color: #94A3B8; padding: 2px 8px; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; }
  .ref.gap { color: #F87171; border-color: rgba(248,113,113,0.3); }
  .macro { font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
  .macro.p { color: #60A5FA; background: rgba(96,165,250,0.12); }
  .macro.c { color: #C6F432; background: rgba(198,244,50,0.12); }
  .macro.f { color: #FBBF24; background: rgba(251,191,36,0.12); }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11px; color: #475569; text-align: center; }
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
