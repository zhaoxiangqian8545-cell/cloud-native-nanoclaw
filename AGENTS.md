## Cursor Cloud specific instructions

### Overview

ClawBot Cloud is an NPM workspaces monorepo (5 packages). See `CLAUDE.md` for full command reference.

### Build order

`shared` must be built before `control-plane` and `agent-runtime` — always run `npm run build -w shared` first, or use `npm run build --workspaces` (npm respects workspace order in `package.json`).

### Running dev servers

- **control-plane**: `npm run dev -w control-plane` — Fastify on port 3000. Starts without AWS credentials; health endpoint at `GET /health` works immediately. SQS consumers and channel adapters that require AWS credentials will log warnings but don't block startup.
- **web-console**: `npm run dev -w web-console` — Vite on port 5173. Proxies `/api` and `/webhook` to `localhost:3000`. Works standalone for UI work; login/register requires Cognito (will show client-side errors without it).
- **agent-runtime**: `npm run dev -w agent-runtime` — Fastify on port 8080. Requires AWS infrastructure to function meaningfully.

### Tests

- **control-plane**: `npm test -w control-plane` (vitest). All AWS services are mocked. 4 tests in `dispatcher.test.ts` > "dispatch NO_REPLY handling" fail due to incomplete `secrets.js` mocking (pre-existing issue, not environment-related). 34/38 tests pass.
- **agent-runtime**: `npm test -w agent-runtime` (vitest). All 56 tests pass with full mocking — no AWS credentials needed.

### Typecheck

`npm run typecheck -w shared -w control-plane -w agent-runtime -w infra` — all packages pass.

### Key caveats

- This is a cloud-native project with no local emulation layer (no LocalStack, no DynamoDB Local, no docker-compose). Full runtime testing beyond unit tests requires deployed AWS infrastructure.
- The `.npmrc` has `install-links=true` for workspace symlinks.
- No ESLint or Prettier is configured in this repo.
- No git hooks (husky, pre-commit) are configured.
