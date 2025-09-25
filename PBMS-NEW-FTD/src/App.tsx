import { Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Routes>
      <Route
          path="/login"
          element={
            <LoginComponent />
          }
      />
        <Route
          path="/dashboard"
          element={
            <LayoutSkeleton>
              <SalesDashboard />
            </LayoutSkeleton>
          }
      />

      {/* Human Resource */}
      <Route
          path="/hr/employees"
          element={
            <LayoutSkeleton>
              <EmployeeManagement />
            </LayoutSkeleton>
          }
      />
      <Route
          path="/hr/departments"
          element={
            <LayoutSkeleton>
              <DepartmentManagement />
            </LayoutSkeleton>
          }
      />
      {/* Events */}
      <Route
          path="/tickets/events"
          element={
            <LayoutSkeleton>
              <EventTable />
            </LayoutSkeleton>
          }
      />
      <Route
          path="/tickets/events/:id"
          element={
            <LayoutSkeleton>
              <ParticipantsManagement />
            </LayoutSkeleton>
          }
      />
      {/* Settings */}
      <Route
          path="/settings/company"
          element={
            <LayoutSkeleton>
              <CompanyProfile />
            </LayoutSkeleton>
          }
      />
      
      <Route
          path="/settings/branches"
          element={
            <LayoutSkeleton>
              <BranchesManagement />
            </LayoutSkeleton>
          }
      />
      
      <Route
          path="/settings/roles"
          element={
            <LayoutSkeleton>
              <RoleManagement />
            </LayoutSkeleton>
          }
      />
      <Route
          path="/account_settings"
          element={
            <LayoutSkeleton>
              <EmployeeProfile />
            </LayoutSkeleton>
          }
      />
      </Routes>
  );
}

export default App;
