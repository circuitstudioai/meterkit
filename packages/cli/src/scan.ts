import { Project, SyntaxKind } from "ts-morph";
import path from "node:path";

export type DetectedCall = {
  file: string;
  line: number;
  provider: "openai" | "gemini" | "anthropic" | "custom";
  snippet: string;
  featureKey: string;
};

const PROVIDERS: { needle: string; provider: DetectedCall["provider"]; featureKey: string }[] = [
  { needle: "openai", provider: "openai", featureKey: "openai.tokens" },
  { needle: "@google/genai", provider: "gemini", featureKey: "gemini.tokens" },
  { needle: "@anthropic-ai/sdk", provider: "anthropic", featureKey: "anthropic.tokens" },
];

export function scanRepo(root: string, extraFeatures: string[] = []): DetectedCall[] {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });
  project.addSourceFilesAtPaths([
    path.join(root, "**/*.{ts,tsx,js,jsx}"),
    "!" + path.join(root, "**/node_modules/**"),
    "!" + path.join(root, "**/.next/**"),
    "!" + path.join(root, "**/dist/**"),
  ]);

  const found: DetectedCall[] = [];

  for (const file of project.getSourceFiles()) {
    const text = file.getFullText();
    const rel = path.relative(root, file.getFilePath());
    for (const spec of PROVIDERS) {
      if (!text.includes(spec.needle)) {
        continue;
      }
      file.forEachDescendant((node) => {
        if (node.getKind() !== SyntaxKind.CallExpression) {
          return;
        }
        const call = node.asKindOrThrow(SyntaxKind.CallExpression);
        const expr = call.getExpression().getText();
        if (
          expr.includes("generateContent") ||
          expr.includes("completions.create") ||
          expr.includes("messages.create")
        ) {
          found.push({
            file: rel,
            line: call.getStartLineNumber(),
            provider: spec.provider,
            snippet: call.getText().slice(0, 140),
            featureKey: spec.featureKey,
          });
        }
      });
    }

    for (const feature of extraFeatures) {
      if (text.includes(feature)) {
        found.push({
          file: rel,
          line: 1,
          provider: "custom",
          snippet: feature,
          featureKey: feature,
        });
      }
    }
  }

  return dedupe(found);
}

function dedupe(calls: DetectedCall[]): DetectedCall[] {
  const seen = new Set<string>();
  return calls.filter((c) => {
    const key = `${c.file}:${c.line}:${c.featureKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
