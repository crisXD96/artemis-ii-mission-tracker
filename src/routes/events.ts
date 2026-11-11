import { Router } from 'express';
import { MISSION_EVENTS } from '../data/events.js';
import { formatMET } from '../lib/orbital-math.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(MISSION_EVENTS);
});

router.get('/upcoming', (req, res) => {
  const met = parseFloat(req.query.met as string) || 0;
  const upcoming = MISSION_EVENTS
    .filter(e => e.met >= met)
    .slice(0, 3);
  res.json(upcoming);
});

export default router;
