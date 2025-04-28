// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // 1. Importar o hook useAuth

interface ProtectedRouteProps {
  // Podemos adicionar props aqui no futuro se precisarmos de lógica mais complexa
  // ex: roles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = () => {
  const { currentUser, loading } = useAuth();

  // 1. Esperar enquanto o AuthContext ainda está verificando o estado inicial
  if (loading) {
    // É importante mostrar algo (ou nada) enquanto carrega para evitar
    // redirecionamentos prematuros antes do Firebase verificar se há um usuário
    // Pode ser um spinner global, ou null para não renderizar nada temporariamente
    return <div>Verificando autenticação...</div>; // Ou <LoadingSpinner />;
  }

  // 2. Se não estiver carregando e não houver usuário, redirecionar para login
  if (!currentUser) {
    console.log("ProtectedRoute: Usuário não autenticado, redirecionando para /login");
    // O componente Navigate do react-router-dom faz o redirecionamento declarativamente
    // O 'replace' evita que a página protegida entre no histórico do navegador
    return <Navigate to="/login" replace />;
  }

  // 3. Se chegou até aqui, o usuário está autenticado. Renderizar o conteúdo da rota filha.
  // O Outlet renderiza o componente definido na rota filha (ex: DashboardPage, AutomationsPage)
  // que está ANINHADA dentro da rota que usa ProtectedRoute no App.tsx
  // Nota: Se você não aninhar rotas e passar o componente como children,
  // usaria {children} aqui em vez de <Outlet />. Mas com <Outlet/> é mais comum.
  return <Outlet />;
};

export default ProtectedRoute;