export const timeAgo = (iso?: string): string => {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
};

export const genderAge = (g: string, age: number) => `${age}${g}`;

export const genderLabel = (g: string): string => {
  if (g === "M") return "Male";
  if (g === "F") return "Female";
  return "Other";
};

// Plans run on 7-day cycles. Day 1 = day of creation.
export const PLAN_CYCLE_DAYS = 7;

export const daysSincePlan = (createdAt: string): number => {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
};

export type PlanDayState =
  | { kind: "active"; day: number; total: number }
  | { kind: "extend"; day: number }
  | { kind: "ended" }
  | { kind: "reached" };

/**
 * `clientStatus` is the *client's* status (Active/Critical/On Hold/Completed).
 * `planStatus` is the *plan's* status (active/past).
 */
export const planDayState = (args: {
  createdAt: string;
  planStatus: "active" | "past";
  clientStatus?: string;
}): PlanDayState => {
  if (args.clientStatus === "Completed") return { kind: "reached" };
  if (args.planStatus === "past") return { kind: "ended" };
  const day = daysSincePlan(args.createdAt);
  if (day > PLAN_CYCLE_DAYS) return { kind: "extend", day };
  return { kind: "active", day, total: PLAN_CYCLE_DAYS };
};

export const planDayLabel = (state: PlanDayState): string => {
  switch (state.kind) {
    case "active":
      return `Day ${state.day} of ${state.total}`;
    case "extend":
      return "Cycle ended — start next plan";
    case "ended":
      return "Ended";
    case "reached":
      return "Goal reached";
  }
};

export const formatDate = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

