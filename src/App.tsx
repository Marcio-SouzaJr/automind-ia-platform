// src/App.tsx
import { Routes, Route } from "react-router-dom";

// Layouts
import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout"; // Importar AuthLayout

// Páginas
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import AutomationsPage from "./pages/AutomationsPage";
import NotFoundPage from "./pages/NotFoundPage";

// Componente de Proteção
import ProtectedRoute from './components/ProtectedRoute'; // 1. Importar
import AutomationDetailPage from "./pages/AutomationDetailPage";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminClientsPage from "./pages/admin/AdminClientsPage";
import AdminManageAutomationsPage from "./pages/admin/AdminManageAutomationsPage";
import AdminClientDetailPage from './pages/admin/AdminClientDetailPage';
import ManageClientsPage from "./pages/ManageClientsPage";


function App() {
  return (
    <Routes>
      {/* Rota Pública Principal */}
      <Route path="/" element={<HomePage />} />

      {/* Rotas Públicas de Autenticação */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Rotas Privadas/Internas (AGORA USANDO ProtectedRoute) */}
      <Route element={<ProtectedRoute />}> {/* 2. Rota pai usa ProtectedRoute */}
        {/* Se autenticado, ProtectedRoute renderiza <Outlet/>, que carrega o AppLayout */}
        {/* As rotas filhas são renderizadas pelo <Outlet/> DENTRO do AppLayout */}
        <Route element={<AppLayout />}> {/* 3. AppLayout como outra rota aninhada */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/automations" element={<AutomationsPage />} />
            <Route path="/automations/:automationInstanceId" element={<AutomationDetailPage />} />
            <Route path="/clients/manage" element={<ManageClientsPage />} />
            {/* Adicione outras rotas protegidas aqui */}
        </Route>
      </Route>
      <Route element={<AdminProtectedRoute />}> {/* Protege o grupo */}
         <Route element={<AppLayout />}> {/* Usa o mesmo layout */}
             {/* Note que rotas de admin podem REUTILIZAR o path base se fizer sentido */}
             {/* ou ter um prefixo /admin/ */}
            <Route path="/admin/clients" element={<AdminClientsPage />} />
            <Route path="/admin/clients/:companyId" element={<AdminClientDetailPage />} />
            <Route path="/admin/automations/manage" element={<AdminManageAutomationsPage />} />
             {/* Adicione outras rotas de admin aqui */}
        </Route>
      </Route>

      {/* Rota Catch-all para 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
