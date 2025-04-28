// src/pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div>
      <h1>404 - Página Não Encontrada</h1>
      <p>A página que você procura não existe.</p>
      <Link to="/">Voltar para Home</Link>
      {/* Ou <Link to="/dashboard">Voltar para o Dashboard</Link> se fizer mais sentido */}
    </div>
  );
};

export default NotFoundPage;