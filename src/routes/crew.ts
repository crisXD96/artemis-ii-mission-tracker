import { Router } from 'express';
import { CREW } from '../data/crew.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(CREW);
});

export default router;
