type DetailValue = string | number | boolean | null;

const toToken = (value: unknown): string => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }
  return "";
};

const toDetailValue = (value: unknown): DetailValue | undefined => {
  if (value === null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return undefined;
};

const normalizeDetails = (
  details: Record<string, unknown> | null | undefined,
): Record<string, DetailValue> => {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return {};
  }

  const normalized: Record<string, DetailValue> = {};
  Object.keys(details)
    .sort((left, right) => left.localeCompare(right))
    .forEach((key) => {
      const safeKey = toToken(key);
      if (!safeKey) return;

      const value = toDetailValue(details[key]);
      if (value === undefined) return;
      normalized[safeKey] = value;
    });

  return normalized;
};

export interface AccessDeniedEventInput {
  action: unknown;
  reason: unknown;
  resourceType: unknown;
  resourceId?: unknown;
  role?: unknown;
  userId?: unknown;
  details?: Record<string, unknown> | null;
  at?: number;
}

export interface AccessDeniedEvent {
  type: "access_denied";
  action: string;
  reason: string;
  resourceType: string;
  resourceId: string;
  role: string;
  userId: string;
  details: Record<string, DetailValue>;
  at: number;
  fingerprint: string;
}

export const createAccessDeniedEvent = (
  input: AccessDeniedEventInput,
): AccessDeniedEvent => {
  const action = toToken(input.action) || "unknown_action";
  const reason = toToken(input.reason) || "unspecified";
  const resourceType = toToken(input.resourceType) || "unknown_resource";
  const resourceId = toToken(input.resourceId) || "";
  const role = toToken(input.role) || "guest";
  const userId = toToken(input.userId) || "anonymous";
  const details = normalizeDetails(input.details);
  const at = Number.isFinite(input.at) ? Number(input.at) : Date.now();
  const fingerprint = [
    action,
    reason,
    resourceType,
    resourceId,
    role,
    userId,
    JSON.stringify(details),
  ].join("|");

  return {
    type: "access_denied",
    action,
    reason,
    resourceType,
    resourceId,
    role,
    userId,
    details,
    at,
    fingerprint,
  };
};

export const shouldDedupeAccessDeniedEvent = (
  previousEvent: AccessDeniedEvent | null | undefined,
  nextEvent: AccessDeniedEvent,
  dedupeWindowMs = 1200,
): boolean => {
  if (!previousEvent) return false;
  if (previousEvent.fingerprint !== nextEvent.fingerprint) return false;
  if (nextEvent.at < previousEvent.at) return false;
  return nextEvent.at - previousEvent.at <= Math.max(0, dedupeWindowMs);
};

export const appendAccessDeniedEvent = (
  events: AccessDeniedEvent[] | null | undefined,
  event: AccessDeniedEvent,
  maxEvents = 300,
): AccessDeniedEvent[] => {
  const next = Array.isArray(events) ? [...events, event] : [event];
  const cap = Math.max(1, Number(maxEvents) || 1);
  if (next.length <= cap) return next;
  return next.slice(next.length - cap);
};
