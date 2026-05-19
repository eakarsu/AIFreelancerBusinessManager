
// === Batch 04 Gaps & Frontend Mounts ===
import route_gap_no_project_profitability_analysis_endpoi from '../routes/gap-no-project-profitability-analysis-endpoi.js';
import route_gap_no_rate_optimization_endpoint_suggesting from '../routes/gap-no-rate-optimization-endpoint-suggesting.js';
import route_gap_no_client_churn_prediction from '../routes/gap-no-client-churn-prediction.js';
import route_gap_no_skill_gap_or_upskilling_recommender from '../routes/gap-no-skill-gap-or-upskilling-recommender.js';
import route_gap_no_contract_risk_nlp_scanner from '../routes/gap-no-contract-risk-nlp-scanner.js';
import route_gap_limited_file_upload_no_multerobject_stor from '../routes/gap-limited-file-upload-no-multerobject-stor.js';
import route_gap_no_client_feedback_review_system from '../routes/gap-no-client-feedback-review-system.js';
import route_gap_no_notification_engine_emailsms_reminder from '../routes/gap-no-notification-engine-emailsms-reminder.js';
import route_gap_no_portfolio_case_study_module from '../routes/gap-no-portfolio-case-study-module.js';
import route_gap_no_subscriptionplan_management_for_the_f from '../routes/gap-no-subscriptionplan-management-for-the-f.js';
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
import('./routes/skillDemandMarketplace.js').then(m => app.use('/api/skill-demand', m.default));
import('./routes/fxHedgingAdvisor.js').then(m => app.use('/api/fx-hedging', m.default));


app.use('/api/gap-no-project-profitability-analysis-endpoi', route_gap_no_project_profitability_analysis_endpoi);
app.use('/api/gap-no-rate-optimization-endpoint-suggesting', route_gap_no_rate_optimization_endpoint_suggesting);
app.use('/api/gap-no-client-churn-prediction', route_gap_no_client_churn_prediction);
app.use('/api/gap-no-skill-gap-or-upskilling-recommender', route_gap_no_skill_gap_or_upskilling_recommender);
app.use('/api/gap-no-contract-risk-nlp-scanner', route_gap_no_contract_risk_nlp_scanner);
app.use('/api/gap-limited-file-upload-no-multerobject-stor', route_gap_limited_file_upload_no_multerobject_stor);
app.use('/api/gap-no-client-feedback-review-system', route_gap_no_client_feedback_review_system);
app.use('/api/gap-no-notification-engine-emailsms-reminder', route_gap_no_notification_engine_emailsms_reminder);
app.use('/api/gap-no-portfolio-case-study-module', route_gap_no_portfolio_case_study_module);
app.use('/api/gap-no-subscriptionplan-management-for-the-f', route_gap_no_subscriptionplan_management_for_the_f);

// Custom freelance views — mounted BEFORE the 404 handler so all 4 endpoints respond
app.use('/api/custom-views', customViewsRoute);

// 404 handler for unknown /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
