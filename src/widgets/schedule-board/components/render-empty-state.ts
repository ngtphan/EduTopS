export interface RenderEmptyStateOptions {
  icon: string;
  message: string;
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

export const renderEmptyState = ({
  icon,
  message,
  toSafeText = defaultSafeText,
}: RenderEmptyStateOptions): string => {
  const safeIcon = toSafeText(icon);
  const safeMessage = toSafeText(message);

  return `<div class="flex flex-col items-center justify-center h-full text-slate-400 py-20"><i data-lucide="${safeIcon}" class="w-16 h-16 mb-4 opacity-30"></i><p class="text-lg font-bold text-slate-600">${safeMessage}</p></div>`;
};
