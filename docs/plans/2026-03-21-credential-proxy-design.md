# Credential Proxy — Secure API Key Injection for Agent Runtime

**Date:** 2026-03-21
**Status:** Approved

## Problem

When agents execute in AgentCore microVMs, API keys (Anthropic, GitHub, Jira, etc.) are passed via environment variables. The agent can read these with `env`, `echo $ANTHROPIC_API_KEY`, or `cat /proc/self/environ`, exposing plaintext secrets.

## Solution

A lightweight **reverse proxy** running inside the microVM intercepts outbound API calls and injects credentials. The agent never sees the real keys.

## Architecture

```
Agent (Claude Code)
  │
  │  ANTHROPIC_BASE_URL=http://localhost:9090/anthropic
  │  ANTHROPIC_API_KEY=proxy-managed  (dummy)
  │
  ▼
Credential Proxy (localhost:9090)
  │  Match request path prefix → find ProxyRule
  │  Inject auth header (replace dummy with real key)
  │  Forward to target API
  ▼
External API (api.anthropic.com, api.github.com, etc.)
```

### Proxy Rules

```typescript
interface ProxyRule {
  /** Display name, e.g. "GitHub" */
  name: string;
  /** Path prefix on the proxy, e.g. "/github" */
  prefix: string;
  /** Target base URL to forward to */
  target: string;
  /** Auth type: bearer, api-key, basic */
  authType: 'bearer' | 'api-key' | 'basic';
  /** Header name (for api-key type), e.g. "x-api-key" */
  headerName?: string;
  /** Secret value — never exposed to agent */
  value: string;
}
```

Auth type mapping:
- `bearer` → `Authorization: Bearer <value>`
- `api-key` → `<headerName>: <value>` (e.g. `x-api-key: sk-ant-xxx`)
- `basic` → `Authorization: Basic <base64(value)>`

### Example Rules

| name | prefix | target | authType | headerName | value |
|------|--------|--------|----------|------------|-------|
| Anthropic | /anthropic | https://api.anthropic.com | api-key | x-api-key | sk-ant-xxx |
| GitHub | /github | https://api.github.com | bearer | — | ghp_xxx |
| Jira | /jira | https://myco.atlassian.net | basic | — | user:token |

## Implementation

### 1. Credential Proxy (`agent-runtime/src/credential-proxy.ts`)

- Node.js `http.createServer`, ~80 lines
- Matches `req.url` prefix against rules
- Strips prefix, forwards to `rule.target + remaining_path`
- Injects auth header based on `authType`
- Streams request/response (supports SSE for Anthropic streaming)
- Returns `{ start(rules, port), stop() }`

### 2. Agent Integration (`agent-runtime/src/agent.ts`)

Before agent query:
1. Build proxy rules from invocation payload
2. Start credential proxy on port 9090
3. Set `ANTHROPIC_BASE_URL=http://localhost:9090/anthropic`
4. Set `ANTHROPIC_API_KEY=proxy-managed` (dummy)
5. For other APIs, agent uses `http://localhost:9090/<prefix>/...`

After agent query:
6. Stop credential proxy

### 3. Control Plane Changes

**Dispatcher (`sqs/dispatcher.ts`):**
- Read proxy rules from Secrets Manager
- Include in invocation payload as `proxyRules`
- Stop sending `anthropicApiKey` directly (use proxy rule instead)

**API Routes (`routes/api/settings.ts`):**
- `GET /api/proxy-rules` — list rules (without secret values)
- `POST /api/proxy-rules` — create rule
- `PUT /api/proxy-rules/:id` — update rule
- `DELETE /api/proxy-rules/:id` — delete rule
- Rules stored in Secrets Manager: `nanoclawbot/{stage}/{userId}/proxy-rules`

### 4. Web Console (`pages/Settings.tsx`)

Add "API Credentials" tab alongside existing "Anthropic API" tab:
- Table listing configured rules (name, target domain, status)
- Add/Edit form with: Name, Target URL, Auth Type (dropdown), Secret, Path Prefix (auto-generated)
- Auth Type options: Bearer Token, API Key Header, Basic Auth

### 5. Types (`shared/src/types.ts`)

Add to `InvocationPayload`:
```typescript
proxyRules?: Array<{
  prefix: string;
  target: string;
  authType: 'bearer' | 'api-key' | 'basic';
  headerName?: string;
  value: string;
}>;
```

## Security Notes

- Proxy listens only on localhost — not accessible from outside the microVM
- API keys exist only in proxy process memory
- Agent env contains dummy values (`proxy-managed`)
- Proxy rules travel through invocation payload (AgentCore encrypted channel)
- TODO (future): iptables to force all outbound through proxy, preventing direct API calls that bypass credential injection

## Migration

Backward compatible:
- If `proxyRules` is present in payload, start proxy and use it
- If absent, fall back to existing `anthropicApiKey` env var behavior
- Existing Anthropic API key config migrates to a proxy rule automatically
