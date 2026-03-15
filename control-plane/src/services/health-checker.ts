// ClawBot Cloud — Channel Health Check Loop
// Periodically verifies that channel credentials are still valid

import type { Logger } from 'pino';
import type { ChannelConfig, ChannelType } from '@clawbot/shared';
import { getChannelsNeedingHealthCheck, updateChannelHealth } from './dynamo.js';
import { getChannelCredentials } from './cached-lookups.js';
import { verifyChannelCredentials } from '../channels/index.js';

const HEALTH_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes
const INITIAL_DELAY_MS = 5 * 60 * 1000; // 5 minutes after startup
const MAX_FAILURES_BEFORE_ALERT = 3;

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

async function runHealthChecks(logger: Logger): Promise<void> {
  if (running) {
    logger.warn('Health check loop already running, skipping this cycle');
    return;
  }
  running = true;

  try {
    const channels = await getChannelsNeedingHealthCheck();
    logger.info({ channelCount: channels.length }, 'Starting channel health checks');

    for (const channel of channels) {
      await checkSingleChannel(channel, logger);
    }

    logger.info({ channelCount: channels.length }, 'Channel health checks completed');
  } catch (err) {
    logger.error({ err }, 'Unexpected error in health check loop');
  } finally {
    running = false;
  }
}

async function checkSingleChannel(
  channel: ChannelConfig,
  logger: Logger,
): Promise<void> {
  const channelKey = `${channel.channelType}#${channel.channelId}`;
  const childLogger = logger.child({
    botId: channel.botId,
    channelType: channel.channelType,
    channelId: channel.channelId,
  });

  try {
    const credentials = await getChannelCredentials(channel.credentialSecretArn);
    await verifyChannelCredentials(channel.channelType as ChannelType, credentials);

    // Credentials are valid — mark healthy and reset failures
    await updateChannelHealth(channel.botId, channelKey, 'healthy', 0);
    childLogger.debug('Channel health check passed');
  } catch (err) {
    const newFailures = (channel.consecutiveFailures ?? 0) + 1;
    const newStatus = newFailures >= MAX_FAILURES_BEFORE_ALERT ? 'unhealthy' : channel.healthStatus;

    await updateChannelHealth(channel.botId, channelKey, newStatus, newFailures);

    if (newFailures >= MAX_FAILURES_BEFORE_ALERT && channel.consecutiveFailures < MAX_FAILURES_BEFORE_ALERT) {
      childLogger.error(
        { err, consecutiveFailures: newFailures },
        'Channel credentials failed health check — threshold reached, channel marked unhealthy',
      );
    } else {
      childLogger.warn(
        { err, consecutiveFailures: newFailures },
        'Channel health check failed',
      );
    }
  }
}

export function startHealthCheckLoop(logger: Logger): void {
  logger.info(
    { initialDelayMs: INITIAL_DELAY_MS, intervalMs: HEALTH_CHECK_INTERVAL_MS },
    'Scheduling channel health check loop',
  );

  // First run after initial delay
  timer = setTimeout(() => {
    void runHealthChecks(logger);

    // Subsequent runs on interval
    timer = setInterval(() => {
      void runHealthChecks(logger);
    }, HEALTH_CHECK_INTERVAL_MS);
  }, INITIAL_DELAY_MS);
}

export function stopHealthCheckLoop(): void {
  if (timer !== null) {
    clearTimeout(timer);
    clearInterval(timer);
    timer = null;
  }
}
