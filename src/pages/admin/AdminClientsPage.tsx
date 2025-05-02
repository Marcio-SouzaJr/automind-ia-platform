// src/pages/admin/AdminClientsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Modal from 'react-bootstrap/Modal'; // Importar Modal
import Form from 'react-bootstrap/Form';   // Importar Form
import { Link } from 'react-router-dom'; // 1. Importar Link

// Importar funções do serviço e a interface CompanyData
// ✨ Incluir addCompany (será criada no próximo passo)
import { listCompanies, addCompany, CompanyData, updateCompany,deleteCompany } from '../../services/firestoreService';
import { BsPencilSquare, BsTrash } from 'react-icons/bs';

const AdminClientsPage: React.FC = () => {
    const [companies, setCompanies] = useState<CompanyData[]>([]);
    const [loading, setLoading] = useState<boolean>(true); // Loading da lista principal
    const [error, setError] = useState<string | null>(null); // Erro da lista principal

    // Estados para o Modal de Criação
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    // 👇 Estado para guardar a empresa sendo editada (ou null) 👇
    const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
    const [companyName, setCompanyName] = useState(''); // Renomeado para clareza
    const [companyCnpj, setCompanyCnpj] = useState(''); // Renomeado
    const [companyAccessCode, setCompanyAccessCode] = useState(''); // Para exibir na edição
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState<CompanyData | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Função memoizada para buscar a lista de empresas
    const fetchCompanies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listCompanies();
            setCompanies(data);
        } catch (err) {
            console.error("Erro ao carregar empresas:", err);
            setError("Não foi possível carregar a lista de empresas.");
        } finally {
            setLoading(false);
        }
    }, []); // Sem dependências, busca inicial ou manual

    // Efeito para buscar empresas na montagem do componente
    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    const handleShowDeleteModal = (company: CompanyData) => {
        setCompanyToDelete(company); // Guarda a empresa a ser excluída
        setDeleteError(null);      // Limpa erros anteriores
        setShowDeleteModal(true);    // Abre o modal
    };

    const handleCloseDeleteModal = () => {
        if (!isDeleting) { // Só fecha se não estiver excluindo
            setShowDeleteModal(false);
            setCompanyToDelete(null); // Limpa a seleção
        }
    };

    const handleConfirmDelete = async () => {
        if (!companyToDelete) return; // Segurança extra

        setIsDeleting(true);
        setDeleteError(null);
        try {
            console.log(`Excluindo empresa ${companyToDelete.id}...`);
            // Chamar a função deleteCompany (a ser criada)
            // await deleteCompany(companyToDelete.id);
            await deleteCompany(companyToDelete.id);
            console.log("Empresa excluída com sucesso!");

            handleCloseDeleteModal(); // Fecha o modal
            fetchCompanies(); // Recarrega a lista

        } catch (err: any) {
            console.error("Erro ao excluir empresa:", err);
            setDeleteError(err.message || "Falha ao excluir empresa.");
            // Não fechar o modal em caso de erro para mostrar a mensagem
        } finally {
            setIsDeleting(false); // Finaliza o estado de exclusão
        }
    };

    // Funções para controlar o Modal
    const handleShowCompanyModal = useCallback((companyToEdit: CompanyData | null = null) => {
        setEditingCompany(companyToEdit);
        setModalError(null);
        if (companyToEdit) {
            // Modo Edição: Preenche o form
            setCompanyName(companyToEdit.name);
            setCompanyCnpj(companyToEdit.cnpj || '');
            setCompanyAccessCode(companyToEdit.accessCode || 'N/A'); // Pega código existente
        } else {
            // Modo Criação: Limpa o form
            setCompanyName('');
            setCompanyCnpj('');
            setCompanyAccessCode(''); // Código será gerado
        }
        setShowCompanyModal(true);
    }, []);

    const handleCloseCompanyModal = () => {
        if (!isSubmitting) {
            setShowCompanyModal(false);
            setEditingCompany(null); // Limpa ao fechar
        }
    };

    // Função para lidar com a submissão do formulário do Modal
    const handleCompanySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setModalError(null);
        if (!companyName.trim()) { setModalError("Nome é obrigatório."); return; }
        setIsSubmitting(true);
        try {
            const companyData = {
                name: companyName.trim(),
                cnpj: companyCnpj.trim() || undefined,
            };

            if (editingCompany) {
                // --- Modo Edição ---
                console.log(`Atualizando empresa ${editingCompany.id}...`, companyData);
                // 👇 Chamar updateCompany (a ser criada) 👇
                // await updateCompany(editingCompany.id, companyData);
                await updateCompany(editingCompany.id, companyData);
                console.log("Empresa atualizada!");
            } else {
                // --- Modo Criação ---
                console.log("Criando nova empresa...", companyData);
                // Chamada existente
                await addCompany(companyData);
                console.log("Empresa criada!");
            }
            handleCloseCompanyModal();
            fetchCompanies(); // Recarrega lista

        } catch (err: any) { /* ... tratamento de erro ... */ setModalError(err.message || 'Falha'); }
        finally { setIsSubmitting(false); }
    };

    return (
        <Container fluid>
            {/* Header da página */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h1>Gerenciamento de Clientes</h1>
                <Button variant="primary" onClick={() => handleShowCompanyModal()}>
                    + Nova Empresa
                </Button>
            </div>

            {/* Indicador de carregamento da tabela */}
            {loading && (
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                    <p>Carregando empresas...</p>
                </div>
            )}

            {/* Alerta de erro da tabela */}
            {error && <Alert variant="danger">{error}</Alert>}

            {/* Tabela de Empresas (renderiza se não estiver carregando e sem erro) */}
            {!loading && !error && (
                <Table striped bordered hover responsive variant="dark">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>CNPJ</th>
                            <th>Código de Acesso</th>
                            <th>Criado Em</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {companies.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center">Nenhuma empresa encontrada.</td>
                            </tr>
                        ) : (
                            companies.map((company) => (
                                <tr key={company.id}>
                                    <td><small>{company.id}</small></td>
                                    <td>{company.name}</td>
                                    <td>{company.cnpj || '-'}</td>
                                    {/* Exibe o código de acesso gerado */}
                                    <td><code>{company.accessCode || 'N/A'}</code></td>
                                    {/* Formata a data (se existir) */}
                                    <td>{company.createdAt?.toDate().toLocaleDateString() || '-'}</td>
                                    <td>
                                    <Button
                                        variant="outline-info"
                                        size="sm"
                                        className="me-2"
                                        onClick={() => handleShowCompanyModal(company)} // Passa a empresa
                                     >
                                         <BsPencilSquare className="me-1"/> Editar
                                     </Button>
                                        <Button variant="outline-secondary" size="sm" className="me-2" href={`/admin/clients/${company.id}`}>
                                        Detalhes
                                    </Button>
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleShowDeleteModal(company)} // Abre modal de confirmação
                                     >
                                         <BsTrash /> Excluir
                                     </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            )}

            {/* --- Modal de Criação de Empresa --- */}
            <Modal show={showCompanyModal} onHide={handleCloseCompanyModal} backdrop="static" keyboard={!isSubmitting} centered>
                 <Modal.Header closeButton={!isSubmitting}>
                     {/* Título dinâmico */}
                    <Modal.Title>{editingCompany ? 'Editar Empresa' : 'Adicionar Nova Empresa'}</Modal.Title>
                 </Modal.Header>
                 <Form onSubmit={handleCompanySubmit} id="companyForm">
                    <Modal.Body>
                        {modalError && <Alert variant="danger">{modalError}</Alert>}
                        {/* Campos usam os novos estados */}
                        <Form.Group className="mb-3" controlId="companyName">
                            <Form.Label>Nome da Empresa *</Form.Label>
                            <Form.Control type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={isSubmitting} />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="companyCnpj">
                             <Form.Label>CNPJ (Opcional)</Form.Label>
                             <Form.Control type="text" value={companyCnpj} onChange={(e) => setCompanyCnpj(e.target.value)} disabled={isSubmitting} />
                         </Form.Group>
                         {/* Campo Access Code: Gerado na criação, read-only na edição */}
                         <Form.Group className="mb-3">
                            <Form.Label>Código de Acesso</Form.Label>
                            <Form.Control
                                type="text"
                                value={editingCompany ? companyAccessCode : 'Será gerado automaticamente'} // Mostra código existente ou texto placeholder
                                readOnly // Sempre read-only
                                disabled // Sempre desabilitado
                                style={{ fontStyle: editingCompany ? 'normal' : 'italic', backgroundColor: '#e9ecef' }}
                            />
                             {!editingCompany && <Form.Text className="text-muted">O código único será gerado ao salvar.</Form.Text>}
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseCompanyModal} disabled={isSubmitting}> Cancelar </Button>
                        <Button variant="primary" type="submit" form="companyForm" disabled={isSubmitting}>
                            {isSubmitting ? <Spinner size="sm" /> : (editingCompany ? 'Salvar Alterações' : 'Salvar Empresa')}
                        </Button>
                    </Modal.Footer>
                </Form> </Modal>
            {/* --- Fim Modal --- */}
            <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
                <Modal.Header closeButton={!isDeleting}>
                    <Modal.Title>Confirmar Exclusão</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {deleteError && <Alert variant="danger">{deleteError}</Alert>}
                    Tem certeza que deseja excluir a empresa{' '}
                    <strong>{companyToDelete?.name || 'Selecionada'}</strong>
                    {' '} (ID: <code>{companyToDelete?.id}</code>)?
                    <br />
                    <strong className="text-danger">Atenção:</strong> Esta ação não pode ser desfeita. As automações associadas a esta empresa podem precisar ser removidas manualmente.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDeleteModal} disabled={isDeleting}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting}>
                        {isDeleting ? (
                            <> <Spinner as="span" size="sm" /> Excluindo... </>
                        ) : (
                            'Confirmar Exclusão'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

        </Container>
    );
};

export default AdminClientsPage;