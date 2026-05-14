import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import VisasPage from "./pages/VisasPage";
import RegistrationsPage from "./pages/RegistrationsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import NewsPage from "./pages/NewsPage";
import MediaPage from "./pages/MediaPage";
import NoticesPage from "./pages/NoticesPage";
import AuditPage from "./pages/AuditPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { token, ready } = useAuth();
  if (!ready) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="registrations" element={<RegistrationsPage />} />
        <Route path="visas" element={<VisasPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="media" element={<MediaPage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
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
