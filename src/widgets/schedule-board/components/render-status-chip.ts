export interface RenderStatusChipOptions {
  label: string;
  className: string;
  toSafeText?: (value: unknown) => string;
  extraClassName?: string;
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

export const renderStatusChip = ({
  label,
  className,
  toSafeText = defaultSafeText,
  extraClassName = "",
}: RenderStatusChipOptions): string => {
  const safeLabel = toSafeText(label);
  const safeExtraClass = String(extraClassName || "").trim();
  const classes = [
    "text-[10px]",
    "font-bold",
    "px-2",
    "py-0.5",
    "rounded",
    "border",
    className,
    safeExtraClass,
  ]
    .filter(Boolean)
    .join(" ");

  return `<span class="${classes}">${safeLabel}</span>`;
};
