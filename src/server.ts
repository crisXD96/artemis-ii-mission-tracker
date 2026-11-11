import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import trajectoryRouter from './routes/trajectory.js';
import eventsRouter from './routes/events.js';
import telemetryRouter from './routes/telemetry.js';
import crewRouter from './routes/crew.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from /public
app.use(express.static(join(__dirname, '..', 'public')));

// API routes
app.use('/api/trajectory', trajectoryRouter);
app.use('/api/events', eventsRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/crew', crewRouter);

// Fallback: serve index.html
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Artemis II Mission Tracker running at http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/trajectory`);
  console.log(`   Launch Date: April 1, 2026\n`);
});

export default app;
