# Public sandbox chat UI — local browser fixtures

Evidence: actual Chromium against the metered example's compiled production build. **All Auth, balance and job responses are HTTP fixtures.** No hosted identity, real database, PayPal, Gemini or payment acceptance is established. Screenshots include a visible fixture label.

- [Machine-readable grouped checks](results.json)
- [Desktop fixture](desktop-fixture.png)
- [390px mobile fixture](mobile-fixture.png)

Reproduce from repository root:

```sh
npm test -w @meterkit/example-chatbot-metered
npm run build -w @meterkit/example-chatbot-metered
METERKIT_PLAYWRIGHT_PATH=/absolute/path/to/existing/@playwright/test/index.mjs node scripts/verify-public-chat-ui.mjs
npx tsc --noEmit -p examples/chatbot-metered/tsconfig.json
npx eslint --config apps/dashboard/eslint.config.mjs examples/chatbot-metered/app examples/chatbot-metered/lib scripts/verify-public-chat-ui.mjs
```

Use an existing Playwright install and compatible Chromium; no package or paid resource is installed by this script. The script owns local port43129 and starts/stops two local Next servers with synthetic configuration. It first verifies disabled UI/API, then explicitly enables only its local fixture process. All Auth and alpha API requests in the enabled browser are intercepted; no live provider requests are permitted. Production/hosted environment settings remain unchanged. Fixture responses cannot establish exactly-once database settlement; that is covered separately by the existing kernel/service suite.
