import { Project, QuoteKind } from "ts-morph";
import path from "node:path";
import { BRAND } from "@meterkit/config";
import type { DetectedCall } from "./scan";

export type FileChange = { file: string; before: string; after: string };

export function planTransforms(root: string, calls: DetectedCall[]): FileChange[] {
  const byFile = new Map<string, DetectedCall[]>();
  for (const call of calls) {
    const list = byFile.get(call.file) ?? [];
    list.push(call);
    byFile.set(call.file, list);
  }

  const changes: FileChange[] = [];
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    manipulationSettings: { quoteKind: QuoteKind.Double },
  });

  for (const [rel, fileCalls] of byFile) {
    const abs = path.join(root, rel);
    const source = project.addSourceFileAtPath(abs);
    const before = source.getFullText();

    const hasImport = source.getImportDeclarations().some((d) => d.getModuleSpecifierValue() === BRAND.npmSdk);
    if (!hasImport) {
      source.addImportDeclaration({
        moduleSpecifier: BRAND.npmSdk,
        namedImports: ["withMeter"],
      });
    }

    for (const call of fileCalls) {
      if (call.provider === "custom") {
        continue;
      }
      const text = source.getFullText();
      if (text.includes("withMeter(") && text.includes(call.featureKey)) {
        continue;
      }
    }

    source.formatText();
    const after = source.getFullText();
    if (after !== before) {
      changes.push({ file: rel, before, after });
    }
  }

  changes.push(bootstrapFile(root));
  changes.push(envExample());
  return changes;
}

function bootstrapFile(root: string): FileChange {
  const file = "lib/meterkit.ts";
  const after = `import { createMeterKit, setDefaultMeterKit } from "${BRAND.npmSdk}";

export const kit = createMeterKit({
  mode: process.env.METERKIT_API_URL ? "api" : "self-hosted",
  apiUrl: process.env.METERKIT_API_URL,
  prices: [
    { featureKey: "chat.message", name: "Chat message", creditsPerUnit: 5, unitLabel: "message" },
    { featureKey: "pdf.export", name: "Export PDF", creditsPerUnit: 25, unitLabel: "export" },
    { featureKey: "gemini.tokens", name: "Gemini tokens", creditsPerUnit: 0.01, unitLabel: "token" },
  ],
});

setDefaultMeterKit(kit);
`;
  return { file, before: "", after };
}

function envExample(): FileChange {
  return {
    file: ".env.example",
    before: "",
    after: `# ${BRAND.name}
METERKIT_API_URL=http://localhost:43123
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
GEMINI_API_KEY=
`,
  };
}

export function applyWrapHelpers(sourceText: string, featureKey: string): string {
  if (sourceText.includes("withMeter(")) {
    return sourceText;
  }
  let next = sourceText;
  if (!next.includes(`from "${BRAND.npmSdk}"`)) {
    next = `import { withMeter } from "${BRAND.npmSdk}";\n` + next;
  }
  next = next.replace(
    /const\s+(\w+)\s*=\s*await\s+(client\.models\.generateContent\([^;]+\)|openai\.chat\.completions\.create\([^;]+\));/g,
    `const $1 = (await withMeter(async () => $2, { featureKey: "${featureKey}", userId, units: 1 })).result;`
  );
  return next;
}
