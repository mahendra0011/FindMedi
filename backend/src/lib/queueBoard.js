// Bull Board dashboard (BullMQ visibility) — mount behind auth in index.js:
//   app.use('/admin/queues', protect, superadminOnly, await getBoardRouter())
// Returns null when queues are disabled (REDIS_URL unset) so the route
// simply 503s instead of crashing boot.

import logger from '../config/logger.js';
import { QUEUE_NAMES, getQueue } from './queues.js';

let router = null;

export async function getBoardRouter() {
  if (router) return router;
  if (!process.env.REDIS_URL) return null;
  try {
    const [{ createBullBoard }, { BullMQAdapter }, { ExpressAdapter }] = await Promise.all([
      import('@bull-board/api'),
      import('@bull-board/api/bullMQAdapter'),
      import('@bull-board/express'),
    ]);
    const adapters = [];
    for (const name of Object.values(QUEUE_NAMES)) {
      const q = await getQueue(name);
      if (q) adapters.push(new BullMQAdapter(q));
    }
    if (!adapters.length) return null;
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');
    createBullBoard({ queues: adapters, serverAdapter });
    router = serverAdapter.getRouter();
    return router;
  } catch (err) {
    logger.warn(`[queues] Bull Board unavailable: ${err.message}`);
    return null;
  }
}
