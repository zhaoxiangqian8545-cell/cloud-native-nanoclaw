// Web Channel Adapter
// Internal websocket-backed channel used by the web console / embeddable widget.

import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { BaseChannelAdapter } from '../base.js';
import type { ReplyContext, ReplyOptions } from '@clawbot/shared/channel-adapter';
import { putMessage } from '../../services/dynamo.js';
import type { Message, Attachment } from '@clawbot/shared';

type WebEvent =
  | { type: 'connected'; sessionId: string }
  | { type: 'history'; messages: Message[] }
  | { type: 'message'; message: Message }
  | { type: 'error'; error: string }
  | { type: 'chunk'; messageId: string; text: string; done: boolean }
  | { type: 'suggestions'; messageId: string; suggestions: string[] };

interface WebSession {
  sessionId: string;
  botId: string;
  groupJid: string;
  userId: string;
  userName: string;
  socket: WebSocket;
}

const sessions = new Map<string, WebSession>();
const groupSessions = new Map<string, Set<string>>();

function groupKey(botId: string, groupJid: string): string {
  return `${botId}#${groupJid}`;
}

function sendEvent(socket: WebSocket, event: WebEvent): void {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(event));
}

export function registerWebSession(session: WebSession): void {
  sessions.set(session.sessionId, session);
  const key = groupKey(session.botId, session.groupJid);
  const current = groupSessions.get(key) ?? new Set<string>();
  current.add(session.sessionId);
  groupSessions.set(key, current);
}

export function unregisterWebSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  sessions.delete(sessionId);
  const key = groupKey(session.botId, session.groupJid);
  const current = groupSessions.get(key);
  if (!current) return;
  current.delete(sessionId);
  if (current.size === 0) {
    groupSessions.delete(key);
  }
}

export function sendSessionEvent(sessionId: string, event: WebEvent): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  sendEvent(session.socket, event);
}

export class WebChatAdapter extends BaseChannelAdapter {
  readonly channelType = 'web';

  constructor(parentLogger: import('pino').Logger) {
    super(parentLogger);
    this.init();
  }

  async start(): Promise<void> {
    this.logger.info('Web adapter started');
  }

  async stop(): Promise<void> {
    for (const session of sessions.values()) {
      try {
        session.socket.close();
      } catch {
        // Ignore cleanup failures during shutdown.
      }
    }
    sessions.clear();
    groupSessions.clear();
    this.logger.info('Web adapter stopped');
  }

  async sendReply(
    ctx: ReplyContext,
    text: string,
    opts?: ReplyOptions,
  ): Promise<void> {
    const now = new Date().toISOString();
    const message: Message = {
      botId: ctx.botId,
      groupJid: ctx.groupJid,
      timestamp: now,
      messageId: `web-bot-${randomUUID()}`,
      sender: 'bot',
      senderName: 'Bot',
      content: text,
      isFromMe: true,
      isBotMessage: true,
      channelType: 'web',
      ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 3600,
    };

    await putMessage(message);

    const event: WebEvent = { type: 'message', message };
    if (ctx.webSessionId) {
      sendSessionEvent(ctx.webSessionId, event);
    } else {
      const key = groupKey(ctx.botId, ctx.groupJid);
      for (const sessionId of groupSessions.get(key) ?? []) {
        sendSessionEvent(sessionId, event);
      }
    }

    this.logger.info(
      {
        botId: ctx.botId,
        groupJid: ctx.groupJid,
        webSessionId: ctx.webSessionId,
        messageId: message.messageId,
        ...(opts?.metadata ?? {}),
      },
      'Web reply sent',
    );
  }
}

// ---------------------------------------------------------------------------
// sendWebchatFileReply — Deliver a file to webchat without re-uploading to S3.
// The file is already in S3 (uploaded by the agent runtime). We just create
// a Message record with the attachment metadata and push it to the websocket.
// Called directly by the reply-consumer for web channel file_reply payloads.
// ---------------------------------------------------------------------------

export async function sendWebchatFileReply(
  ctx: ReplyContext,
  s3Key: string,
  fileName: string,
  mimeType: string,
  size?: number,
  caption?: string,
): Promise<void> {
  const attachType: Attachment['type'] =
    mimeType.startsWith('image/') ? 'image' :
    mimeType.startsWith('video/') ? 'video' :
    mimeType.startsWith('audio/') ? 'audio' : 'document';

  const message: Message = {
    botId: ctx.botId,
    groupJid: ctx.groupJid,
    timestamp: new Date().toISOString(),
    messageId: `web-bot-file-${randomUUID()}`,
    sender: 'bot',
    senderName: 'Bot',
    content: caption || '',
    isFromMe: true,
    isBotMessage: true,
    channelType: 'web',
    ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 3600,
    attachments: [{ type: attachType, s3Key, mimeType, fileName, size }],
  };

  await putMessage(message);

  const event: WebEvent = { type: 'message', message };
  if (ctx.webSessionId) {
    sendSessionEvent(ctx.webSessionId, event);
  } else {
    const key = groupKey(ctx.botId, ctx.groupJid);
    for (const sessionId of groupSessions.get(key) ?? []) {
      sendSessionEvent(sessionId, event);
    }
  }
}
