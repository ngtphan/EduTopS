export interface ScheduleGroupClassChipEntry {
  classLabel?: string;
  studentCount?: number;
}

interface RenderScheduleGroupClassChipsOptions {
  entries?: readonly ScheduleGroupClassChipEntry[];
  limit?: number;
  toSafeText?: (value: unknown) => string;
}

const defaultSafeText = (value: unknown): string => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return "";
};

export const renderScheduleGroupClassChips = ({
  entries = [],
  limit = 6,
  toSafeText = defaultSafeText,
}: RenderScheduleGroupClassChipsOptions = {}): string => {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 6;
  const visibleEntries = entries.slice(0, safeLimit);
  const hiddenCount = Math.max(entries.length - visibleEntries.length, 0);

  const chips = visibleEntries
    .map((entry) => {
      const classLabel = toSafeText(entry?.classLabel || "");
      const studentCount = toSafeText(String(entry?.studentCount || 0));
      return `<span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-white border-slate-200 text-slate-700">${classLabel} (${studentCount} HS)</span>`;
    })
    .join("");

  const overflowChip =
    hiddenCount > 0
      ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-100 border-slate-200 text-slate-600">+${toSafeText(String(hiddenCount))} lớp</span>`
      : "";

  return `${chips}${overflowChip}`;
};
