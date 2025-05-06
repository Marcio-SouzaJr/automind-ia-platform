// src/pages/AutomationDetailPage.tsx (Versão Cliente Final - Sem update de status pelo frontend)

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import Form from "react-bootstrap/Form";
import ProgressBar from "react-bootstrap/ProgressBar";

import { useAuth } from "../contexts/AuthContext";
// Importar funções e tipos necessários (NÃO precisamos mais de markAutomationAsProcessing aqui)
import {
  getCompanyAutomationDetails,
  CombinedAutomationDetails,
  CompanyAutomation,
} from "../services/firestoreService";
import { db } from "../config/firebaseConfig";
import { onSnapshot, doc } from "firebase/firestore";
import { storage } from "../config/firebaseConfig";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTaskSnapshot,
} from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions"; // <-- Importar
import { app } from "../config/firebaseConfig"; // <-- Importar app

const functions = getFunctions(app);

// URL do Webhook N8N (Substitua!)
const N8N_WEBHOOK_URL =
  "https://automind-ia.app.n8n.cloud/webhook/bfdd0c40-0430-4bc7-9b2e-fae837564d1f";

const AutomationDetailPage = () => {
  console.log("--- AutomationDetailPage: INÍCIO RENDER ---"); // LOG 1

  const { automationInstanceId } = useParams<{
    automationInstanceId: string;
  }>();
  console.log("--- AutomationDetailPage: automationInstanceId da URL =", automationInstanceId); // LOG 2
  const navigate = useNavigate();
  const { currentUser, dbUser } = useAuth();
  console.log("--- AutomationDetailPage: dbUser =", dbUser); // LOG 3


  // Estados (como antes)
  const [details, setDetails] = useState<CombinedAutomationDetails | null>(
    null
  );
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [errorInitial, setErrorInitial] = useState<string | null>(null);
  const [instanceData, setInstanceData] = useState<CompanyAutomation | null>(
    null
  );
  const [loadingInstance, setLoadingInstance] = useState<boolean>(true);
  const [errorInstance, setErrorInstance] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [startSuccess, setStartSuccess] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Efeito para buscar detalhes iniciais
  useEffect(() => {
    console.log("--- AutomationDetailPage: useEffect[fetchInitialDetails] Disparado. automationInstanceId =", automationInstanceId, "dbUser?.companyId =", dbUser?.companyId); // LOG 4

    const fetchInitialDetails = async () => {
      if (!automationInstanceId || !dbUser?.companyId) {
        console.log("--- AutomationDetailPage: fetchInitialDetails - IDs FALTANDO, retornando."); // LOG 5

        setErrorInitial("Informações não encontradas.");
        setLoadingInitial(false);
        return;
      }
      setLoadingInitial(true);
      setErrorInitial(null);
      setDetails(null);
      setInstanceData(null);
      try {
        const fetchedDetails = await getCompanyAutomationDetails(
          dbUser.companyId,
          automationInstanceId
        );
        if (fetchedDetails) {
          setDetails(fetchedDetails);
          setInstanceData(fetchedDetails.instance);
        } else {
          setErrorInitial(`Detalhes não encontrados.`);
        }
      } catch (err) {
        setErrorInitial("Erro ao carregar detalhes.");
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchInitialDetails();
  }, [automationInstanceId, dbUser]);

  // Efeito para o Listener onSnapshot
  useEffect(() => {
    console.log("--- AutomationDetailPage: useEffect[onSnapshot] Disparado. automationInstanceId =", automationInstanceId, "dbUser?.companyId =", dbUser?.companyId); // LOG 6

    if (!automationInstanceId || !dbUser?.companyId) {
      console.log("--- AutomationDetailPage: onSnapshot - IDs FALTANDO, retornando."); // LOG 7

      setLoadingInstance(false);
      return () => {};
    }
    setLoadingInstance(true);
    setErrorInstance(null);
    const instanceDocRef = doc(
      db,
      "companies",
      dbUser.companyId,
      "company_automations",
      automationInstanceId
    );
    const unsubscribe = onSnapshot(
      instanceDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const updatedData = {
            id: docSnap.id,
            ...docSnap.data(),
          } as CompanyAutomation;
          setInstanceData(updatedData);
          setErrorInstance(null);
        } else {
          setInstanceData(null);
          setErrorInstance("Configuração removida.");
        }
        setLoadingInstance(false);
      },
      (error) => {
        console.error("Erro no listener:", error);
        setErrorInstance("Erro ao monitorar.");
        setInstanceData(null);
        setLoadingInstance(false);
      }
    );
    return () => unsubscribe();
  }, [automationInstanceId, dbUser?.companyId]);

  // --- Funções de Upload ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadError(null);
      setStartSuccess(null);
      setStartError(null);
      setDownloadError(null);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = () => {
    if (
      !selectedFile ||
      !currentUser ||
      !dbUser?.companyId ||
      !details ||
      !automationInstanceId
    ) {
      setUploadError("Selecione um PDF e aguarde os detalhes carregarem.");
      return;
    }
    if (selectedFile.type !== "application/pdf") {
      setUploadError("Selecione um arquivo PDF.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setStartSuccess(null);
    setStartError(null);
    setDownloadError(null);

    const timestamp = Date.now();
    const storagePath = `uploads/${currentUser.uid}/${dbUser.companyId}/${details.instance.id}-${timestamp}-${selectedFile.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Erro upload:", error);
        setUploadError("Falha no upload.");
        setIsUploading(false);
        setUploadProgress(null);
      },
      () => {
        // Sucesso Upload
        getDownloadURL(uploadTask.snapshot.ref)
          .then(async (downloadURL) => {
            setIsUploading(false);
            setUploadProgress(100);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setSelectedFile(null);

            // --- 👇 Chamar Cloud Function markProcessing 👇 ---
            if (dbUser?.companyId && automationInstanceId) {
              console.log("Chamando CF markProcessing...");
              const markFn = httpsCallable(functions, "markProcessing"); // Referência da função
              try {
                // Chama a Cloud Function
                await markFn({
                  companyId: dbUser.companyId,
                  instanceId: automationInstanceId,
                });
                console.log(
                  "Status marcado como 'processing' via Cloud Function."
                );
                // SOMENTE se marcou com sucesso, chama o n8n
                triggerN8nWorkflow(downloadURL);
              } catch (statusError: any) {
                console.error(
                  "Erro ao chamar markProcessing function:",
                  statusError
                );
                setStartError(
                  `Falha ao iniciar: ${
                    statusError.message || "Erro ao atualizar status inicial."
                  }`
                );
                // Não chamar triggerN8nWorkflow se falhar aqui
              }
            } else {
              console.error(
                "Não foi possível marcar como processing: IDs faltando."
              );
              setStartError(
                "Erro interno: Não foi possível obter IDs necessários."
              );
            }
            // ---------------------------------------------
          })
          .catch((urlError) => {
            console.error("Erro URL:", urlError);
            setUploadError("Falha ao obter URL.");
            setIsUploading(false);
            setUploadProgress(null);
          });
      }
    );
  };

  // --- Função Acionar n8n ---
  const triggerN8nWorkflow = async (pdfFileUrl: string) => {
    // Recebe URL do PDF como argumento

    // 1. Log inicial e verificação de dados essenciais
    console.log("Iniciando triggerN8nWorkflow...");
    if (
      !details ||
      !dbUser?.companyId ||
      !currentUser?.uid ||
      !N8N_WEBHOOK_URL ||
      N8N_WEBHOOK_URL.startsWith(
        "COLE_SUA"
      )
    ) {
      console.error(
        "triggerN8nWorkflow: Erro de configuração ou dados faltando.",
        {
          hasDetails: !!details,
          hasCompanyId: !!dbUser?.companyId,
          hasUid: !!currentUser?.uid,
          hasWebhookUrl: !!N8N_WEBHOOK_URL,
          isPlaceholderUrl: N8N_WEBHOOK_URL.startsWith("COLE_SUA"),
        }
      );
      setStartError("Erro interno de configuração para iniciar a automação.");
      return; // Interrompe a execução
    }
    // Verifica se a URL do PDF foi recebida corretamente
    if (!pdfFileUrl) {
      console.error("triggerN8nWorkflow: pdfFileUrl está vazia ou indefinida!");
      setStartError("Erro interno: URL do arquivo PDF não foi fornecida.");
      return; // Interrompe a execução
    }

    // 2. Definir estados de loading e limpar erros/sucessos anteriores
    setIsStarting(true);
    setStartError(null);
    setStartSuccess(null);

    // 3. Montar o objeto de payload para enviar ao n8n
    const payload = {
      triggeringUserId: currentUser.uid, // ID do usuário que iniciou
      companyId: dbUser.companyId, // ID da empresa
      instanceId: details.instance.id, // ID da instância específica da automação
      automationId: details.instance.automationId, // ID do template da automação
      config: details.instance.config, // Objeto de configuração específico
      pdfUrl: pdfFileUrl, // URL de download do PDF no Storage
      // Adicione mais campos aqui se o seu workflow n8n precisar
    };

    // 4. Logar o que será enviado
    console.log("Enviando para n8n URL:", N8N_WEBHOOK_URL);
    console.log("Enviando para n8n Payload:", JSON.stringify(payload, null, 2)); // Log formatado

    try {
      // 5. Fazer a requisição POST para o Webhook
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Adicionar outros cabeçalhos se necessário (ex: autenticação do webhook)
        },
        body: JSON.stringify(payload), // Enviar o payload como JSON string
      });

      // 6. Verificar a resposta do n8n
      if (!response.ok) {
        // Tentar ler o corpo da resposta de erro
        let errorBody = `Status: ${response.status} ${response.statusText}`;
        try {
          errorBody = await response.text(); // Tenta ler como texto
        } catch (e) {
          /* Ignora erro na leitura do corpo */
        }
        console.error("Erro na resposta do n8n:", errorBody);
        throw new Error(
          `Falha ao acionar a automação (${response.status}). Verifique o n8n.`
        );
      }

      // 7. Sucesso - processar resposta (opcional) e definir estado de sucesso
      const responseData = await response.json(); // Assume que n8n responde com JSON
      console.log("Resposta n8n:", responseData); // Ex: { message: "Workflow was started" }
      setStartSuccess("Processamento da automação solicitado com sucesso!");
      // Nota: Neste ponto, o n8n apenas CONFIRMOU o recebimento.
      // A atualização real do status/resultado virá pelo listener onSnapshot.
    } catch (error: any) {
      // Captura erros do fetch (rede) ou erros lançados acima
      console.error("Erro ao chamar webhook n8n:", error);
      setStartError(
        error.message || "Erro de comunicação ao tentar iniciar a automação."
      );
    } finally {
      // 8. Finalizar o estado de loading da ação
      setIsStarting(false);
    }
  };

  // --- Função Download ---
  const handleDownloadResult = async () => {
    console.log("handleDownloadResult: Iniciado."); // Log 1: Função chamada?

    // Usa os dados mais recentes da instância (do listener onSnapshot)
    const instance = instanceData; // Não precisa mais do fallback para 'details' aqui se a UI mostra o botão

    // Tenta obter o caminho do arquivo. Prioriza 'storagePath' se existir,
    // senão tenta extrair da 'resultFileUrl' (mediaLink).
    let filePathToDownload: string | null | undefined = null;
    if (instance?.storagePath) {
        filePathToDownload = instance.storagePath;
    } else if (instance?.resultFileUrl) {
        try {
            // Tenta extrair o caminho da URL (remove o início e os query params)
            // Ex: https://storage.googleapis.com/download/storage/v1/b/bucket/o/results%2Fcomp%2Finst%2Ffile.xlsx?alt=media&token=...
            // Queremos: results/comp/inst/file.xlsx
            const urlObject = new URL(instance.resultFileUrl);
            const pathSegments = urlObject.pathname.split('/o/');
            if (pathSegments.length > 1) {
                filePathToDownload = decodeURIComponent(pathSegments[1]); // Decodifica caracteres como %2F
            }
        } catch (e) {
            console.error("Erro ao parsear resultFileUrl:", e);
        }
    }

    // 👇 Log 2: Caminho do arquivo determinado 👇
    console.log("handleDownloadResult: Caminho do arquivo determinado:", filePathToDownload);

    // Define o nome do arquivo para o atributo download
    const fileNameToUse = instance?.resultFileName || 'resultado_automind.xlsx'; // Usa nome salvo ou um padrão

    // Verifica se conseguiu obter um caminho válido
    if (!filePathToDownload) {
        console.error("handleDownloadResult: Não foi possível determinar o caminho do arquivo a partir de instanceData:", instance);
        setDownloadError("Não foi possível encontrar o caminho do arquivo de resultado.");
        return; // Interrompe se não tem caminho
    }

    // Inicia estado de loading e limpa erros
    setIsDownloading(true);
    setDownloadError(null);
    console.log(`handleDownloadResult: Tentando obter URL de download para: ${filePathToDownload}`); // Log 3

    try {
        // 1. Criar referência ao arquivo no Storage usando o caminho completo
        const fileRef = ref(storage, filePathToDownload);

        // 2. Obter a URL de Download válida no momento (o SDK cuida da autenticação/token)
        const url = await getDownloadURL(fileRef);
        console.log("handleDownloadResult: URL de Download obtida:", url); // Log 4

        // 3. Forçar o download criando um link temporário e clicando nele
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileNameToUse); // Define o nome do arquivo
        document.body.appendChild(link); // Adiciona ao DOM
        link.click();                   // Simula o clique
        document.body.removeChild(link); // Remove o link do DOM
        console.log("handleDownloadResult: Download iniciado via link simulado."); // Log 5

    } catch (error: any) {
        // Captura erros do getDownloadURL (ex: permissão, não encontrado)
        console.error("handleDownloadResult: Erro ao obter URL ou iniciar download:", error);
        if (error.code === 'storage/object-not-found') {
            setDownloadError("Erro: Arquivo de resultado não encontrado no armazenamento.");
        } else if (error.code === 'storage/unauthorized') {
            setDownloadError("Erro: Você não tem permissão para baixar este arquivo.");
        } else {
            setDownloadError("Erro desconhecido ao tentar baixar o resultado.");
        }
    } finally {
        // Finaliza o estado de loading do botão
        setIsDownloading(false);
        console.log("handleDownloadResult: Finalizado."); // Log 6
    }
};

  // --- Renderização ---
  console.log("--- AutomationDetailPage: ANTES dos returns condicionais", {loadingInitial, errorInitial, details}); // LOG 8

  if (loadingInitial) {
    /* ... */
  }
  if (errorInitial) {
    /* ... */
  }
  if (!details) {
    /* ... */
  }

  console.log("--- AutomationDetailPage: RENDERIZANDO JSX PRINCIPAL"); // LOG 9

  const currentInstanceData = instanceData || details?.instance;

  return (
    <Container>
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={() => navigate("/automations")}
        className="mb-3"
      >
        ← Voltar
      </Button>

      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="h3 mb-0">{details?.template.name}</h2>
            <Badge bg={currentInstanceData?.enabled ? "success" : "secondary"}>
              {currentInstanceData?.enabled ? "Habilitada" : "Desabilitada"}
            </Badge>
          </div>
          <small className="text-muted">
            Automação: {details?.template.id} / Instância:{" "}
            {currentInstanceData?.id}
          </small>
        </Card.Header>
        <Card.Body>
          <p>{details?.template.description}</p>
          <p>
            <strong>Status Atual:</strong>{" "}
            {currentInstanceData?.status || "Indefinido"}
          </p>
          {currentInstanceData?.lastRun && (
            <p>
              <small>
                <strong>Última Execução:</strong>{" "}
                {currentInstanceData.lastRun.toDate().toLocaleString()}
              </small>
            </p>
          )}

          <hr className="my-4" />

          <h4>Iniciar Automação (Enviar PDF)</h4>
          <Form.Group controlId="formFile" className="mb-3">
            <Form.Label>Selecione o arquivo PDF:</Form.Label>
            <Form.Control
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={
                isUploading || isStarting || !currentInstanceData?.enabled
              }
              ref={fileInputRef}
            />
          </Form.Group>
          {isUploading && uploadProgress !== null && (
            <ProgressBar
              animated
              now={uploadProgress}
              label={`${uploadProgress}%`}
              className="mb-3"
            />
          )}
          {uploadError && <Alert variant="danger">{uploadError}</Alert>}
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={
              !selectedFile ||
              isUploading ||
              isStarting ||
              !currentInstanceData?.enabled
            }
          >
            {isUploading ? (
              <>
                <Spinner as="span" size="sm" /> Enviando...
              </>
            ) : (
              "Enviar PDF e Iniciar"
            )}
          </Button>

          {startSuccess && (
            <Alert
              variant="success"
              onClose={() => setStartSuccess(null)}
              dismissible
              className="mt-3"
            >
              {startSuccess}
            </Alert>
          )}
          {startError && (
            <Alert
              variant="danger"
              onClose={() => setStartError(null)}
              dismissible
              className="mt-3"
            >
              {startError}
            </Alert>
          )}

          <div className="mt-4">
            <h5>Resultado</h5>
            {loadingInstance && (
              <p>
                <Spinner size="sm" /> Monitorando...
              </p>
            )}
            {errorInstance && <Alert variant="danger">{errorInstance}</Alert>}
            {!loadingInstance &&
              !errorInstance &&
              instanceData &&
              (() => {
                switch (instanceData.status?.toLowerCase()) {
                  case "processing":
                  case "running":
                    return (
                      <div>
                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-2"
                        />{" "}
                        Processando...
                      </div>
                    ); // Corrigido <p> aninhado
                  case "completed":
                    const filePath =
                      instanceData.storagePath ||
                      (instanceData.resultFileUrl
                        ? new URL(instanceData.resultFileUrl).pathname
                            .split("/o/")[1]
                            ?.split("?")[0]
                        : null);
                    return filePath ? (
                      <>
                        <Button
                          variant="success"
                          onClick={handleDownloadResult}
                          disabled={isDownloading}
                        >
                          {isDownloading ? (
                            <Spinner as="span" size="sm" />
                          ) : (
                            "Baixar Resultado XLSX"
                          )}
                        </Button>
                        {downloadError && (
                          <Alert variant="danger" className="mt-2">
                            {downloadError}
                          </Alert>
                        )}
                      </>
                    ) : (
                      <Alert variant="warning">
                        Completo, mas link indisponível.
                      </Alert>
                    );
                  case "error":
                    return (
                      <Alert variant="danger">
                        {instanceData.errorMessage || "Erro no processamento."}
                      </Alert>
                    );
                  default: // idle, paused, etc.
                    return (
                      <p className="text-muted">
                        Aguardando início ou nova execução.
                      </p>
                    );
                }
              })()}
            {!loadingInstance && !errorInstance && !instanceData && (
              <p className="text-muted">Status indisponível.</p>
            )}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AutomationDetailPage;
