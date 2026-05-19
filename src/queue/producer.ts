import { env } from '../config/env';

/**
 * Stand-in for a RabbitMQ (or any AMQP-flavoured) producer.
 *
 * Exposes a `publish(routingKey, payload)` call so domain code can fire
 * events at a "queue" without owning broker details. The stub just logs to
 * stdout in development; the call site, and therefore the arrow in the
 * architecture diagram, stays identical to what a real producer would look
 * like.
 *
 * Test mode silences the log to keep Jest output uncluttered — the call is
 * still issued, so anything that depends on it being invoked can still
 * assert via spies.
 */
export const queueProducer = {
  publish(routingKey: string, payload: unknown): void {
    if (env.NODE_ENV === 'test') return;
    console.log(`[queue] -> ${routingKey}`, payload);
  },
};
