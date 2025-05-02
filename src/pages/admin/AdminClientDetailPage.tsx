// src/pages/admin/AdminClientDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import { BsPencilFill, BsTrash, BsPower, BsCheckCircleFill } from 'react-icons/bs';

import { useAuth } from '../../contexts/AuthContext';
import {
    getCompanyDetails, CompanyData,
    getCompanyAutomations, CompanyAutomation,
    listAutomationTemplates, AutomationTemplate,
    associateAutomationToCompany,
    updateCompanyAutomationStatus
} from '../../services/firestoreService';

const AdminClientDetailPage: React.FC = () => {
    const { companyId } = useParams<{ companyId: string }>();
    const navigate = useNavigate();
    // 👇 CORRIGIDO: Remover 'dbUser' se não for usado diretamente aqui (ou usar para checagem de admin)
    // const { dbUser } = useAuth();

    // Estados da página principal
    const [companyDetails, setCompanyDetails] = useState<CompanyData | null>(null);
    const [loadingCompany, setLoadingCompany] = useState<boolean>(true);
    const [errorCompany, setErrorCompany] = useState<string | null>(null);
    const [companyAutomations, setCompanyAutomations] = useState<CompanyAutomation[]>([]);
    const [loadingAutomations, setLoadingAutomations] = useState<boolean>(true);
    const [errorAutomations, setErrorAutomations] = useState<string | null>(null);

    // Estados para o Modal de Associação/Edição
    const [showAutomationModal, setShowAutomationModal] = useState(false);
    const [availableTemplates, setAvailableTemplates] = useState<AutomationTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false); // <-- CORRIGIDO: Usar este estado
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [configFormData, setConfigFormData] = useState<{ [key: string]: any }>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null); // Nome correto
    const [editingInstance, setEditingInstance] = useState<CompanyAutomation | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);

    // --- Funções de Busca ---
    const fetchCompanyDetails = useCallback(async () => {
        if (!companyId) { setLoadingCompany(false); setErrorCompany("ID inválido."); return; }
        setLoadingCompany(true); setErrorCompany(null); setCompanyDetails(null);
        try {
            const data = await getCompanyDetails(companyId);
            if (data) setCompanyDetails(data); else setErrorCompany(`Empresa ${companyId} não encontrada.`);
        } catch (err) { setErrorCompany("Erro ao buscar empresa."); }
        finally { setLoadingCompany(false); }
    }, [companyId]);

    const fetchCompanyAutomations = useCallback(async () => {
        if (!companyId) { setLoadingAutomations(false); return; }
        setLoadingAutomations(true); setErrorAutomations(null); setCompanyAutomations([]);
        try {
            const data = await getCompanyAutomations(companyId);
            setCompanyAutomations(data);
        } catch (err) { setErrorAutomations("Falha ao carregar automações."); }
        finally { setLoadingAutomations(false); }
    }, [companyId]);

    useEffect(() => { fetchCompanyDetails(); }, [fetchCompanyDetails]);
    useEffect(() => { fetchCompanyAutomations(); }, [fetchCompanyAutomations]);


    // --- Funções do Modal ---
    const handleShowAutomationModal = useCallback(async (instanceToEdit: CompanyAutomation | null = null) => {
        setEditingInstance(instanceToEdit);
        setModalError(null); // <-- CORRIGIDO
        setConfigFormData({});

        if (instanceToEdit) {
            setSelectedTemplateId(instanceToEdit.automationId);
            setConfigFormData(instanceToEdit.config || {});
            // Busca templates só se necessário (poderia otimizar buscando só 1 se precisar)
            if (availableTemplates.length === 0 || !availableTemplates.find(t => t.id === instanceToEdit.automationId)) {
                setLoadingTemplates(true);
                try { const templates = await listAutomationTemplates(); setAvailableTemplates(templates); }
                catch (err) { setModalError("Erro ao carregar templates."); } // <-- CORRIGIDO
                finally { setLoadingTemplates(false); }
            }
        } else {
            setSelectedTemplateId('');
             if (availableTemplates.length === 0) {
                 setLoadingTemplates(true);
                 try { const templates = await listAutomationTemplates(); setAvailableTemplates(templates); }
                 catch (err) { setModalError("Erro ao carregar templates."); } // <-- CORRIGIDO
                 finally { setLoadingTemplates(false); }
             }
        }
        setShowAutomationModal(true);
    }, [availableTemplates]); // Depende de availableTemplates

    const handleCloseAutomationModal = () => { if (!isSubmittingModal) { setShowAutomationModal(false); setEditingInstance(null); } };

    const handleTemplateSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newTemplateId = event.target.value;
        setSelectedTemplateId(newTemplateId);
        setConfigFormData({});
        setModalError(null); // <-- CORRIGIDO
        const selectedTemplate = availableTemplates.find(t => t.id === newTemplateId);
        if (selectedTemplate?.configSchema) {
            const defaults = Object.entries(selectedTemplate.configSchema)
                                   .filter(([, fieldSchema]) => fieldSchema.defaultValue !== undefined)
                                   .reduce((acc, [key, fieldSchema]) => { acc[key] = fieldSchema.defaultValue; return acc; }, {} as {[key: string]: any});
            setConfigFormData(defaults);
        }
    };

    const handleConfigFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = event.target;
        const isCheckbox = event.target instanceof HTMLInputElement && event.target.type === 'checkbox';
        const checked = event.target instanceof HTMLInputElement ? event.target.checked : undefined;
        const parsedValue = isCheckbox ? checked : (type === 'number' ? parseFloat(value) || 0 : value);
        setConfigFormData(prevData => ({ ...prevData, [name]: parsedValue }));
    };

    const handleAutomationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); setModalError(null); // <-- CORRIGIDO
        const templateIdToSave = editingInstance ? editingInstance.automationId : selectedTemplateId;
        if (!templateIdToSave || !companyId) { setModalError("ID do Template ou da Empresa faltando."); return; } // <-- CORRIGIDO
        setIsSubmittingModal(true);
        try {
            const enabledStatus = editingInstance ? editingInstance.enabled : true;
            await associateAutomationToCompany( companyId, templateIdToSave, configFormData, enabledStatus );
            handleCloseAutomationModal();
            fetchCompanyAutomations();
        } catch (err: any) { setModalError(err.message || `Falha.`); } // <-- CORRIGIDO
        finally { setIsSubmittingModal(false); }
    };

    // Função Render Config Form
    const renderConfigForm = () => {
        const templateId = editingInstance ? editingInstance.automationId : selectedTemplateId;
        if (!templateId) return null;
        const selectedTemplate = availableTemplates.find(t => t.id === templateId);
        // CORRIGIDO: Checagem explícita de selectedTemplate
        if (!selectedTemplate) {
             // CORRIGIDO: Usar estado loadingTemplates
            if (loadingTemplates) return <div className="text-center"><Spinner animation="border" size="sm" /> Carregando schema...</div>;
            return <Alert variant="warning">Definição do template selecionado não encontrada.</Alert>;
        }
        if (!selectedTemplate.configSchema || Object.keys(selectedTemplate.configSchema).length === 0) {
            return <p className="text-muted fst-italic">Este template não requer configuração adicional.</p>;
        }
        // CORRIGIDO: Passar selectedTemplate.configSchema explicitamente
        return Object.entries(selectedTemplate.configSchema).map(([key, fieldSchema]) => {
            let inputType = 'text';
            let isTextArea = false; let isSelect = false; let isCheckbox = false;
            switch (fieldSchema.type?.toLowerCase()) { /* ... cases ... */ }
            const label = `${fieldSchema.label || key}${fieldSchema.required ? ' *' : ''}`;
            const currentValue = configFormData[key] ?? fieldSchema.defaultValue ?? '';
            return ( // CORRIGIDO: Garantir que o JSX interno está correto e usando as variáveis
                <Form.Group className="mb-3" controlId={`config-${key}`} key={key}>
                    <Form.Label>{label}</Form.Label>
                    {isCheckbox ? ( <Form.Check type="switch" name={key} checked={!!currentValue} onChange={handleConfigFormChange} disabled={isSubmittingModal} label={fieldSchema.helpText || ''} /> )
                     : isTextArea ? ( <Form.Control as="textarea" rows={fieldSchema.rows || 3} name={key} value={currentValue} onChange={handleConfigFormChange} required={fieldSchema.required || false} disabled={isSubmittingModal} /> )
                     : isSelect ? ( <Form.Select name={key} value={currentValue} onChange={handleConfigFormChange} required={fieldSchema.required || false} disabled={isSubmittingModal}> {/* ... options ... */} </Form.Select> )
                     : ( <Form.Control type={inputType} name={key} value={currentValue} onChange={handleConfigFormChange} required={fieldSchema.required || false} disabled={isSubmittingModal} step={inputType === 'number' ? (fieldSchema.step || 'any') : undefined} /> )}
                    {fieldSchema.helpText && !isCheckbox && <Form.Text className="text-muted">{fieldSchema.helpText}</Form.Text>}
                </Form.Group>
            );
        });
    };
    // --- Fim Funções Modal ---


    // --- Função Habilitar/Desabilitar ---
    // 👇 CORRIGIDO: Manter apenas esta declaração 👇
    const handleToggleAutomationStatus = async (instance: CompanyAutomation) => {
        if (!companyId) return;
        const newStatus = !instance.enabled;
        const actionText = newStatus ? 'habilitar' : 'desabilitar';
        setIsTogglingStatus(instance.id);
        try {
            await updateCompanyAutomationStatus(companyId, instance.id, newStatus);
            fetchCompanyAutomations();
        } catch (error: any) { alert(`Erro: ${error.message || 'Erro desconhecido'}`); }
        finally { setIsTogglingStatus(null); }
    };


    // --- Renderização da Página ---
    if (loadingCompany) return <Container className="text-center mt-5"><Spinner /></Container>;
    if (errorCompany) return <Container className="mt-4"><Alert variant="danger">{errorCompany}</Alert><Button onClick={() => navigate(-1)}>Voltar</Button></Container>;
    if (!companyDetails) return <Container className="mt-4"><Alert variant="warning">Empresa não encontrada.</Alert><Button onClick={() => navigate(-1)}>Voltar</Button></Container>;

    return (
        <Container fluid>
            <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/clients')} className="mb-3">← Voltar</Button>

            <Card bg="dark" text="white" border="secondary">
                <Card.Header>
                    <h2 className="h3 mb-0">{companyDetails.name}</h2>
                    <small className="text-muted">ID: {companyDetails.id}</small>
                </Card.Header>
                <Card.Body>
                    <ListGroup variant="flush" className="mb-4">
                         <ListGroup.Item className="bg-dark text-white border-secondary px-0"><strong>CNPJ:</strong> {companyDetails.cnpj || '-'}</ListGroup.Item>
                         <ListGroup.Item className="bg-dark text-white border-secondary px-0"><strong>Código:</strong> <code>{companyDetails.accessCode}</code></ListGroup.Item>
                         <ListGroup.Item className="bg-dark text-white border-secondary px-0"><strong>Criado:</strong> {companyDetails.createdAt?.toDate().toLocaleString() || '-'}</ListGroup.Item>
                    </ListGroup>
                    <hr className="my-4" style={{borderColor: '#555'}}/>

                    <h4>Automações Habilitadas</h4>
                    {loadingAutomations && <div className="text-center my-3"><Spinner size="sm" /> Carregando...</div>}
                    {/* 👇 CORRIGIDO: Remover size="sm" 👇 */}
                    {errorAutomations && <Alert variant="danger">{errorAutomations}</Alert>}
                    {!loadingAutomations && !errorAutomations && (
                        <>
                            {companyAutomations.length === 0 ? (<p className="text-muted">Nenhuma automação habilitada.</p>) : (
                                <Table striped hover responsive variant="dark" size="sm" className="mt-3 align-middle">
                                    <thead><tr><th>Nome/ID</th><th>Status</th><th>Habilitada</th><th>Última Execução</th><th>Ações</th></tr></thead>
                                    <tbody>
                                        {companyAutomations.map((auto) => (
                                            <tr key={auto.id}>
                                                <td>{auto.name || auto.id}</td>
                                                <td><Badge bg={auto.status === 'running' ? 'info' : (auto.status === 'error' ? 'danger' : 'secondary')}>{auto.status || '-'}</Badge></td>
                                                <td className="text-center">
                                                    <Button variant={auto.enabled ? "success" : "secondary"} size="sm" onClick={() => handleToggleAutomationStatus(auto)} disabled={isTogglingStatus === auto.id} title={auto.enabled ? "Desabilitar" : "Habilitar"}>
                                                         {isTogglingStatus === auto.id ? (<Spinner animation="border" size="sm" />) : ( auto.enabled ? <BsCheckCircleFill /> : <BsPower /> )}
                                                    </Button>
                                                </td>
                                                <td>{auto.lastRun?.toDate().toLocaleString() || '-'}</td>
                                                <td>
                                                     <Button variant="outline-warning" size="sm" className="me-2" onClick={() => handleShowAutomationModal(auto)}> <BsPencilFill /> Config </Button>
                                                     <Button variant="outline-danger" size="sm" disabled><BsTrash /></Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                            <Button variant="success" className="mt-3" onClick={() => handleShowAutomationModal()}>+ Habilitar Nova Automação</Button>
                        </>
                    )}
                </Card.Body>
            </Card>

            {/* Modal de Associação/Edição */}
            <Modal show={showAutomationModal} onHide={handleCloseAutomationModal} backdrop="static" keyboard={!isSubmittingModal} centered size="lg">
                <Modal.Header closeButton={!isSubmittingModal}>
                    <Modal.Title>{editingInstance ? 'Editar Configuração' : 'Habilitar Automação'} para {companyDetails?.name}</Modal.Title>
                </Modal.Header>
                {/* 👇 CORRIGIDO: Garantir que Form envolve Body e Footer 👇 */}
                <Form onSubmit={handleAutomationSubmit} id="automationForm">
                    <Modal.Body>
                        {modalError && <Alert variant="danger">{modalError}</Alert>}
                        <Form.Group className="mb-3" controlId="selectTemplate">
                             <Form.Label>Selecione o Template *</Form.Label>
                             {/* 👇 CORRIGIDO: Usar loadingTemplates 👇 */}
                             {loadingTemplates ? (<Spinner animation="border" size="sm" />) : (
                                 <Form.Select value={selectedTemplateId} onChange={handleTemplateSelectChange} required disabled={isSubmittingModal || !!editingInstance}>
                                     <option value="">-- Escolha uma Automação --</option>
                                     {availableTemplates.map(template => (<option key={template.id} value={template.id}>{template.name}</option>))}
                                 </Form.Select>
                             )}
                         </Form.Group>
                        {selectedTemplateId && <hr />}
                        {selectedTemplateId && <h5>Configuração Específica</h5>}
                        {/* 👇 Chamar a função para renderizar o form dinâmico 👇 */}
                        {renderConfigForm()}
                    </Modal.Body>
                     {/* 👇 CORRIGIDO: Garantir que Footer e botões existem 👇 */}
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseAutomationModal} disabled={isSubmittingModal}>Cancelar</Button>
                        <Button variant="primary" type="submit" form="automationForm" disabled={isSubmittingModal || !selectedTemplateId}>
                            {isSubmittingModal ? <Spinner as="span" animation="border" size="sm" /> : (editingInstance ? 'Salvar Alterações' : 'Habilitar e Salvar')}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default AdminClientDetailPage;