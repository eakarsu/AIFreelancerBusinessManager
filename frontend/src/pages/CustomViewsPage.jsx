import RevenuePerClientChart from '../components/RevenuePerClientChart';
import ProjectProfitabilityHeatmap from '../components/ProjectProfitabilityHeatmap';
import ClientInvoicePdf from '../components/ClientInvoicePdf';
import PricingRulesEditor from '../components/PricingRulesEditor';

export default function CustomViewsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Freelance Views</h1>
        <p className="text-gray-500 text-sm mt-1">
          Custom dashboards: revenue per client, project profitability heatmap, invoice PDF, and pricing rules.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenuePerClientChart />
        <ClientInvoicePdf />
      </div>

      <ProjectProfitabilityHeatmap />

      <PricingRulesEditor />
    </div>
  );
}
