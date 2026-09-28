import express from 'express';
import { z } from 'zod';
import { getValhallaRoute } from '../lib/valhallaRouting.js';
import { validate } from '../utils/validate.js';
import { generalLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Coordinates arrive as [lng, lat] (GeoJSON order — the same order MapLibre and
// frontend/src/lib/navigation.ts both use), and arrive as strings when the
// caller serialises through query params.
const coordinateSchema = z.tuple([z.coerce.number(), z.coerce.number()]);

export const navigationRouteSchema = z.object({
  origin: coordinateSchema,
  destination: coordinateSchema,
  costing: z.enum(['auto', 'bicycle', 'pedestrian', 'motorcycle', 'emergency']).optional().default('auto'),
});

/**
 * POST /api/routing/navigation — turn-by-turn payload for the guided
 * navigation screen.
 *
 * This endpoint did not exist before: `getValhallaRoute()` was only reachable
 * in-process (emergency green-corridor emission), so the frontend had no way to
 * obtain maneuver data for a start→end trip — only the multi-stop TSP endpoint
 * exposed maneuvers, which is the wrong shape for navigation.
 *
 * Returns the Valhalla `shape` (precision-6 encoded polyline) rather than
 * decoded coordinates: decoding is already implemented and unit-tested once in
 * frontend/src/lib/navigation.ts, and doing it in two places invites drift.
 */
router.post('/navigation', generalLimiter, validate(navigationRouteSchema), async (req, res) => {
  try {
    const { origin, destination, costing } = req.body;
    const result = await getValhallaRoute(
      [origin[0], origin[1]],
      [destination[0], destination[1]],
      costing,
    );

    res.json({
      shape: result.shape,
      distanceKm: result.distanceKm,
      durationSeconds: result.durationSeconds,
      maneuvers: result.maneuvers || [],
      source: result.source,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
