// Property controls — declarative description of a block's editable props.
// The property panel auto-renders from this. Framer-style.

export type PropertyControl =
  | { type: "text"; key: string; label: string; placeholder?: string; multiline?: boolean }
  | { type: "richtext"; key: string; label: string }
  | {
      type: "number";
      key: string;
      label: string;
      min?: number;
      max?: number;
      step?: number;
      unit?: string;
    }
  | { type: "boolean"; key: string; label: string }
  | {
      type: "select";
      key: string;
      label: string;
      options: { value: string; label: string }[];
    }
  | { type: "color"; key: string; label: string }
  | { type: "image"; key: string; label: string; allowUnsplash?: boolean }
  | { type: "link"; key: string; label: string }
  | { type: "align"; key: string; label: string }
  | { type: "spacing"; key: string; label: string }
  | { type: "array"; key: string; label: string; item: PropertyControl[] }
  | { type: "group"; label: string; controls: PropertyControl[] }
  | { type: "divider" };

/** Walk a control tree to collect every (key, control) pair. */
export function flattenControls(
  controls: PropertyControl[],
): Array<{ key: string; control: PropertyControl }> {
  const out: Array<{ key: string; control: PropertyControl }> = [];
  const walk = (list: PropertyControl[]) => {
    for (const c of list) {
      if (c.type === "group") walk(c.controls);
      else if (c.type === "divider") continue;
      else if (c.type === "array") out.push({ key: c.key, control: c });
      else out.push({ key: c.key, control: c });
    }
  };
  walk(controls);
  return out;
}
