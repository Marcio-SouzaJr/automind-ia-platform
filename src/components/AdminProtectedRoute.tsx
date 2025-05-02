// src/components/auth/AdminProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminProtectedRoute: React.FC = () => {
  const { currentUser, dbUser, loading } = useAuth();
  const location = useLocation(); // Para saber de onde o usuário veio

  // 1. Esperar carregar dados do AuthContext
  if (loading) {
    return <div>Verificando permissões...</div>; // Ou <LoadingSpinner />;
  }

  // 2. Verificar se está logado E se tem dados do Firestore E se o papel é 'admin'
  if (!currentUser || !dbUser || dbUser.role !== 'admin') {
    console.warn(`AdminProtectedRoute: Acesso negado para ${currentUser?.email || 'usuário não logado'} com role '${dbUser?.role || 'desconhecido'}' à rota ${location.pathname}`);
    // Redireciona para o dashboard comum se não for admin
    // Poderia redirecionar para '/unauthorized' ou '/login' também
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  // 3. Se for admin, renderiza o conteúdo da rota admin
  return <Outlet />;
};

export default AdminProtectedRoute;