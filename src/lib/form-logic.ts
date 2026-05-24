// Conditional logic engine for form blocks.
// Returns the set of visible field IDs given current values.

export type ConditionalOperator = "equals" | "not_equals" | "contains";

export type FormField = {
  id: string;
  type:
    | "text"
    | "email"
    | "phone"
    | "select"
    | "radio"
    | "checkbox"
    | "textarea"
    | "file"
    | "date"
    | "rating"
    | "signature";
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    customMessage?: string;
  };
  conditionalLogic?: {
    showIf: { fieldId: string; operator: ConditionalOperator; value: string };
  };
};

export function evaluateConditionalLogic(
  fields: FormField[],
  values: Record<string, unknown>,
): Set<string> {
  const visible = new Set<string>();
  for (const field of fields) {
    if (!field.conditionalLogic) {
      visible.add(field.id);
      continue;
    }
    const { fieldId, operator, value } = field.conditionalLogic.showIf;
    const current = values[fieldId];
    let show = false;
    switch (operator) {
      case "equals":
        show = current === value;
        break;
      case "not_equals":
        show = current !== value;
        break;
      case "contains":
        show = String(current ?? "").includes(value);
        break;
    }
    if (show) visible.add(field.id);
  }
  return visible;
}

export function validateField(
  field: FormField,
  value: unknown,
): string | null {
  if (field.required && (value === undefined || value === null || value === ""))
    return "This field is required";
  if (typeof value !== "string") return null;
  const v = field.validation;
  if (!v) return null;
  if (v.pattern) {
    try {
      const re = new RegExp(v.pattern);
      if (!re.test(value)) return v.customMessage || "Invalid format";
    } catch {
      /* ignore bad regex */
    }
  }
  if (v.minLength && value.length < v.minLength)
    return `Minimum ${v.minLength} characters`;
  if (v.maxLength && value.length > v.maxLength)
    return `Maximum ${v.maxLength} characters`;
  return null;
}
