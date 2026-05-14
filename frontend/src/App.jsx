import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import Contracts from './pages/Contracts';
import TimeTracking from './pages/TimeTracking';
import Expenses from './pages/Expenses';
import Proposals from './pages/Proposals';
import Tasks from './pages/Tasks';
import Communications from './pages/Communications';
import RevenueReports from './pages/RevenueReports';
import Goals from './pages/Goals';
import AICenter from './pages/AICenter';
import AIBusinessIntelligence from './pages/AIBusinessIntelligence';
import Backlog from './pages/Backlog'; // Apply pass 5

// === Batch 04 Gaps & Frontend Mounts ===
import CfAgenticProposalGenerationCraftingCus from './pages/CfAgenticProposalGenerationCraftingCus';
import CfRealTimeCashFlowForecastingSimulati from './pages/CfRealTimeCashFlowForecastingSimulati';
import CfSkillDemandMarketplaceIntegrationAgg from './pages/CfSkillDemandMarketplaceIntegrationAgg';
import CfMultiCurrencyInvoicingFxHedgingAdvi from './pages/CfMultiCurrencyInvoicingFxHedgingAdvi';
import CfPeerBenchmarkingNetworkWithPrivacyP from './pages/CfPeerBenchmarkingNetworkWithPrivacyP';
import CfAutomatedContractRiskScannerFlagging from './pages/CfAutomatedContractRiskScannerFlagging';
import GapNoProjectProfitabilityAnalysisEndpoi from './pages/GapNoProjectProfitabilityAnalysisEndpoi';
import GapNoRateOptimizationEndpointSuggesting from './pages/GapNoRateOptimizationEndpointSuggesting';
import GapNoClientChurnPrediction from './pages/GapNoClientChurnPrediction';
import GapNoSkillGapOrUpskillingRecommender from './pages/GapNoSkillGapOrUpskillingRecommender';
import GapNoContractRiskNlpScanner from './pages/GapNoContractRiskNlpScanner';
import GapLimitedFileUploadNoMulterobjectStor from './pages/GapLimitedFileUploadNoMulterobjectStor';
import GapNoClientFeedbackReviewSystem from './pages/GapNoClientFeedbackReviewSystem';
import GapNoNotificationEngineEmailsmsReminder from './pages/GapNoNotificationEngineEmailsmsReminder';
import GapNoPortfolioCaseStudyModule from './pages/GapNoPortfolioCaseStudyModule';
import GapNoSubscriptionplanManagementForTheF from './pages/GapNoSubscriptionplanManagementForTheF';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="clients" element={<Clients />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="time-tracking" element={<TimeTracking />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="proposals" element={<Proposals />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="communications" element={<Communications />} />
        <Route path="revenue-reports" element={<RevenueReports />} />
        <Route path="goals" element={<Goals />} />
        <Route path="ai-center" element={<AICenter />} />
        <Route path="ai-business-intelligence" element={<AIBusinessIntelligence />} />
        <Route path="backlog" element={<Backlog />} />{/* Apply pass 5 */}
      </Route>
    
          {/* // === Batch 04 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-proposal-generation-crafting-cus" element={<CfAgenticProposalGenerationCraftingCus />} />
          <Route path="/cf-real-time-cash-flow-forecasting-simulati" element={<CfRealTimeCashFlowForecastingSimulati />} />
          <Route path="/cf-skill-demand-marketplace-integration-agg" element={<CfSkillDemandMarketplaceIntegrationAgg />} />
          <Route path="/cf-multi-currency-invoicing-fx-hedging-advi" element={<CfMultiCurrencyInvoicingFxHedgingAdvi />} />
          <Route path="/cf-peer-benchmarking-network-with-privacy-p" element={<CfPeerBenchmarkingNetworkWithPrivacyP />} />
          <Route path="/cf-automated-contract-risk-scanner-flagging" element={<CfAutomatedContractRiskScannerFlagging />} />
          <Route path="/gap-no-project-profitability-analysis-endpoi" element={<GapNoProjectProfitabilityAnalysisEndpoi />} />
          <Route path="/gap-no-rate-optimization-endpoint-suggesting" element={<GapNoRateOptimizationEndpointSuggesting />} />
          <Route path="/gap-no-client-churn-prediction" element={<GapNoClientChurnPrediction />} />
          <Route path="/gap-no-skill-gap-or-upskilling-recommender" element={<GapNoSkillGapOrUpskillingRecommender />} />
          <Route path="/gap-no-contract-risk-nlp-scanner" element={<GapNoContractRiskNlpScanner />} />
          <Route path="/gap-limited-file-upload-no-multerobject-stor" element={<GapLimitedFileUploadNoMulterobjectStor />} />
          <Route path="/gap-no-client-feedback-review-system" element={<GapNoClientFeedbackReviewSystem />} />
          <Route path="/gap-no-notification-engine-emailsms-reminder" element={<GapNoNotificationEngineEmailsmsReminder />} />
          <Route path="/gap-no-portfolio-case-study-module" element={<GapNoPortfolioCaseStudyModule />} />
          <Route path="/gap-no-subscriptionplan-management-for-the-f" element={<GapNoSubscriptionplanManagementForTheF />} />
</Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
