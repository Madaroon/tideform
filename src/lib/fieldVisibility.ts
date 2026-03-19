export type FieldVisibilityOperator = "equals";

export type FieldVisibilityRule = {
  fieldId: string;
  operator: FieldVisibilityOperator;
  value: unknown;
};

type AnySettings = Record<string, unknown> | null | undefined;

const VISIBILITY_KEY = "visibility";

export function getFieldVisibilityRule(settings: AnySettings): FieldVisibilityRule | null {
  const visibility = settings?.[VISIBILITY_KEY];
  if (!visibility || typeof visibility !== "object") return null;

  const maybe = visibility as Partial<FieldVisibilityRule> & { operator?: unknown };
  if (typeof maybe.fieldId !== "string") return null;
  if (maybe.operator !== "equals") return null;

  // `value` is intentionally `unknown` so rules can match strings/numbers/booleans.
  return {
    fieldId: maybe.fieldId,
    operator: "equals",
    value: (maybe as FieldVisibilityRule).value,
  };
}

function toComparableString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function equalsCondition(actual: unknown, expected: unknown): boolean {
  if (actual === undefined || actual === null) return false;

  const exp = toComparableString(expected);

  if (Array.isArray(actual)) {
    return actual.some((a) => toComparableString(a) === exp);
  }

  return toComparableString(actual) === exp;
}

// `answers` matches the client-side `data` object structure: { [fieldId]: value }.
export function isFieldVisible(
  field: { settings?: Record<string, unknown> | null },
  answers: Record<string, unknown>
): boolean {
  const rule = getFieldVisibilityRule(field.settings);
  if (!rule) return true;

  if (rule.operator === "equals") {
    return equalsCondition(answers[rule.fieldId], rule.value);
  }

  return true;
}

export function getVisibleFields<T extends { id: string; settings?: Record<string, unknown> | null }>(
  fields: T[],
  answers: Record<string, unknown>
): T[] {
  return fields.filter((f) => isFieldVisible(f, answers));
}

