import type { ReactElement } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Logo, Spinner } from "./components/ui";
import { useAuth } from "./lib/auth";
import ChangePassword from "./pages/ChangePassword";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Pay from "./pages/Pay";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import Terms from "./pages/Terms";
import Tracker from "./pages/Tracker";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Leaderboard from "./pages/Leaderboard";
import Verify from "./pages/Verify";

const Splash = () => (
  <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
    <Logo className="h-14" />
    <Spinner className="h-6 w-6 text-brand" />
  </div>
);

/**
 * Signed-in pages. Members must set their own password first, then pay the
 * registration fee before using the rest of the app.
 */
const Member = ({ children, page }: { children: ReactElement; page?: "password" | "pay" }) => {
  const { member, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Splash />;
  if (!member) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (member.mustChangePassword && page !== "password") return <Navigate to="/change-password" replace />;
  if (!member.mustChangePassword && page === "password") return <Navigate to="/" replace />;
  if (member.status === "AWAITING_PAYMENT" && !page && loc.pathname !== "/settings") return <Navigate to="/pay" replace />;
  return children;
};

const Guest = ({ children }: { children: ReactElement }) => {
  const { member, loading } = useAuth();
  if (loading) return <Splash />;
  return member ? <Navigate to="/" replace /> : children;
};

const App = () => (
  <Routes>
    <Route path="/login" element={<Guest><Login /></Guest>} />
    <Route path="/register" element={<Guest><Register /></Guest>} />
    <Route path="/join" element={<Navigate to="/register" replace />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/change-password" element={<Member page="password"><ChangePassword /></Member>} />
    <Route path="/pay" element={<Member page="pay"><Pay /></Member>} />
    <Route path="/" element={<Member><Home /></Member>} />
    <Route path="/tracker" element={<Member><Tracker /></Member>} />
    <Route path="/settings" element={<Member><Settings /></Member>} />
    <Route path="/shop" element={<Member><Shop /></Member>} />
    <Route path="/cart" element={<Member><Cart /></Member>} />
    <Route path="/orders" element={<Member><Orders /></Member>} />
    <Route path="/leaderboard" element={<Member><Leaderboard /></Member>} />
    <Route path="/verify" element={<Verify />} />
    <Route path="/verify/:card" element={<Verify />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
