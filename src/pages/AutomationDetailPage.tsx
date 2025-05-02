// src/pages/AutomationDetailPage.tsx (Versão do Cliente)
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import Form from 'react-bootstrap/Form';           // Para o input de arquivo
import ProgressBar from 'react-bootstrap/ProgressBar'; // Para progresso

import { useAuth } from '../contexts/AuthContext';
// Importar função e interfaces necessárias
import { getCompanyAutomationDetails, CombinedAutomationDetails } from '../services/firestoreService';

// Imports do Firebase Storage
import { storage } from '../config/firebaseConfig'; // Instância do storage
import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from "firebase/storage"; // Funções e tipo

// Cole a URL de TESTE do seu Webhook n8n aqui
const N8N_WEBHOOK_URL_TEST = "https://automind-ia.app.n8n.cloud/webhook-test/bfdd0c40-0430-4bc7-9b2e-fae837564d1f";
const N8N_WEBHOOK_URL = N8N_WEBHOOK_URL_TEST; // Usar a de teste por enquanto

const AutomationDetailPage: React.FC = () => {
    const { automationInstanceId } = useParams<{ automationInstanceId: string }>();
    const navigate = useNavigate();
    const { currentUser, dbUser } = useAuth(); // Obter usuário Auth e dados Firestore

    // Estados da página
    const [details, setDetails] = useState<CombinedAutomationDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para Upload
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref para limpar input

    // Estados para Ação n8n
    const [isStarting, setIsStarting] = useState<boolean>(false); // Loading do acionamento n8n
    const [startError, setStartError] = useState<string | null>(null); // Erro ao acionar n8n
    const [startSuccess, setStartSuccess] = useState<string | null>(null); // Sucesso ao acionar n8n

    // Efeito para buscar detalhes da automação ao montar/mudar ID
    useEffect(() => {
        const fetchDetails = async () => {
            if (!automationInstanceId || !dbUser?.companyId) {
                setError("Informações necessárias não encontradas.");
                setLoading(false); return;
            }
            setLoading(true); setError(null); setDetails(null);
            try {
                const fetchedDetails = await getCompanyAutomationDetails(dbUser.companyId, automationInstanceId);
                if (fetchedDetails) setDetails(fetchedDetails);
                else setError(`Detalhes não encontrados (${automationInstanceId}).`);
            } catch (err) { setError("Erro ao carregar detalhes."); }
            finally { setLoading(false); }
        };
        fetchDetails();
        // TODO: Adicionar listener onSnapshot aqui para atualizações em tempo real (status, resultFileUrl)
        // const unsubscribe = onSnapshot(doc(db, 'companies', dbUser.companyId, 'company_automations', automationInstanceId), (doc) => { ... });
        // return () => unsubscribe(); // Limpar listener ao desmontar
    }, [automationInstanceId, dbUser]);

    // --- Funções de Upload ---
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            setUploadError(null); setUploadedFileUrl(null); setStartSuccess(null); setStartError(null); // Limpa estados
        } else { setSelectedFile(null); }
    };

    const handleUpload = () => {
        if (!selectedFile || !currentUser || !dbUser?.companyId || !details) {
            setUploadError("Selecione um arquivo PDF e garanta que os detalhes da automação foram carregados."); return;
        }
        if (selectedFile.type !== "application/pdf") { setUploadError("Selecione um arquivo PDF."); return; }

        setIsUploading(true); setUploadProgress(0); setUploadError(null); setUploadedFileUrl(null);
        setStartSuccess(null); setStartError(null); // Limpa feedback n8n

        const timestamp = Date.now();
        // Caminho: uploads/userId/companyId/instanceId-timestamp-nomeoriginal.pdf
        const storagePath = `uploads/${currentUser.uid}/${dbUser.companyId}/${details.instance.id}-${timestamp}-${selectedFile.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        uploadTask.on('state_changed',
            (snapshot: UploadTaskSnapshot) => { // Tipagem do snapshot
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setUploadProgress(progress);
            },
            (error) => { // Tratar erros
                console.error("Erro no upload:", error);
                let message = "Falha no upload.";
                if (error.code === 'storage/unauthorized') message = "Permissão negada.";
                else if (error.code === 'storage/canceled') message = "Upload cancelado.";
                setUploadError(message);
                setIsUploading(false); setUploadProgress(null);
            },
            () => { // Upload concluído
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    setUploadedFileUrl(downloadURL);
                    setIsUploading(false); setUploadProgress(100);
                    if(fileInputRef.current) fileInputRef.current.value = ""; // Limpa input
                    setSelectedFile(null);
                    // Chama a função para acionar o n8n
                    triggerN8nWorkflow(downloadURL);
                }).catch(urlError => {
                    console.error("Erro ao obter URL:", urlError);
                    setUploadError("Upload ok, mas falha ao obter URL.");
                    setIsUploading(false); setUploadProgress(null);
                });
            }
        );
    };
    // --- Fim Funções Upload ---

    // --- Função Acionar n8n ---
    const triggerN8nWorkflow = async (pdfFileUrl: string) => {
        if (!details || !dbUser?.companyId || !currentUser?.uid || !N8N_WEBHOOK_URL || N8N_WEBHOOK_URL.startsWith("COLE_SUA")) {
             setStartError("Erro interno: Configuração ou dados do usuário/automação incompletos para iniciar.");
             return;
        }
        setIsStarting(true); setStartError(null); setStartSuccess(null);
        const payload = {
            triggeringUserId: currentUser.uid,
            companyId: dbUser.companyId,
            instanceId: details.instance.id,
            automationId: details.instance.automationId,
            config: details.instance.config,
            pdfUrl: pdfFileUrl // Envia a URL do PDF
        };
        console.log("Enviando para n8n:", N8N_WEBHOOK_URL, payload);
        try {
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
            });
            if (!response.ok) {
                let errorBody = await response.text(); // Pega texto para mais detalhes
                console.error("Erro n8n:", response.status, response.statusText, errorBody);
                throw new Error(`Falha ao acionar (Status ${response.status}).`);
            }
            const responseData = await response.json();
            console.log("Resposta n8n:", responseData);
            setStartSuccess("Processamento da automação solicitado com sucesso!");
            // TODO: Atualizar status inicial no Firestore para "processing" ou "queued"
        } catch (error: any) { setStartError(error.message || "Erro ao contatar serviço."); }
        finally { setIsStarting(false); }
    };

    // --- Renderização ---
    if (loading) return <Container className="text-center mt-5"><Spinner /></Container>;
    if (error) return <Container className="mt-4"><Alert variant="danger">{error}</Alert><Button onClick={()=>navigate(-1)}>Voltar</Button></Container>;
    if (!details) return <Container className="mt-4"><Alert variant="warning">Detalhes não encontrados.</Alert><Button onClick={()=>navigate(-1)}>Voltar</Button></Container>;

    return (
        <Container>
             <Button variant="outline-secondary" size="sm" onClick={() => navigate('/automations')} className="mb-3">← Voltar</Button>

            <Card>
                <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                        <h2 className="h3 mb-0">{details.template.name}</h2>
                        <Badge bg={details.instance.enabled ? "success" : "secondary"}>
                            {details.instance.enabled ? "Habilitada" : "Desabilitada"}
                        </Badge>
                     </div>
                     <small className="text-muted">Automação: {details.template.id} / Instância: {details.instance.id}</small>
                </Card.Header>
                <Card.Body>
                    <p>{details.template.description}</p>
                    <p><strong>Status Atual:</strong> {details.instance.status || 'Indefinido'}</p>
                    {details.instance.lastRun && <p><small><strong>Última Execução:</strong> {details.instance.lastRun.toDate().toLocaleString()}</small></p>}

                    <hr className="my-4" />

                    {/* Formulário de Upload */}
                    <h4>Iniciar Automação (Enviar PDF)</h4>
                    <Form.Group controlId="formFile" className="mb-3">
                        <Form.Label>Selecione o arquivo PDF:</Form.Label>
                        <Form.Control
                            type="file" accept="application/pdf" onChange={handleFileChange}
                            disabled={isUploading || isStarting || !details.instance.enabled} ref={fileInputRef}
                         />
                    </Form.Group>
                    {isUploading && uploadProgress !== null && ( <ProgressBar animated now={uploadProgress} label={`${uploadProgress}%`} className="mb-3" /> )}
                    {uploadError && <Alert variant="danger" >{uploadError}</Alert>}

                     <Button variant="primary" onClick={handleUpload} disabled={!selectedFile || isUploading || isStarting || !details.instance.enabled}>
                         {isUploading ? <><Spinner as="span" size="sm" /> Enviando...</> : 'Enviar PDF e Iniciar'}
                     </Button>

                    {/* Feedback da chamada n8n */}
                    {startSuccess && <Alert variant="success" onClose={() => setStartSuccess(null)} dismissible className="mt-3">{startSuccess}</Alert>}
                    {startError && <Alert variant="danger" onClose={() => setStartError(null)} dismissible className="mt-3">{startError}</Alert>}

                     {/* Área de Resultado */}
                     <div className="mt-4">
                         <h5>Resultado</h5>
                          {/* TODO: Adicionar listener onSnapshot e exibir link de download */}
                         <p className="text-muted">Aguardando processamento...</p>
                         {/* Exemplo com dados do estado 'details' (precisa do listener):
                         {details.instance.status === 'completed' && details.instance.resultFileUrl && (
                             <Button variant="success" href={details.instance.resultFileUrl} target="_blank">
                                 Baixar Planilha XLSX
                             </Button>
                         )}
                         {details.instance.status === 'processing' && <Spinner size="sm"/> }
                         {details.instance.status === 'error' && <Alert variant="danger" size="sm">Erro no processamento.</Alert> }
                         */}
                     </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default AutomationDetailPage;