// src/layouts/AppLayout.tsx
import React, { useState } from 'react'; // 1. Importar useState
import { Outlet } from 'react-router-dom';
import Sidebar from '../layouts/Sidebar'; // 1. Importar o Sidebar
import Button from 'react-bootstrap/Button'; // 1. Importar Button
import Offcanvas from 'react-bootstrap/Offcanvas'; // 1. Importar Offcanvas
import { BsList as HamburgerIcon } from 'react-icons/bs'; // Mudar de List para BsList
// Estilos básicos (existentes)
const sidebarDesktopStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    minHeight: '100vh',
    color: '#fff',
    width: '250px', // Largura fixa para desktop
    flexShrink: 0, // Não encolher
};

const contentStyle: React.CSSProperties = {
    padding: '1.5rem', // Ajustar padding se necessário
    flexGrow: 1, // Ocupa o espaço restante
    overflowY: 'auto', // Permite scroll no conteúdo se necessário
    minHeight: '100vh', // Garante altura mínima
};

// Estilo para o header mobile com o botão (pode ir para SCSS)
const mobileHeaderStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a', // Mesma cor do sidebar
    padding: '0.75rem 1rem',
    color: '#fff',
};

const AppLayout: React.FC = () => {
    // 2. Estado para controlar o Offcanvas (menu mobile)
    const [showOffcanvas, setShowOffcanvas] = useState(false);

    const handleCloseOffcanvas = () => setShowOffcanvas(false);
    const handleShowOffcanvas = () => setShowOffcanvas(true);

    return (
        // Container flex principal
        <div className="d-flex" style={{minHeight: '100vh', backgroundColor: '#000'}}> {/* Garante fundo preto geral */}

            {/* 4. Sidebar Fixo para Desktop (md e acima) */}
            {/* Usa classes Bootstrap para esconder em telas menores que 'md' */}
            <div className="d-none d-md-block" style={sidebarDesktopStyle}>
                <Sidebar /> {/* Não precisa de função para fechar aqui */}
            </div>

            {/* Área de Conteúdo Principal */}
            <div style={contentStyle}>
                 {/* 3. Botão Hambúrguer e Header para Mobile (abaixo de md) */}
                 {/* Usa classes Bootstrap para mostrar APENAS em telas menores que 'md' */}
                <div className="d-md-none" style={mobileHeaderStyle}>
                     <Button variant="dark" onClick={handleShowOffcanvas}>
                         <HamburgerIcon size={25} />
                     </Button>
                     {/* Poderia adicionar o logo ou título aqui também */}
                 </div>

                 {/* O conteúdo da página atual renderizado pelo Outlet */}
                 <main className="mt-3"> {/* Margem para separar do header mobile */}
                     <Outlet />
                 </main>
            </div>

             {/* 5. Offcanvas Sidebar para Mobile (abaixo de md) */}
             {/* O próprio Offcanvas será responsivo se necessário, mas o controlamos com estado */}
            <Offcanvas
                show={showOffcanvas}
                onHide={handleCloseOffcanvas}
                // responsive="md" // Não usamos responsive aqui, controlamos via estado/classes
                placement="start" // Aparece da esquerda
                className="d-md-none" // Mostra APENAS em telas menores que 'md'
                style={{ backgroundColor: '#1a1a1a', color: '#fff', width: '250px' }} // Estilo do Offcanvas
            >
                <Offcanvas.Header closeButton closeVariant="white">
                     <Offcanvas.Title>Menu</Offcanvas.Title> {/* Título opcional */}
                 </Offcanvas.Header>
                 <Offcanvas.Body className="p-0"> {/* Remover padding do body para o sidebar usar o seu */}
                    {/* Passa a função para fechar o Offcanvas ao Sidebar */}
                    <Sidebar closeMenu={handleCloseOffcanvas} />
                 </Offcanvas.Body>
            </Offcanvas>

        </div> // Fim do container flex principal
    );
};

export default AppLayout;