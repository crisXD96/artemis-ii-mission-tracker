import { Router } from 'express';
import { generateTrajectory, getTrajectoryAtMET } from '../lib/trajectory.js';
import { formatMET } from '../lib/orbital-math.js';

const router = Router();
const trajectory = generateTrajectory(600);

// Simulated current MET (starts at 0, advances in real time at 1x)
let simStartTime = Date.now();
let simMET = 0;
let simSpeed = 1;

function getCurrentMET(): number {
  const elapsed = (Date.now() - simStartTime) / 1000;
  return Math.min(simMET + elapsed * simSpeed, trajectory[trajectory.length - 1].met);
}

router.get('/current', (_req, res) => {
  const met = getCurrentMET();
  const point = getTrajectoryAtMET(trajectory, met);
  res.json({
    ...point,
    metFormatted: formatMET(met),
  });
});

router.get('/:met', (req, res) => {
  const met = parseFloat(req.params.met);
  if (isNaN(met)) {
    res.status(400).json({ error: 'Invalid MET value' });
    return;
  }
  const point = getTrajectoryAtMET(trajectory, met);
  res.json({
    ...point,
    metFormatted: formatMET(met),
  });
});

export default router;
