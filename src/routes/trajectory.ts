import { Router } from 'express';
import { generateTrajectory } from '../lib/trajectory.js';

const router = Router();
let cachedTrajectory = generateTrajectory(600);

router.get('/', (_req, res) => {
  res.json(cachedTrajectory);
});

export default router;
