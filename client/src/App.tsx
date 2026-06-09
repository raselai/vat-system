import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import GetStarted from './pages/GetStarted';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import SetupWizard, { isWelcomeComplete } from './pages/onboarding/SetupWizard';
import CompanyList from './pages/companies/CompanyList';
import CompanyForm from './pages/companies/CompanyForm';
import ProductList from './pages/products/ProductList';
import ProductForm from './pages/products/ProductForm';
import CustomerList from './pages/customers/CustomerList';
import CustomerForm from './pages/customers/CustomerForm';
import InvoiceList from './pages/invoices/InvoiceList';
import InvoiceForm from './pages/invoices/InvoiceForm';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import CertificateList from './pages/vds/CertificateList';
import CertificateForm from './pages/vds/CertificateForm';
import DepositList from './pages/vds/DepositList';
import DepositForm from './pages/vds/DepositForm';
import SalesRegister from './pages/registers/SalesRegister';
import PurchaseRegister from './pages/registers/PurchaseRegister';
import ReturnList from './pages/returns/ReturnList';
import ReturnDetail from './pages/returns/ReturnDetail';
import AuditLogPage from './pages/audit/AuditLogPage';
import ImportExportPage from './pages/importExport/ImportExportPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import ArPage from './pages/accounts/ArPage';
import ApPage from './pages/accounts/ApPage';
import PaymentAccountList from './pages/accounts/PaymentAccountList';
import PaymentAccountForm from './pages/accounts/PaymentAccountForm';
import CashBookPage from './pages/accounts/CashBookPage';
import PartyLedgerPage from './pages/accounts/PartyLedgerPage';
import DeductionList from './pages/tds/DeductionList';
import DeductionForm from './pages/tds/DeductionForm';
import TdsPaymentList from './pages/tds/TdsPaymentList';
import TdsPaymentForm from './pages/tds/TdsPaymentForm';
import IncomeTaxCalculator from './pages/incomeTax/IncomeTaxCalculator';
import IncomeTaxHome from './pages/incomeTax/IncomeTaxHome';

// Authenticated shell: requires login + company context for all nested routes.
function AuthedShell() {
  return (
    <ProtectedRoute>
      <CompanyProvider>
        <Outlet />
      </CompanyProvider>
    </ProtectedRoute>
  );
}

// An income-tax-only user is one who chose "Income Tax payer" at signup and has
// not added a company. They skip company setup entirely and live in income-tax mode.
function useIncomeTaxMode() {
  const { user, companies } = useAuth();
  return user?.userType === 'income_tax' && companies.length === 0;
}

// First-run gate: a brand-new COMPANY user with no company is sent to the setup
// wizard. Income-tax-only users bypass it and render the app chrome directly.
function FirstRunGate() {
  const { companies } = useAuth();
  const incomeTaxMode = useIncomeTaxMode();
  if (!incomeTaxMode && companies.length === 0 && !isWelcomeComplete()) {
    return <Navigate to="/welcome" replace />;
  }
  return <AppLayout />;
}

// Guards company-scoped pages: an income-tax-only user (no company → activeCompany
// is null) is redirected to their home instead of crashing the VAT screens.
function CompanyOnly() {
  const incomeTaxMode = useIncomeTaxMode();
  if (incomeTaxMode) {
    return <Navigate to="/income-tax-home" replace />;
  }
  return <Outlet />;
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/get-started" element={<GetStarted />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated */}
          <Route element={<AuthedShell />}>
            {/* Full-screen onboarding (no sidebar) */}
            <Route path="/welcome" element={<SetupWizard />} />

            {/* Main app (with sidebar + first-run gate) */}
            <Route element={<FirstRunGate />}>
              {/* Available in both modes (income-tax pages + personal settings) */}
              <Route path="/income-tax" element={<IncomeTaxCalculator />} />
              <Route path="/income-tax-home" element={<IncomeTaxHome />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Company-scoped (VAT) — hidden from income-tax-only users */}
              <Route element={<CompanyOnly />}>
                <Route path="/home" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/companies" element={<CompanyList />} />
                <Route path="/companies/new" element={<CompanyForm />} />
                <Route path="/companies/:id/edit" element={<CompanyForm />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/products/new" element={<ProductForm />} />
                <Route path="/products/:id/edit" element={<ProductForm />} />
                <Route path="/customers" element={<CustomerList />} />
                <Route path="/customers/new" element={<CustomerForm />} />
                <Route path="/customers/:id/edit" element={<CustomerForm />} />
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/invoices/new" element={<InvoiceForm />} />
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/vds/certificates" element={<CertificateList />} />
                <Route path="/vds/certificates/new" element={<CertificateForm />} />
                <Route path="/vds/deposits" element={<DepositList />} />
                <Route path="/vds/deposits/new" element={<DepositForm />} />
                <Route path="/registers/sales" element={<SalesRegister />} />
                <Route path="/registers/purchase" element={<PurchaseRegister />} />
                <Route path="/returns" element={<ReturnList />} />
                <Route path="/returns/:id" element={<ReturnDetail />} />
                <Route path="/accounts/ar" element={<ArPage />} />
                <Route path="/accounts/ap" element={<ApPage />} />
                <Route path="/accounts/payment-accounts" element={<PaymentAccountList />} />
                <Route path="/accounts/payment-accounts/new" element={<PaymentAccountForm />} />
                <Route path="/accounts/payment-accounts/:id/edit" element={<PaymentAccountForm />} />
                <Route path="/accounts/cashbook" element={<CashBookPage />} />
                <Route path="/accounts/party-ledger" element={<PartyLedgerPage />} />
                <Route path="/tds/deductions" element={<DeductionList />} />
                <Route path="/tds/deductions/new" element={<DeductionForm />} />
                <Route path="/tds/payments" element={<TdsPaymentList />} />
                <Route path="/tds/payments/new" element={<TdsPaymentForm />} />
                <Route path="/audit-logs" element={<AuditLogPage />} />
                <Route path="/import-export" element={<ImportExportPage />} />
                <Route path="/reports" element={<ReportsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
