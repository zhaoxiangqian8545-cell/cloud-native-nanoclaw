# Model Provider Configuration

## Goal

Allow per-bot model provider selection: Bedrock (default) or direct Anthropic API. Extends the existing model selection feature (2026-03-17) with provider-level control.

## Decisions

- **Scope:** Per-bot provider selection
- **API key storage:** Per-user, in Secrets Manager
- **Base URL:** Per-user, in DynamoDB User record
- **Model IDs:** Stored as-is per provider format — SDK handles resolution

## Data Model

**shared/src/types.ts:**
```typescript
export type ModelProvider = 'bedrock' | 'anthropic-api';

// Bot — add field
modelProvider?: ModelProvider;  // default: 'bedrock'

// InvocationPayload — add fields
modelProvider?: ModelProvider;
anthropicApiKey?: string;   // resolved from Secrets Manager at invocation time
anthropicBaseUrl?: string;  // from User DynamoDB record
```

**User DynamoDB record** — add `anthropicBaseUrl?: string` field. No migration needed (schemaless).

**Secrets Manager** — new secret: `nanoclawbot/{stage}/{userId}/anthropic-api-key`

## Preset Models by Provider

| Label | Bedrock ID | Anthropic API ID |
|-------|-----------|-----------------|
| Claude Haiku 4.5 | `global.anthropic.claude-haiku-4-5-20251001-v1:0` | `claude-haiku-4-5-20251001` |
| Claude Sonnet 4.6 | `global.anthropic.claude-sonnet-4-6` | `claude-sonnet-4-6` |
| Claude Opus 4.6 | `global.anthropic.claude-opus-4-6-v1` | `claude-opus-4-6` |
| Custom | User-entered | User-entered |

## API Changes

### New endpoints

```
PUT  /api/users/me/provider   — save API key + base URL
GET  /api/users/me/provider   — get base URL + hasApiKey (never return the key)
```

**PUT body:**
```typescript
{ anthropicApiKey?: string, anthropicBaseUrl?: string }
```

**GET response:**
```typescript
{ hasApiKey: boolean, anthropicBaseUrl?: string }
```

### Existing endpoint updates

**PUT /api/bots/:botId** — allow `modelProvider` in request body. Validate: if `modelProvider === 'anthropic-api'`, user must have an API key in Secrets Manager (return 400 otherwise).

**POST /api/bots** — allow `modelProvider` in request body (same validation).

## Data Flow

```
User Settings (web console) → PUT /api/users/me/provider → Secrets Manager (key) + DynamoDB (baseUrl)

Bot Config (web console) → PUT /api/bots/:botId { modelProvider, model } → DynamoDB Bot record
                                                                                ↓
Agent Runtime ← InvocationPayload { modelProvider, anthropicApiKey, anthropicBaseUrl }
      ↓                          ← Dispatcher resolves key + baseUrl when modelProvider='anthropic-api'
sdkEnv = {
  CLAUDE_CODE_USE_BEDROCK: modelProvider === 'anthropic-api' ? '0' : '1',
  ANTHROPIC_API_KEY: ...,      // only if anthropic-api
  ANTHROPIC_BASE_URL: ...,     // only if anthropic-api + configured
}
      ↓
query({ options: { env: sdkEnv, model: payload.model } })
```

## Security

- API key in Secrets Manager, encrypted at rest (KMS)
- Key fetched by control-plane at invocation time, passed inside AgentCore payload (encrypted in transit)
- Key set in `sdkEnv` only — scoped to SDK subprocess, NOT in MCP server env
- Agent tools cannot access the API key
- GET endpoint never returns the actual key, only `hasApiKey: boolean`

## Changes

| Package | File | Change |
|---------|------|--------|
| **shared** | `src/types.ts` | Add `ModelProvider` type, `modelProvider` to Bot + InvocationPayload, `anthropicApiKey` + `anthropicBaseUrl` to InvocationPayload |
| **control-plane** | `src/routes/api/bots.ts` | Add `modelProvider` to create/update Zod schemas, validate API key exists |
| **control-plane** | `src/routes/api/users.ts` (new route file) | `PUT/GET /api/users/me/provider` endpoints |
| **control-plane** | `src/services/dynamo.ts` | Add `modelProvider` to bot allowedFields, add `anthropicBaseUrl` to user update |
| **control-plane** | `src/services/secrets.ts` (new) | Helpers for Secrets Manager get/put of Anthropic API key |
| **control-plane** | `src/sqs/dispatcher.ts` | When `bot.modelProvider === 'anthropic-api'`, fetch key + baseUrl, add to payload |
| **agent-runtime** | `src/agent.ts` | Conditional `sdkEnv` — set `CLAUDE_CODE_USE_BEDROCK`, `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` based on `payload.modelProvider` |
| **web-console** | `src/pages/Settings.tsx` (new) | Provider config UI: API key input, base URL input |
| **web-console** | `src/pages/BotDetail.tsx` | Add provider dropdown, switch model presets by provider |
| **web-console** | `src/lib/api.ts` | Add provider API calls, `modelProvider` to bot types |
| **infra** | `lib/control-plane-stack.ts` | Ensure Secrets Manager IAM covers `nanoclawbot/{stage}/*/anthropic-api-key` path |

## Not changing

- `agent-runtime/Dockerfile` — keep `ENV CLAUDE_CODE_USE_BEDROCK=1` as default
- `scripts/deploy.sh` — no changes needed
- `infra/lib/agent-stack.ts` — AgentCore runtime env vars unchanged
- No new DynamoDB tables or stacks
