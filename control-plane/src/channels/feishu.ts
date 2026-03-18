// ClawBot Cloud — Feishu/Lark API Client
// Wraps Feishu Open API for sending messages and verifying credentials
// Uses native fetch (raw HTTP calls), following the same pattern as telegram.ts and slack.ts.
// Domain can be "feishu" (open.feishu.cn) or "lark" (open.larksuite.com).

// ── Helpers ─────────────────────────────────────────────────────────────────

export type FeishuDomain = 'feishu' | 'lark';

/**
 * Returns the API base URL for the given domain.
 * "feishu" → https://open.feishu.cn   (China)
 * "lark"   → https://open.larksuite.com (International)
 */
export function getFeishuApiBase(domain: FeishuDomain = 'feishu'): string {
  return domain === 'lark'
    ? 'https://open.larksuite.com'
    : 'https://open.feishu.cn';
}

/**
 * Obtains a tenant_access_token via the internal app auth endpoint.
 * POST /open-apis/auth/v3/tenant_access_token/internal/
 */
export async function getFeishuTenantToken(
  appId: string,
  appSecret: string,
  domain: FeishuDomain = 'feishu',
): Promise<string> {
  const base = getFeishuApiBase(domain);
  const url = `${base}/open-apis/auth/v3/tenant_access_token/internal/`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `Feishu tenant_access_token request failed: ${resp.status} ${resp.statusText} — ${body}`,
    );
  }

  const data = (await resp.json()) as {
    code: number;
    msg: string;
    tenant_access_token?: string;
  };
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(
      `Feishu tenant_access_token error: code=${data.code} msg=${data.msg}`,
    );
  }
  return data.tenant_access_token;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Send a plain text message via im.message.create.
 * https://open.feishu.cn/document/server-docs/im-v1/message/create
 */
export async function sendFeishuMessage(
  appId: string,
  appSecret: string,
  chatId: string,
  text: string,
  domain: FeishuDomain = 'feishu',
): Promise<void> {
  const token = await getFeishuTenantToken(appId, appSecret, domain);
  const base = getFeishuApiBase(domain);
  const url = `${base}/open-apis/im/v1/messages?receive_id_type=chat_id`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text }),
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `Feishu sendMessage failed: ${resp.status} ${resp.statusText} — ${body}`,
    );
  }

  const data = (await resp.json()) as { code: number; msg: string };
  if (data.code !== 0) {
    throw new Error(
      `Feishu sendMessage error: code=${data.code} msg=${data.msg}`,
    );
  }
}

/**
 * Send an Interactive Card (schema 2.0) with markdown body via im.message.create.
 * https://open.feishu.cn/document/server-docs/im-v1/message/create
 */
export async function sendFeishuCardMessage(
  appId: string,
  appSecret: string,
  chatId: string,
  cardContent: Record<string, unknown>,
  domain: FeishuDomain = 'feishu',
): Promise<void> {
  const token = await getFeishuTenantToken(appId, appSecret, domain);
  const base = getFeishuApiBase(domain);
  const url = `${base}/open-apis/im/v1/messages?receive_id_type=chat_id`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receive_id: chatId,
      msg_type: 'interactive',
      content: JSON.stringify(cardContent),
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `Feishu sendCardMessage failed: ${resp.status} ${resp.statusText} — ${body}`,
    );
  }

  const data = (await resp.json()) as { code: number; msg: string };
  if (data.code !== 0) {
    throw new Error(
      `Feishu sendCardMessage error: code=${data.code} msg=${data.msg}`,
    );
  }
}

/**
 * Reply to a specific message via im.message.reply.
 * https://open.feishu.cn/document/server-docs/im-v1/message/reply
 */
export async function replyFeishuMessage(
  appId: string,
  appSecret: string,
  messageId: string,
  text: string,
  domain: FeishuDomain = 'feishu',
): Promise<void> {
  const token = await getFeishuTenantToken(appId, appSecret, domain);
  const base = getFeishuApiBase(domain);
  const url = `${base}/open-apis/im/v1/messages/${messageId}/reply`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      msg_type: 'text',
      content: JSON.stringify({ text }),
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `Feishu replyMessage failed: ${resp.status} ${resp.statusText} — ${body}`,
    );
  }

  const data = (await resp.json()) as { code: number; msg: string };
  if (data.code !== 0) {
    throw new Error(
      `Feishu replyMessage error: code=${data.code} msg=${data.msg}`,
    );
  }
}

/**
 * Verify Feishu app credentials by calling GET /open-apis/bot/v3/info/.
 * Returns bot info on success.
 */
export async function verifyFeishuCredentials(
  appId: string,
  appSecret: string,
  domain: FeishuDomain = 'feishu',
): Promise<{ botOpenId: string; botName: string }> {
  const token = await getFeishuTenantToken(appId, appSecret, domain);
  const base = getFeishuApiBase(domain);
  const url = `${base}/open-apis/bot/v3/info/`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    throw new Error(
      `Feishu verifyCredentials failed: ${resp.status} ${resp.statusText}`,
    );
  }

  const data = (await resp.json()) as {
    code: number;
    msg: string;
    bot?: { open_id: string; app_name: string };
  };
  if (data.code !== 0 || !data.bot) {
    throw new Error(
      `Feishu verifyCredentials error: code=${data.code} msg=${data.msg}`,
    );
  }

  return {
    botOpenId: data.bot.open_id,
    botName: data.bot.app_name,
  };
}

/**
 * Download a message attachment (image, file, etc.) via im.message.resources.
 * GET /open-apis/im/v1/messages/:message_id/resources/:file_key?type=...
 * Returns the raw response body as an ArrayBuffer.
 */
export async function downloadFeishuResource(
  appId: string,
  appSecret: string,
  messageId: string,
  fileKey: string,
  domain: FeishuDomain = 'feishu',
): Promise<ArrayBuffer> {
  const token = await getFeishuTenantToken(appId, appSecret, domain);
  const base = getFeishuApiBase(domain);
  const url = `${base}/open-apis/im/v1/messages/${messageId}/resources/${fileKey}?type=file`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `Feishu downloadResource failed: ${resp.status} ${resp.statusText} — ${body}`,
    );
  }

  return resp.arrayBuffer();
}
