
import customViewsRoute from '../routes/customViews.js';
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
// Apply pass 5 backlog: vendors (PRODUCT-DECISION), payments (NEEDS-CREDS),
// fxRates (NEEDS-CREDS), marketingPipeline (PRODUCT-DECISION)
import vendorsRoutes from './routes/vendors.js';
import paymentsRoutes from './routes/payments.js';
import fxRatesRoutes from './routes/fxRates.js';
import marketingPipelineRoutes from './routes/marketingPipeline.js';
import scopeCreepMarginGuardRoutes from './routes/scopeCreepMarginGuard.js';
import governedBusinessRoutes from './routes/governedBusiness.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
}

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
app.use('/api/vendors', vendorsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/fx-rates', fxRatesRoutes);
app.use('/api/marketing', marketingPipelineRoutes);
app.use('/api/scope-creep-margin-guard', scopeCreepMarginGuardRoutes);
import('./routes/skillDemandMarketplace.js').then(m => app.use('/api/skill-demand', m.default));
import('./routes/fxHedgingAdvisor.js').then(m => app.use('/api/fx-hedging', m.default));
app.use('/api/business-workflow', governedBusinessRoutes);

// Custom freelance views — mounted BEFORE the 404 handler so all 4 endpoints respond
app.use('/api/custom-views', customViewsRoute);

// 404 handler for unknown /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
