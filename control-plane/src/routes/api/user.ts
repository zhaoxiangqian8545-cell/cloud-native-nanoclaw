// ClawBot Cloud — User API Routes
// Returns authenticated user profile and usage information

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ensureUser, getUser, updateLastLogin, updateUserProvider } from '../../services/dynamo.js';
import { getAnthropicApiKey, putAnthropicApiKey } from '../../services/secrets.js';

const providerSchema = z.object({
  anthropicApiKey: z.string().min(1).max(500).optional(),
  anthropicBaseUrl: z.string().url().max(500).optional(),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', async (request) => {
    const user = await ensureUser(request.userId, request.userEmail);
    // Fire-and-forget: update lastLogin timestamp
    updateLastLogin(request.userId).catch(() => {});
    return {
      userId: user.userId,
      email: user.email,
      plan: user.plan,
      quota: user.quota,
      usage: {
        month: user.usageMonth,
        tokens: user.usageTokens,
        invocations: user.usageInvocations,
      },
      isAdmin: request.isAdmin,
    };
  });

  // GET /me/provider — check provider config status
  app.get('/me/provider', async (request) => {
    const [userData, apiKey] = await Promise.all([
      getUser(request.userId),
      getAnthropicApiKey(request.userId),
    ]);
    return {
      hasApiKey: apiKey !== null,
      anthropicBaseUrl: (userData as unknown as Record<string, unknown>)?.anthropicBaseUrl as string || null,
    };
  });

  // PUT /me/provider — save API key and/or base URL
  app.put('/me/provider', async (request) => {
    const body = providerSchema.parse(request.body);

    if (body.anthropicApiKey) {
      await putAnthropicApiKey(request.userId, body.anthropicApiKey);
    }
    if (body.anthropicBaseUrl !== undefined) {
      await updateUserProvider(request.userId, { anthropicBaseUrl: body.anthropicBaseUrl });
    }

    const apiKey = await getAnthropicApiKey(request.userId);
    return {
      hasApiKey: apiKey !== null,
      anthropicBaseUrl: body.anthropicBaseUrl || null,
    };
  });
};
