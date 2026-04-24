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
      </Route>
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
