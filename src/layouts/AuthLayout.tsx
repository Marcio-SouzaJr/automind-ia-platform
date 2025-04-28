// src/layouts/AuthLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom'; // Para renderizar a página filha (Login ou Signup)

const AuthLayout: React.FC = () => {
  return (
    // Este é o container que centraliza o conteúdo na tela
    <div
      className="d-flex align-items-center justify-content-center vh-100"
    >
      {/* O Outlet renderizará LoginPage ou SignupPage aqui dentro */}
      <Outlet />
    </div>
  );
};

export default AuthLayout;