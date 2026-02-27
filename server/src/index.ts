import express from 'express';
import cors from 'cors';
import { exportPDFRoute } from './routes/export-pdf.js';
import { exportVideoRoute } from './routes/export-video.js';
import { importTrainingPlanRoute } from './routes/import-training-plan.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Export routes
app.use('/api/export', exportPDFRoute);
app.use('/api/export', exportVideoRoute);

// Import routes
app.use('/api/import', importTrainingPlanRoute);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
