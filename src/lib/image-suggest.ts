// AI-powered Unsplash query suggestion based on block context.
// Uses the existing Lovable AI Gateway via the project's `invokeLLM` helper.

import { callAi } from "./ai-gateway";

export async function suggestImageQuery(
  blockType: string,
  blockProps: Record<string, unknown>,
): Promise<string> {
  const contextText = Object.values(blockProps)
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .slice(0, 200);

  const prompt = `Given a website block of type "${blockType}" with this content:
"${contextText}"
Suggest a single Unsplash search query (3-5 words) for a fitting background/feature image.
Respond with ONLY the query, nothing else.`;

  try {
    const response = await callAi<{ text?: string } | string>({
      task: "generate_copy",
      payload: { prompt, max_tokens: 20 },
    });
    const text =
      typeof response.result === "string"
        ? response.result
        : (response.result as { text?: string })?.text || "";
    return String(text)
      .trim()
      .toLowerCase()
      .replace(/^["']|["']$/g, "")
      .slice(0, 80);
  } catch {
    return blockType.replace(/[-_]/g, " ");
  }
}
