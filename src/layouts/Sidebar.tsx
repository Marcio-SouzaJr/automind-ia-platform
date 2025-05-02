// src/components/layout/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import Nav from 'react-bootstrap/Nav';
import Button from 'react-bootstrap/Button';
import { BsHouseDoorFill, BsCpuFill, BsPower, BsPeopleFill, BsGrid1X2Fill } from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext'; // Importar o contexto de autenticação

// --- ESTILOS ---
// Estilo BASE para todos os itens (links e botão logout) - Foco no padding e flex
const baseItemStyle: React.CSSProperties = {
    padding: '0.75rem 1rem', // Padding consistente
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    borderRadius: '0.25rem',
    marginBottom: '0.5rem',
    width: '100%',
    transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
};

// Estilo para NavLink INATIVO
const inactiveNavLinkStyle: React.CSSProperties = {
    ...baseItemStyle,
    color: '#adb5bd', // Cor cinza claro inativo
    backgroundColor: 'transparent',
};

// Estilo para NavLink ATIVO
const activeNavLinkStyle: React.CSSProperties = {
    ...baseItemStyle,
    color: '#ffffff', // Cor branca ativo
    backgroundColor: '#FF8000', // Fundo Laranja ativo
};

// Estilo para botão Logout (ESTADO NORMAL)
const logoutButtonStyle: React.CSSProperties = {
    ...baseItemStyle,
    color: '#dc3545', // Cor vermelha
    backgroundColor: 'transparent', // Fundo transparente
    border: '1px solid #dc3545', // Borda vermelha (estilo outline)
};

// Estilo para botão Logout (ESTADO HOVER)
const logoutButtonHoverStyle: React.CSSProperties = {
    ...baseItemStyle, // Mantém padding/flex
    color: '#ffffff', // Texto branco
    backgroundColor: '#dc3545', // Fundo vermelho
    border: '1px solid #dc3545', // Borda vermelha (igual)
};
// --- FIM ESTILOS ---


interface SidebarProps {
    closeMenu?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ closeMenu }) => {
    const { currentUser, logOut, dbUser } = useAuth();
    const [isLogoutHovered, setIsLogoutHovered] = React.useState(false);

    // Função de estilo para NavLink (usa estilos específicos)
    const getNavLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => {
        const baseStyle = isActive ? activeNavLinkStyle : inactiveNavLinkStyle;
        // Simples hover para inativos (escurecer fundo levemente)
        const hoverStyle = !isActive ? { ':hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' } } : {};
        return { ...baseStyle, ...hoverStyle }; // Combina base e hover
    };

    const handleNavLinkClick = () => {
        if (closeMenu) closeMenu();
    };

    const handleLogoutClick = async () => {
        if (closeMenu) closeMenu();
        try {
            await logOut();
        } catch (error) {
            console.error("Erro ao tentar deslogar pelo botão:", error);
        }
    };

    return (
        <div className="d-flex flex-column h-100 p-3">
            {/* Logo */}
            <div className="mb-4 text-center">
                 <h2 style={{ color: '#FF8000' }}>Automind IA</h2>
            </div>

            {/* Navegação Principal */}
            <Nav className="flex-column flex-grow-1">
                 {currentUser && (
                    <>
                        <NavLink to="/dashboard" style={getNavLinkStyle} onClick={handleNavLinkClick}>
                            <BsHouseDoorFill size={20} style={{ marginRight: '10px' }} /> Dashboard
                        </NavLink>
                        <NavLink to="/automations" style={getNavLinkStyle} onClick={handleNavLinkClick}>
                            <BsCpuFill size={20} style={{ marginRight: '10px' }} /> Automações
                        </NavLink>
                        {/* ... outros links ... */}
                    </>
                 )}
                  {currentUser && dbUser?.role === 'admin' && (
                    <>
                        {/* Separador Visual */}
                        <hr style={{borderColor: '#555', margin: '1rem 0'}} />
                        <small className="text-muted px-3 mb-2 text-uppercase">Administração</small>

                        {/* Link para Gerenciar Clientes */}
                        <NavLink to="/admin/clients" style={getNavLinkStyle} onClick={handleNavLinkClick}>
                            <BsPeopleFill size={20} style={{ marginRight: '10px' }} /> Clientes
                        </NavLink>

                        {/* Link para Gerenciar Automações (Templates) */}
                        <NavLink to="/admin/automations/manage" style={getNavLinkStyle} onClick={handleNavLinkClick}>
                             <BsGrid1X2Fill size={20} style={{ marginRight: '10px' }} /> Gerenciar Automações
                        </NavLink>
                        {/* Adicione mais links de admin aqui (ex: Logs, Configurações Globais) */}
                    </>
                )}
            </Nav>

            {/* Área inferior (Logout) */}
            <div className="mt-auto">
                 {currentUser && (
                    // Voltar a usar Button sem variant="link" para ter estrutura de botão
                    <Button
                       variant="custom" // Usar variant custom ou nenhuma para não interferir nos estilos
                       onClick={handleLogoutClick}
                       style={isLogoutHovered ? logoutButtonHoverStyle : logoutButtonStyle} // Aplica estilo base/logout e hover
                       onMouseEnter={() => setIsLogoutHovered(true)}
                       onMouseLeave={() => setIsLogoutHovered(false)}
                       className="w-100 border-0 p-0" // Remover padding/border padrão do Button, largura 100%
                       >
                         {/* Manter o conteúdo interno com o padding correto */}
                         <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem' }}>
                            <BsPower size={20} style={{ marginRight: '10px' }} /> Sair
                         </div>
                    </Button>
                )}
            </div>
        </div>
    );
};

export default Sidebar;