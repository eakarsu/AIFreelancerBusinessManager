import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

import authRoutes from './routes/auth.js';
import clientsRoutes from './routes/clients.js';
import projectsRoutes from './routes/projects.js';
import invoicesRoutes from './routes/invoices.js';
import contractsRoutes from './routes/contracts.js';
import timeEntriesRoutes from './routes/timeEntries.js';
import expensesRoutes from './routes/expenses.js';
import proposalsRoutes from './routes/proposals.js';
import tasksRoutes from './routes/tasks.js';
import communicationsRoutes from './routes/communications.js';
import revenueReportsRoutes from './routes/revenueReports.js';
import goalsRoutes from './routes/goals.js';
import aiRoutes from './routes/ai.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/time-entries', timeEntriesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/proposals', proposalsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/communications', communicationsRoutes);
app.use('/api/revenue-reports', revenueReportsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/ai', aiRoutes);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
