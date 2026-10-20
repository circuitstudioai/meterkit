import { GoogleGenAI } from "@google/genai";
import { withMeter } from "@meterkit/sdk";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "demo" });

export async function chat(userId: string, prompt: string) {
  const { result } = await withMeter(
    async () => {
      if (!process.env.GEMINI_API_KEY) {
        return `(demo reply for ${userId}) You said: ${prompt}`;
      }
      const response = await client.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt,
      });
      return response.text ?? "";
    },
    { featureKey: "chat.message", userId, units: 1 }
  );
  return result;
}

export async function exportPdf(userId: string, title: string, body: string) {
  const { result } = await withMeter(
    async () => `%PDF-1.1\n% ${title}\n${body}\n%%EOF\n`,
    { featureKey: "pdf.export", userId, units: 1 }
  );
  return result;
}
