import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const repository = fileURLToPath(new URL('../../../', import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
export const publicChatAdapter = 'reference-next-public-chat-v1';
// Intentionally narrow: this is a reference installation, not a general Next transform.
export function publicChatOutputs(root, policy, read) {
  if (policy.credits !== 5 || policy.packs.length !== 1 ||
      JSON.stringify(policy.packs[0]) !== JSON.stringify({ id: 'sandbox-50', credits: 50, amountMinor: 100, currency: 'USD' }))
    throw new Error('Public reference requires the exact reviewed sandbox-50 policy: USD1 / 50 credits / 5 per chat.reply.');
  const pkg = JSON.parse(read(root, 'package.json'));
  if (pkg.dependencies?.next !== '16.4.2' || pkg.dependencies?.react !== '19.3.0' ||
      pkg.dependencies?.['react-dom'] !== '19.3.0' || pkg.dependencies?.postgres !== '^3.4.9' ||
      !pkg.scripts?.build || !pkg.devDependencies?.typescript)
    throw new Error('Unsupported public reference stack. Next16.4.2 / React19.3.0 / postgres^3.4.9 and TypeScript required; dependencies are never installed automatically.');
  const routeFiles = fs.readdirSync(path.join(root, 'app/api'), { recursive: true }).filter(file => /(?:^|\/)route\.[cm]?[jt]sx?$/.test(file)).sort();
  if (JSON.stringify(routeFiles) !== JSON.stringify(['chat/route.ts', 'export/route.ts']))
    throw new Error('Unknown public API routes. Manual review required; no partial retirement.');
  const source = relative => fs.readFileSync(path.join(repository, relative), 'utf8');
  const replaced = ['app/page.tsx', 'app/layout.tsx', 'app/api/chat/route.ts', 'app/api/export/route.ts'];
  const files = [];
  for (const relative of replaced) {
    const before = read(root, relative);
    if (before !== source(`examples/chatbot/${relative}`))
      throw new Error(`Unsupported public reference source: ${relative}. No guessed overwrite.`);
    let content = source(`examples/chatbot-metered/${relative}`);
    // Keep the reference standalone: no unpublished workspace packages.
    content = content.replace('import { BRAND } from "@meterkit/config";', 'import { BRAND } from "../lib/meterkit-brand";');
    files.push({ path: relative, before: digest(before), content });
  }
  const add = (relative, content) => files.push({ path: relative, before: null, content });
  add('lib/meterkit-billing/LICENSE', source('LICENSE'));
  add('lib/meterkit-brand.ts', source('packages/config/src/index.ts'));
  for (const relative of ['app/globals.css', 'app/sandbox-chat.tsx', 'lib/alpha-client.ts', 'lib/ui-config.ts'])
    add(relative, source(`examples/chatbot-metered/${relative}`));
  add('app/api/alpha/[...path]/route.ts', source('examples/chatbot-metered/app/api/alpha/[...path]/route.ts')
    .replaceAll('../../../../../../packages/billing/src/', '../../../../lib/meterkit-billing/'));
  for (const relative of ['index.ts', 'paypal.ts', 'service.ts', 'user-identity.ts', 'public-chat.ts', 'schema.sql'])
    add(`lib/meterkit-billing/${relative}`, source(`packages/billing/src/${relative}`));
  add('docs/METERKIT_PUBLIC_CHAT_INTEGRATION.md',
    '# Public reference installation — sandbox only\n\nGenerated from the exact MeterKit before-example. This is not a general Next.js installer. No environment or database is changed. API/UI remain disabled by default. Existing chat/export endpoints now return410. No checkout is installed.\n\nThe vendored billing source and additive schema are a reviewed snapshot; future upstream fixes need a new reviewed diff. Never run schema migration against Signal or customer data. Use only the existing approved isolated alpha database.\n\nRun npm run build. Run the original MeterKit fixed Postgres contracts independently; do not replace them with generated tests. Build success is not hosted Auth/payment/model acceptance. Auth two-user isolation, pending-job recovery, merchant/webhook configuration and separate sandbox buyer approval remain gates.\n\nReview docs/PUBLIC_CHAT_API.md and docs/SETUP.md in the source MeterKit checkout for explicit server-only configuration and acceptance commands. Do not enable any switch merely to demonstrate installation. No production payment activation or paid infrastructure.\n\nReviewed sandbox policy:\n```json\n' + JSON.stringify(policy, null, 2) + '\n```\n');
  return files;
}
