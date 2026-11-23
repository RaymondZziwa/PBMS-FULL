import { Routes, Route, Navigate } from 'react-router-dom';
import LayoutSkeleton from './layout/skeleton';
import SalesDashboard from './pages/dashboard/dashboard';
import NonAdminDashboard from './pages/dashboard/nonAdminDashboard';
import { roleHasPermission } from './layout/navigation';
import CompanyProfile from './pages/settings/company-profile';
import BranchesManagement from './pages/settings/branch/branchManagement';
import RoleManagement from './pages/settings/roles/roleManagement';
import EventTable from './pages/events/events';
import LoginComponent from './pages/auth/login';
import ForgotPassword from './pages/auth/forgotPassword';
import EmployeeProfile from './endpoints/settings/accountSettings';
import ParticipantsManagement from './pages/events/viewEventParticipants';
import DepartmentManagement from './pages/humanResource/departments';
import EmployeeManagement from './pages/humanResource/employees';
import ReportsComponent from './pages/reports';
import ItemCategoriesManagement from './pages/inventory/categories';
import StoresManagement from './pages/inventory/stores';
import ServicesManagement from './pages/inventory/services';
import ItemsManagement from './pages/inventory/items';
import StockMovementRecords from './pages/inventory/stockMovement';
import ClientsManagement from './pages/sales/customers';
import PointOfSale from './pages/sales/pos';
import ProjectsManagement from './pages/projects';
import ProjectSales from './pages/projects/sales';
import SalePayments from './pages/projects/payments';
import ExhibitionManagement from './pages/exhibition/exhibitions';
import ExhibitionExpensesManagement from './pages/exhibition/exhibitionExpenses';
import ExpoStockMovementRecords from './pages/exhibition/inventory';
import ExhibitionPOS from './pages/exhibition/exhibitionPos';
import BranchExpensesManagement from './pages/expenses';
import CreditSalesManagement from './pages/sales/creditSales';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import type { RootState } from './redux/store';
import { apiRequest } from './libs/apiConfig';
import { fetchDataSuccess, fetchDataFailure } from "./redux/slices/auth/userAuthSlice";
import type { IUserAuth } from './redux/types/userAuth';
import StockLevelAnalysisReport from './pages/reports/inventoryReports/stockLevelAnalysis';
import StockMovementAnalysisReport from './pages/reports/inventoryReports/stockLevelMovementAnalysis';
import ExhibitionRevenueComparisonReport from './pages/reports/exhibition/exhibitionRevenueComparisonReport';
import ExhibitionSalesSummaryReport from './pages/reports/exhibition/exhibitionSalesSummary';
import ExhibitionExpensesSummaryReport from './pages/reports/exhibition/exhibitionExpenseSummary';
import DailySalesSummaryReport from './pages/reports/sales/dailySalesSummary';
import PeriodSalesSummaryReport from './pages/reports/sales/periodSalesSummary';
import StoreSalesComparisonReport from './pages/reports/sales/storeSalesComparison';
import ProductPerformanceReport from './pages/reports/sales/productPerformanceReport';
import ServicePointOfSale from './pages/sales/massageServicePos';
import MassageServiceSalesReport from './pages/reports/sales/massageServiceSales';
import AttendanceManagement from './pages/humanResource/attendance';
import PayrollManagement from './pages/humanResource/payroll/index';
import ClientPurchases from './pages/sales/customers/customerPurchases';
import DeliveryNotes from './pages/inventory/deliveryNotes';
import ExpensesReport from './pages/reports/expenses/expensesReport';
import SuppliersManagement from './pages/inventory/suppliers';
import SupplierDetails from './pages/inventory/suppliers/supplierInfo';
import SuppliersReport from './pages/reports/inventoryReports/supplierAnalysis';
import ClientPrescriptionsManagement from './pages/prescriptionDB';
import SeedlingStagesManagement from './pages/farm/stages';
import SeedlingBatchesManagement from './pages/farm/batches';
import ManufacturingManagement from './pages/manufacturing';
import ArchiveSalesRecords from './pages/archives/sales';
import ArchiveExpenseRecords from './pages/archives/expenses';
import ChannelTable from './pages/finance/channels';
import WalletTable from './pages/finance/wallets';
import TransactionsTable from './pages/finance/transactions';
import BillingChannelsManagement from './pages/settings/billingChannels';
import ClientAccountsManagement from './pages/sales/customerAccounts';
import NotFound from './pages/notFound';
import LoyaltyClub from './pages/loyalty';
import ClubMembers from './pages/loyalty/members';
import ClubMemberDetail from './pages/loyalty/memberDetail';
import ClubTracker from './pages/loyalty/tracker';
import ClubWallet from './pages/loyalty/wallet';
import ClubOrders from './pages/loyalty/orders';
import ClubSettings from './pages/loyalty/settings';
import RunPayroll from './pages/humanResource/payroll/RunPayroll';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

 const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { data } = useSelector((state: RootState) => state.userAuth);
  const dispatch = useDispatch();

  useEffect(() => {
    const verifyAuth = async () => {
      // If we have user data, verify it's still valid
      if (data?.id) {
        try {
          await apiRequest('/api/auth/verify', 'GET');
          // Session is valid
        } catch {
          // Session expired, clear data
          dispatch(fetchDataFailure('Session expired'));
        }
      } 
      // If no user data but might have cookies
      else {
        try {
          const response = await apiRequest<{ data: IUserAuth }>('/api/auth/me', 'GET');
          dispatch(fetchDataSuccess(response.data));
        } catch {
          // Not authenticated
          dispatch(fetchDataFailure('Not authenticated'));
        }
      }
      setCheckingAuth(false);
    };

    verifyAuth();
  }, [dispatch, data]);

  if (checkingAuth) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center bg-canvas font-inter">
        <span aria-hidden="true" className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-brand border-r-transparent" />
        <span className="text-sm text-brand-muted">Checking your session…</span>
      </div>
    );
  }

  const isAuthenticated = !!(
    data?.id && 
    data?.hasAccess &&
    data?.isActive
  );

  return isAuthenticated ? (
    <LayoutSkeleton>
      {children}
    </LayoutSkeleton>
  ) : (
    <Navigate to="/" replace />
  );
};

// Public Route Component (for login page)
interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const isAuthenticated = () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  };

  return !isAuthenticated() ? (
    <>{children}</>
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

// Company-wide figures (revenue, credit, expenses) need the reports permission,
// the same rule the backend applies to /api/dashboard/metrics.
const RoleBasedDashboard: React.FC = () => {
  const role = useSelector((state: RootState) => state.userAuth.data.role);
  const showManagement = roleHasPermission(role, "access_reports_module");

  return showManagement ? <SalesDashboard /> : <NonAdminDashboard />;
};

function App() {
  return (
    <Routes>
      {/* Public Routes - Only accessible when not logged in */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <LoginComponent />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />

      {/* Protected Routes - Only accessible when logged in */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleBasedDashboard />
          </ProtectedRoute>
        }
      />

      {/* Farm */}
        <Route
        path="/farms/seedlings-stages"
        element={
          <ProtectedRoute>
            <SeedlingStagesManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms/batches"
        element={
          <ProtectedRoute>
            <SeedlingBatchesManagement />
          </ProtectedRoute>
        }
      />
      {/* Manufacturing */}
      <Route
        path="/manufacturing"
        element={
          <ProtectedRoute>
            <ManufacturingManagement />
          </ProtectedRoute>
        }
      />
      {/* Reports */}
      <Route
        path="/reports/store-stock-level-analysis"
        element={
          <ProtectedRoute>
            <StockLevelAnalysisReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/store-stock-movement-analysis"
        element={
          <ProtectedRoute>
            <StockMovementAnalysisReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/supplier-analysis"
        element={
          <ProtectedRoute>
            <SuppliersReport />
          </ProtectedRoute>
        }
      />
       <Route
        path="/client-prescriptions"
        element={
          <ProtectedRoute>
            <ClientPrescriptionsManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/exhibition-revenue-comparison"
        element={
          <ProtectedRoute>
            <ExhibitionRevenueComparisonReport />
          </ProtectedRoute>
        }
      />
       <Route
        path="/reports/exhibition-sales-summary"
        element={
          <ProtectedRoute>
            <ExhibitionSalesSummaryReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/exhibition-expenses-summary"
        element={
          <ProtectedRoute>
            <ExhibitionExpensesSummaryReport />
          </ProtectedRoute>
        }
      />
       <Route
        path="/reports/daily-sales-summary"
        element={
          <ProtectedRoute>
            <DailySalesSummaryReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/period-sales-summary"
        element={
          <ProtectedRoute>
            <PeriodSalesSummaryReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/expense-report"
        element={
          <ProtectedRoute>
            <ExpensesReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/store-sales-comparison"
        element={
          <ProtectedRoute>
            <StoreSalesComparisonReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/massage-services-report"
        element={
          <ProtectedRoute>
            <MassageServiceSalesReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/product-performance"
        element={
          <ProtectedRoute>
            <ProductPerformanceReport />
          </ProtectedRoute>
        }
      />


      {/* Inventory */}
      <Route
        path="/inventory/items-categories"
        element={
          <ProtectedRoute>
            <ItemCategoriesManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/stores"
        element={
          <ProtectedRoute>
            <StoresManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/items"
        element={
          <ProtectedRoute>
            <ItemsManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/services"
        element={
          <ProtectedRoute>
            <ServicesManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/stock-movement"
        element={
          <ProtectedRoute>
            <StockMovementRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/suppliers"
        element={
          <ProtectedRoute>
            <SuppliersManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventory/supplier/:id"
        element={
          <ProtectedRoute>
            <SupplierDetails />
          </ProtectedRoute>
        }
      />
       <Route
        path="/inventory/delivery-notes"
        element={
          <ProtectedRoute>
            <DeliveryNotes />
          </ProtectedRoute>
        }
      />

      {/* Sales */}
      <Route
        path="/sales/customers"
        element={
          <ProtectedRoute>
            <ClientsManagement />
          </ProtectedRoute>
        }
      />
       <Route
        path="/sales/client-purchases"
        element={
          <ProtectedRoute>
            <ClientPurchases />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/pos"
        element={
          <ProtectedRoute>
            <PointOfSale />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/credit-sales"
        element={
          <ProtectedRoute>
            <CreditSalesManagement />
          </ProtectedRoute>
        }
      />

       <Route
        path="/sales/service-pos"
        element={
          <ProtectedRoute>
            <ServicePointOfSale />
          </ProtectedRoute>
        }
      />

      {/* Reports */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsComponent />
          </ProtectedRoute>
        }
      />

      {/* Projects */}
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/sales"
        element={
          <ProtectedRoute>
            <ProjectSales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/sales/:id/payments"
        element={
          <ProtectedRoute>
            <SalePayments />
          </ProtectedRoute>
        }
      />

      {/* Exhibition */}
      <Route
        path="/exhibitions"
        element={
          <ProtectedRoute>
            <ExhibitionManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exhibitions/stores/inventory"
        element={
          <ProtectedRoute>
            <ExpoStockMovementRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exhibitions/pos"
        element={
          <ProtectedRoute>
            <ExhibitionPOS />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exhibitions/expenses"
        element={
          <ProtectedRoute>
            <ExhibitionExpensesManagement />
          </ProtectedRoute>
        }
      />

      {/* Human Resource */}
      <Route
        path="/hr/employees"
        element={
          <ProtectedRoute>
            <EmployeeManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/departments"
        element={
          <ProtectedRoute>
            <DepartmentManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/attendance"
        element={
          <ProtectedRoute>
            <AttendanceManagement />
          </ProtectedRoute>
        }
      />
       <Route
        path="/hr/payroll"
        element={
          <ProtectedRoute>
            <PayrollManagement />
          </ProtectedRoute>
        }
      />


      {/* Events */}
      <Route
        path="/tickets/events"
        element={
          <ProtectedRoute>
            <EventTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/events/:id"
        element={
          <ProtectedRoute>
            <ParticipantsManagement />
          </ProtectedRoute>
        }
      />

      {/* Expenses */}
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <BranchExpensesManagement />
          </ProtectedRoute>
        }
      />

      {/* Settings */}
      <Route
        path="/settings/company"
        element={
          <ProtectedRoute>
            <CompanyProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/branches"
        element={
          <ProtectedRoute>
            <BranchesManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/roles"
        element={
          <ProtectedRoute>
            <RoleManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account_settings"
        element={
          <ProtectedRoute>
            <EmployeeProfile />
          </ProtectedRoute>
        }
      />

      {/* Archives */}
      <Route
        path="/archives/sales"
        element={
          <ProtectedRoute>
            <ArchiveSalesRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/archives/expenses"
        element={
          <ProtectedRoute>
            <ArchiveExpenseRecords />
          </ProtectedRoute>
        }
      />

      {/* Finance */}
      <Route
        path="/wallets/withdraw-channels"
        element={
          <ProtectedRoute>
            <ChannelTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallets"
        element={
          <ProtectedRoute>
            <WalletTable />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <TransactionsTable />
          </ProtectedRoute>
        }
      />
       <Route
        path="/settings/billing-channels"
        element={
          <ProtectedRoute>
            <BillingChannelsManagement />
          </ProtectedRoute>
        }
      />

       <Route
        path="/sales/customers/accounts"
        element={
          <ProtectedRoute>
            <ClientAccountsManagement />
          </ProtectedRoute>
        }
      />

      {/* Catch all route - redirect to dashboard */}
      <Route
        path="/hr/payroll/run"
        element={
          <ProtectedRoute>
            <RunPayroll />
          </ProtectedRoute>
        }
      />

      {/* Amatugunda Monk Club (Monk Loyalty Club) */}
      <Route
        path="/loyalty"
        element={
          <ProtectedRoute>
            <LoyaltyClub />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loyalty/members"
        element={
          <ProtectedRoute>
            <ClubMembers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loyalty/members/:id"
        element={
          <ProtectedRoute>
            <ClubMemberDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loyalty/tracker"
        element={
          <ProtectedRoute>
            <ClubTracker />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loyalty/wallet"
        element={
          <ProtectedRoute>
            <ClubWallet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loyalty/orders"
        element={
          <ProtectedRoute>
            <ClubOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loyalty/settings"
        element={
          <ProtectedRoute>
            <ClubSettings />
          </ProtectedRoute>
        }
      />

      {/* Anything else: a proper "page not found" instead of a silent redirect */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <NotFound />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;