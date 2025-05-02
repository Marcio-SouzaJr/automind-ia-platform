// src/pages/admin/AdminManageAutomationsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Modal from 'react-bootstrap/Modal'; // 1. Importar Modal
import Form from 'react-bootstrap/Form';   // 1. Importar Form
// import { Link } from 'react-router-dom'; // Para links futuros

// Importar a função do serviço e a interface
import { listAutomationTemplates, addAutomationTemplate, AutomationTemplate, updateAutomationTemplate } from '../../services/firestoreService';

// Importar um ícone genérico se o template não tiver um
import { BsGearWideConnected, BsPencilSquare } from 'react-icons/bs';

const AdminManageAutomationsPage: React.FC = () => {
    const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<AutomationTemplate | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [templateIcon, setTemplateIcon] = useState('');
    const [templateSchema, setTemplateSchema] = useState(''); // Schema como string JSON
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDescription, setNewTemplateDescription] = useState('');
    const [newTemplateIcon, setNewTemplateIcon] = useState(''); // Opcional
    const [newTemplateSchema, setNewTemplateSchema] = useState(''); // Schema como string JSON
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Função para buscar templates
    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listAutomationTemplates();
            setTemplates(data);
        } catch (err) {
            console.error("Erro ao carregar templates na página admin:", err);
            setError("Não foi possível carregar a lista de templates de automação.");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleShowTemplateModal = useCallback((templateToEdit: AutomationTemplate | null = null) => {
        console.log("Abrindo modal para", templateToEdit ? 'edição' : 'criação', templateToEdit);
        setEditingTemplate(templateToEdit); // Guarda o template (ou null)
        setModalError(null);

        if (templateToEdit) {
            // Preenche o form com dados existentes para edição
            setTemplateName(templateToEdit.name);
            setTemplateDescription(templateToEdit.description);
            setTemplateIcon(templateToEdit.icon || '');
            // Formata o schema (objeto) de volta para string JSON para o textarea
            setTemplateSchema(JSON.stringify(templateToEdit.configSchema || {}, null, 2));
        } else {
            // Limpa o form para criação
            setTemplateName('');
            setTemplateDescription('');
            setTemplateIcon('');
            setTemplateSchema('');
        }
        setShowTemplateModal(true); // Abre o modal
    }, []); // Sem dependências complexas aqui

    const handleCloseTemplateModal = () => {
        if (!isSubmitting) {
            setShowTemplateModal(false);
            setEditingTemplate(null); // Limpa template em edição ao fechar
        }
    };

    // --- Função para lidar com a submissão do Modal ---
    const handleTemplateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setModalError(null);
        // ... (validações de nome, descrição, schema JSON como antes) ...
         if (!templateName.trim() || !templateDescription.trim()) { setModalError("Nome e Descrição são obrigatórios."); return; }
         let parsedSchema = {};
         if (templateSchema.trim()) { try { parsedSchema = JSON.parse(templateSchema.trim()); if (typeof parsedSchema !== 'object' || parsedSchema === null || Array.isArray(parsedSchema)) throw new Error("Deve ser objeto JSON."); } catch (e: any) { setModalError(`Schema inválido: ${e.message}`); return; } }


        setIsSubmitting(true);
        try {
            const templateData = {
                name: templateName.trim(),
                description: templateDescription.trim(),
                icon: templateIcon.trim() || undefined,
                configSchema: parsedSchema,
            };

            if (editingTemplate) {
                // --- Modo Edição ---
                console.log(`Atualizando template ${editingTemplate.id}...`, templateData);
                 // 👇 Chamar updateAutomationTemplate (a ser criada) 👇
                // await updateAutomationTemplate(editingTemplate.id, templateData);
                await updateAutomationTemplate(editingTemplate.id, templateData);
                 console.log("Template atualizado com sucesso!");
            } else {
                // --- Modo Criação ---
                console.log("Criando novo template...", templateData);
                // Chamada existente para addAutomationTemplate
                await addAutomationTemplate(templateData as Omit<AutomationTemplate, 'id' | 'createdAt'>);
                console.log("Template criado com sucesso!");
            }

            handleCloseTemplateModal();
            fetchTemplates(); // Recarrega a lista

        } catch (err: any) {
            console.error("Erro ao salvar template:", err);
            setModalError(err.message || `Falha ao ${editingTemplate ? 'atualizar' : 'criar'} template.`);
        } finally {
            setIsSubmitting(false);
        }
    };
    // Buscar ao montar
    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h1>Gerenciar Templates de Automação</h1>
                <Button variant="primary" onClick={() => handleShowTemplateModal()}>
                    + Novo Template
                </Button>
            </div>

            {loading && (
                <div className="text-center">
                    <Spinner animation="border" variant="primary" />
                    <p>Carregando templates...</p>
                </div>
            )}

            {error && <Alert variant="danger">{error}</Alert>}

            {!loading && !error && (
                <Table striped bordered hover responsive variant="dark">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Ícone</th>
                            <th>Nome</th>
                            <th>Descrição</th>
                            <th>Schema de Config. (Prévia)</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {templates.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center">Nenhum template de automação encontrado.</td>
                            </tr>
                        ) : (
                            templates.map((template) => (
                                <tr key={template.id}>
                                    <td><small>{template.id}</small></td>
                                    <td className="text-center">
                                        {/* Exibir ícone se existir, ou um padrão */}
                                        {/* Aqui precisaríamos de uma lógica para renderizar ícones baseados no nome/string */}
                                        <BsGearWideConnected size={20} title={template.icon || 'Ícone Padrão'} />
                                    </td>
                                    <td>{template.name}</td>
                                    <td>{template.description}</td>
                                    <td>
                                        {/* Mostrar prévia do schema (ex: nomes das chaves) */}
                                        <small><code>{template.configSchema ? Object.keys(template.configSchema).join(', ') : 'Nenhum'}</code></small>
                                    </td>
                                    <td>
                                    <Button
                                        variant="outline-info"
                                        size="sm"
                                        className="me-2"
                                        onClick={() => handleShowTemplateModal(template)} // Passa o template para edição
                                    >
                                         <BsPencilSquare className="me-1"/> Editar
                                     </Button>
                                        <Button variant="outline-danger" size="sm" disabled>Excluir</Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            )}
             <Modal show={showTemplateModal} onHide={handleCloseTemplateModal} backdrop="static" keyboard={!isSubmitting} centered size="lg">
                <Modal.Header closeButton={!isSubmitting}>
                <Modal.Title>{editingTemplate ? 'Editar Template' : 'Criar Novo Template'}</Modal.Title>
                </Modal.Header>
                 {/* Envolver Body e Footer com Form */}
                 <Form onSubmit={handleTemplateSubmit} id="createTemplateForm">
                    <Modal.Body>
                        {modalError && <Alert variant="danger">{modalError}</Alert>}

                        <Form.Group className="mb-3" controlId="templateName">
                            <Form.Label>Nome *</Form.Label>
                            <Form.Control type="text" required value={templateName} onChange={(e) => setTemplateName(e.target.value)} disabled={isSubmitting} />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="templateDescription">
                             <Form.Label>Descrição *</Form.Label>
                             <Form.Control as="textarea" rows={3} required value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} disabled={isSubmitting} />
                        </Form.Group>
                         <Form.Group className="mb-3" controlId="templateIcon">
                             <Form.Label>Ícone (Opcional)</Form.Label>
                             <Form.Control type="text" value={templateIcon} onChange={(e) => setTemplateIcon(e.target.value)} disabled={isSubmitting} />
                         </Form.Group>
                          <Form.Group className="mb-3" controlId="templateSchema">
                             <Form.Label>Schema de Configuração (JSON)</Form.Label>
                             <Form.Control as="textarea" rows={8} value={templateSchema} onChange={(e) => setTemplateSchema(e.target.value)} disabled={isSubmitting} style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}/>
                         </Form.Group>

                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseTemplateModal} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" form="createTemplateForm" disabled={isSubmitting}>
                            {isSubmitting ? <Spinner animation="border" size="sm" /> : 'Salvar Template'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default AdminManageAutomationsPage;