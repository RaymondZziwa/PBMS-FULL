import { Routes, Route, Navigate } from 'react-router-dom';
import LayoutSkeleton from './layout/skeleton';
import SalesDashboard from './pages/dashboard/dashboard';
import CompanyProfile from './pages/settings/company-profile';
import BranchesManagement from './pages/settings/branch/branchManagement';
import RoleManagement from './pages/settings/roles/roleManagement';
import EventTable from './pages/events/events';
import LoginComponent from './pages/auth/login';
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
import { fetchDataStart, fetchDataSuccess, fetchDataFailure } from "./redux/slices/auth/userAuthSlice";
import StockLevelAnalysisReport from './pages/reports/inventoryReports/stockLevelAnalysis';
import StockMovementAnalysisReport from './pages/reports/inventoryReports/stockLevelMovementAnalysis';
import ExhibitionRevenueComparisonReport from './pages/reports/exhibition/exhibitionRevenueComparisonReport';
import ExhibitionSalesSummaryReport from './pages/reports/exhibition/exhibitionSalesSummary';
import ExhibitionExpensesSummaryReport from './pages/reports/exhibition/exhibitionExpenseSummary';
import DailySalesSummaryReport from './pages/reports/sales/dailySalesSummary';
import StoreSalesComparisonReport from './pages/reports/sales/storeSalesComparison';
import ProductPerformanceReport from './pages/reports/sales/productPerformanceReport';

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
      if (data) {
        try {
          await apiRequest.get('/auth/verify', { withCredentials: true });
          // Session is valid
        } catch (error) {
          // Session expired, clear data
          dispatch(fetchDataFailure('Session expired'));
        }
      } 
      // If no user data but might have cookies
      else {
        try {
          const response = await apiRequest('/auth/me', { withCredentials: true });
          dispatch(fetchDataSuccess(response.data));
        } catch (error) {
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Checking authentication...</div>
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

      {/* Protected Routes - Only accessible when logged in */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <SalesDashboard />
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
        path="/reports/store-sales-comparison"
        element={
          <ProtectedRoute>
            <StoreSalesComparisonReport />
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

      {/* Catch all route - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;