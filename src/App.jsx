import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Forms from './pages/Forms';
import FormDetail from './pages/FormDetail';
import Deadlines from './pages/Deadlines';
import NetSheets from './pages/NetSheets';
import Profile from './pages/Profile';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import OfferBuilder from './pages/OfferBuilder';
import Sign from './pages/Sign';
import Contacts from './pages/Contacts';
import CommissionReport from './pages/CommissionReport';
import Vendors from './pages/Vendors';
import MortgageRates from './pages/MortgageRates';
import HOA from './pages/HOA';
import OKCListings from './pages/OKCListings';
import Features from './pages/Features';
import ClientPortal from './pages/ClientPortal';
import NewUsers from './pages/NewUsers';
import OpenHouseOKReport from './pages/OpenHouseOKReport';
import AuditLog from './pages/AuditLog';
import GarageSale from './pages/GarageSale';
import CalendlyScheduling from './pages/CalendlyScheduling';
import OrderServices from './pages/OrderServices';
import VendorApprovals from './pages/VendorApprovals';
import BuyerBrokerInterview from './pages/BuyerBrokerInterview';
import FormBuilder from './pages/FormBuilder';
import PDFTemplates from './pages/PDFTemplates';
import BuyerBrokerAgreements from './pages/BuyerBrokerAgreements';
import VendorRegister from './pages/VendorRegister';
import BrokerageTable from './pages/BrokerageTable';
import AgentsByBrokerage from './pages/AgentsByBrokerage';
import BBSABuilder from './pages/BBSABuilder';
import BuyerBrokerCreator from './pages/BuyerBrokerCreator';
import AgentBBADefaults from './pages/AgentBBADefaults';
import ESignature from './pages/ESignature';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/Dashboard" replace />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Transactions" element={<Transactions />} />
        <Route path="/Forms" element={<Forms />} />
        <Route path="/FormDetail" element={<FormDetail />} />
        <Route path="/Deadlines" element={<Deadlines />} />
        <Route path="/NetSheets" element={<NetSheets />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/Tasks" element={<Tasks />} />
        <Route path="/Calendar" element={<Calendar />} />
        <Route path="/OfferBuilder" element={<OfferBuilder />} />
        <Route path="/Contacts" element={<Contacts />} />
        <Route path="/CommissionReport" element={<CommissionReport />} />
        <Route path="/Vendors" element={<Vendors />} />
        <Route path="/MortgageRates" element={<MortgageRates />} />
        <Route path="/HOA" element={<HOA />} />
        <Route path="/OKCListings" element={<OKCListings />} />
        <Route path="/Features" element={<Features />} />
        <Route path="/NewUsers" element={<NewUsers />} />
        <Route path="/OpenHouseOKReport" element={<OpenHouseOKReport />} />
        <Route path="/AuditLog" element={<AuditLog />} />
        <Route path="/GarageSale" element={<GarageSale />} />
        <Route path="/CalendlyScheduling" element={<CalendlyScheduling />} />
        <Route path="/OrderServices" element={<OrderServices />} />
        <Route path="/VendorApprovals" element={<VendorApprovals />} />
        <Route path="/BuyerBrokerInterview" element={<BuyerBrokerInterview />} />
        <Route path="/FormBuilder" element={<FormBuilder />} />
        <Route path="/PDFTemplates" element={<PDFTemplates />} />
        <Route path="/BuyerBrokerAgreements" element={<BuyerBrokerAgreements />} />
        <Route path="/BrokerageTable" element={<BrokerageTable />} />
        <Route path="/AgentsByBrokerage" element={<AgentsByBrokerage />} />
        <Route path="/BBSABuilder" element={<BBSABuilder />} />
        <Route path="/BuyerBrokerCreator" element={<BuyerBrokerCreator />} />
        <Route path="/AgentBBADefaults" element={<AgentBBADefaults />} />
        <Route path="/ESignature" element={<ESignature />} />
      </Route>
      <Route path="/Sign" element={<Sign />} />
      <Route path="/VendorRegister" element={<VendorRegister />} />
      <Route path="/ClientPortal" element={<ClientPortal />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App