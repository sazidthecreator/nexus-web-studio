// Accessibility scan via axe-core, run against the live editor canvas DOM.
import axe from "axe-core";

export type A11yIssue = {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical";
  help: string;
  nodes: { target: string; html: string }[];
};

export async function scanA11y(root: HTMLElement | Document = document): Promise<A11yIssue[]> {
  const result = await axe.run(root, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    resultTypes: ["violations"],
  });
  return result.violations.map((v: any) => ({
    id: v.id,
    impact: (v.impact as A11yIssue["impact"]) || "moderate",
    help: v.help,
    nodes: v.nodes.slice(0, 5).map((n: any) => ({
      target: n.target.join(" "),
      html: n.html.slice(0, 200),
    })),
  }));
}
