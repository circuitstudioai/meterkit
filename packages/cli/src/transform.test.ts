import { describe, expect, it } from "@jest/globals";
import { applyWrapHelpers } from "./transform";

const before = `import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function chat(userId: string, prompt: string) {
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text;
}
`;

describe("CLI transform snapshots", () => {
  it("wraps a Gemini generateContent call with withMeter", () => {
    const after = applyWrapHelpers(before, "gemini.tokens");
    expect(after).toContain('from "@meterkit/sdk"');
    expect(after).toContain("withMeter");
    expect(after).toContain("gemini.tokens");
    expect(after).toMatchSnapshot();
  });

  it("is idempotent if already wrapped", () => {
    const once = applyWrapHelpers(before, "gemini.tokens");
    const twice = applyWrapHelpers(once, "gemini.tokens");
    expect(twice).toBe(once);
  });
});
