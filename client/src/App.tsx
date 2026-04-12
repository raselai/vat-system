import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CompanyList from './pages/companies/CompanyList';
import CompanyForm from './pages/companies/CompanyForm';
import ProductList from './pages/products/ProductList';
import ProductForm from './pages/products/ProductForm';
import CustomerList from './pages/customers/CustomerList';
import CustomerForm from './pages/customers/CustomerForm';
import InvoiceList from './pages/invoices/InvoiceList';
import InvoiceForm from './pages/invoices/InvoiceForm';
import CertificateList from './pages/vds/CertificateList';
import CertificateForm from './pages/vds/CertificateForm';
import DepositList from './pages/vds/DepositList';
import DepositForm from './pages/vds/DepositForm';
import SalesRegister from './pages/registers/SalesRegister';
import PurchaseRegister from './pages/registers/PurchaseRegister';
import ReturnList from './pages/returns/ReturnList';
import ReturnDetail from './pages/returns/ReturnDetail';
import AuditLogPage from './pages/audit/AuditLogPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <CompanyProvider>
                <AppLayout />
              </CompanyProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="companies" element={<CompanyList />} />
          <Route path="companies/new" element={<CompanyForm />} />
          <Route path="companies/:id/edit" element={<CompanyForm />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/new" element={<CustomerForm />} />
          <Route path="customers/:id/edit" element={<CustomerForm />} />
          <Route path="invoices" element={<InvoiceList />} />
          <Route path="invoices/new" element={<InvoiceForm />} />
          <Route path="invoices/:id" element={<InvoiceList />} />
          <Route path="vds/certificates" element={<CertificateList />} />
          <Route path="vds/certificates/new" element={<CertificateForm />} />
          <Route path="vds/deposits" element={<DepositList />} />
          <Route path="vds/deposits/new" element={<DepositForm />} />
          <Route path="registers/sales" element={<SalesRegister />} />
          <Route path="registers/purchase" element={<PurchaseRegister />} />
          <Route path="returns" element={<ReturnList />} />
          <Route path="returns/:id" element={<ReturnDetail />} />
          <Route path="audit-logs" element={<AuditLogPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
