import { Navigate, Route, Routes } from "react-router-dom";
import { useDashboardAuth } from "./auth";
import ConnectPage from "./pages/link/ConnectPage";
import CompletePage from "./pages/link/CompletePage";
import SignInPage from "./pages/dashboard/SignInPage";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import MerchantsPage from "./pages/dashboard/MerchantsPage";
import MerchantDetailPage from "./pages/dashboard/MerchantDetailPage";
import InviteMerchantPage from "./pages/dashboard/InviteMerchantPage";

function RequireApiKey({ children }: { children: React.ReactNode }) {
  const { apiKey } = useDashboardAuth();
  if (!apiKey) return <Navigate to="/dashboard/sign-in" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Merchant flow — public, the link token is the auth */}
      <Route path="/link/complete" element={<CompletePage />} />
      <Route path="/link/:token" element={<ConnectPage />} />

      {/* Lender dashboard */}
      <Route path="/dashboard/sign-in" element={<SignInPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireApiKey>
            <DashboardLayout />
          </RequireApiKey>
        }
      >
        <Route index element={<MerchantsPage />} />
        <Route path="merchants/:merchantId" element={<MerchantDetailPage />} />
        <Route path="invite" element={<InviteMerchantPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
