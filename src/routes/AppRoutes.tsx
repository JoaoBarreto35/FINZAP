import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import Dashboard from "../pages/Dashboard";
import Categories from "../pages/Categories";
import Invoices from "../pages/Invoices";
import Login from "../pages/Login";
import Members from "../pages/Members";
import Register from "../pages/Register";
import Settings from "../pages/Settings";
import Transactions from "../pages/Transactions";
import Wallets from "../pages/Wallets";
import WhatsAppSimulator from "../pages/WhatsAppSimulator";
import WorkspaceSelect from "../pages/WorkspaceSelect";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="workspaces" element={<WorkspaceSelect />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="wallets" element={<Wallets />} />
          <Route path="categories" element={<Categories />} />
          <Route path="members" element={<Members />} />
          <Route path="settings" element={<Settings />} />
          <Route path="whatsapp-simulator" element={<WhatsAppSimulator />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}