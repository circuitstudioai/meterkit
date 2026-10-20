import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "demo" });

export async function chat(userId: string, prompt: string) {
  if (!process.env.GEMINI_API_KEY) {
    return `(demo reply for ${userId}) You said: ${prompt}`;
  }
  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text ?? "";
}

export function exportPdf(title: string, body: string) {
  return `%PDF-1.1\n% ${title}\n${body}\n%%EOF\n`;
}
