// src/pages/AutomationDetailPage.tsx

import  { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";

import { useAuth } from "../contexts/AuthContext";
import {
  getCompanyAutomationDetails,
  CombinedAutomationDetails,
  CompanyAutomation,
} from "../services/firestoreService";
import { db } from "../config/firebaseConfig"; // Importar db para onSnapshot
import { onSnapshot, doc } from "firebase/firestore";
import { storage } from "../config/firebaseConfig"; // Importar storage para download
import {
  ref,
  
  getDownloadURL,
  
} from "firebase/storage";

// Importar Componentes de Ação Específicos
import PdfUploadAction from "../components/automations/PdfUploadAction";
import StartEnvoysAction from "../components/automations/StartEnvoysAction";
import PaymentReminderSettings from '../components/automations/PaymentReminderSettings'; // SEU NOVO COMPONENTE



// IDs dos Templates (Substitua pelos IDs reais do seu Firestore)
const PDF_PROCESSOR_TEMPLATE_ID = "v192SC7bpgR4nNooJMKc"; // Ex: ID do "Relatorio Piramide > XLSX"
const ENVOYS_TEMPLATE_ID = "WOIjGQMkLSB3NTgas2OF"; // Ex: ID do "Envios Automáticos"
const PAYMENT_REMINDER_TEMPLATE_ID = "MGGct7RZTCgk2eWwDpb4"; // SEU NOVO ID


const AutomationDetailPage = () => {
  const { automationInstanceId } = useParams<{
    automationInstanceId: string;
  }>();
  const navigate = useNavigate();
  const {  dbUser } = useAuth();

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

  // Estados para feedback da AÇÃO da automação
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Estados para o Download (agora são usados por handleDownloadResult)
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialDetails = async () => {
      if (!automationInstanceId || !dbUser?.companyId) {
        setErrorInitial("Informações da automação ou empresa não encontradas.");
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
          setErrorInitial(
            `Detalhes não encontrados para a automação "${automationInstanceId}".`
          );
        }
      } catch (err) {
        setErrorInitial("Erro ao carregar detalhes iniciais da automação.");
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchInitialDetails();
  }, [automationInstanceId, dbUser]);

  useEffect(() => {
    if (!automationInstanceId || !dbUser?.companyId) {
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
          setErrorInstance(
            "Configuração desta automação foi removida ou não existe."
          );
        }
        setLoadingInstance(false);
      },
      (error) => {
        console.error("Erro no listener onSnapshot:", error);
        setErrorInstance("Erro ao monitorar status da automação.");
        setInstanceData(null);
        setLoadingInstance(false);
      }
    );
    return () => unsubscribe();
  }, [automationInstanceId, dbUser?.companyId]);

  const handleProcessingStart = () => {
    setActionInProgress(true);
    setActionMessage(null);
  };

  const handleProcessingComplete = (success: boolean, message: string) => {
    setActionInProgress(false);
    setActionMessage({ type: success ? "success" : "error", text: message });
  };

  const handleDownloadResult = async () => {
    const currentInstance = instanceData; // Usar dados do listener
    if (!currentInstance) {
      setDownloadError("Dados da instância não disponíveis.");
      return;
    }

    let filePathToDownload: string | null | undefined = null;
    if (currentInstance.storagePath) {
      filePathToDownload = currentInstance.storagePath;
    } else if (currentInstance.resultFileUrl) {
      try {
        const urlObject = new URL(currentInstance.resultFileUrl);
        const pathSegments = urlObject.pathname.split("/o/");
        if (pathSegments.length > 1) {
          filePathToDownload = decodeURIComponent(
            pathSegments[1].split("?")[0]
          );
        }
      } catch (e) {
        console.error("Erro ao parsear resultFileUrl:", e);
      }
    }

    const fileNameToUse =
      currentInstance.resultFileName ||
      (filePathToDownload
        ? filePathToDownload.substring(filePathToDownload.lastIndexOf("/") + 1)
        : "resultado.xlsx");

    if (!filePathToDownload) {
      setDownloadError("Caminho do arquivo de resultado não encontrado.");
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);
    try {
      const fileRef = ref(storage, filePathToDownload);
      const url = await getDownloadURL(fileRef);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileNameToUse);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      if (error.code === "storage/object-not-found")
        setDownloadError("Arquivo não encontrado.");
      else if (error.code === "storage/unauthorized")
        setDownloadError("Sem permissão para baixar.");
      else setDownloadError("Erro ao baixar o resultado.");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderAutomationActionBlock = () => {
    if (loadingInitial || loadingInstance || !details || !instanceData) {
      return (
        <div className="text-center my-3">
          <Spinner animation="border" size="sm" /> Carregando ações...
        </div>
      );
    }
    if (!instanceData) {
      return (
        <Alert variant="warning">
          Configuração da automação não encontrada.
        </Alert>
      );
    }

    const templateId = details.template.id || instanceData.automationId;
    switch (templateId) {
      case PDF_PROCESSOR_TEMPLATE_ID:
        return (
          <PdfUploadAction
            instance={instanceData}
            onProcessingStart={handleProcessingStart}
            onProcessingComplete={handleProcessingComplete}
          />
        );
      case ENVOYS_TEMPLATE_ID:
        return (
            <StartEnvoysAction
                instance={instanceData}
                companyId={dbUser?.companyId || ""} // Passa companyId como prop, garantindo que não seja null
                onProcessingStart={handleProcessingStart}
                onProcessingComplete={handleProcessingComplete}
            />
        );
         case PAYMENT_REMINDER_TEMPLATE_ID: // Usando a constante definida
        return (
            <PaymentReminderSettings
                instanceId={instanceData.id}
            />
        );
      default:
        return (
          <Alert variant="info" className="mt-3">
            Nenhuma ação interativa específica configurada para esta automação.
            As configurações e o status são exibidos nesta página.
          </Alert>
        );
    }
  };

  if (loadingInitial)
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  if (errorInitial)
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <h4>Erro ao Carregar</h4>
          <p>{errorInitial}</p>
        </Alert>
        <Button variant="secondary" onClick={() => navigate("/automations")}>
          ← Voltar
        </Button>
      </Container>
    );
  if (!details)
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          Detalhes da automação não puderam ser carregados.
        </Alert>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => navigate("/automations")}
        >
          ← Voltar
        </Button>
      </Container>
    );

  const currentInstanceData = instanceData || details.instance;

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
            <h2 className="h3 mb-0">{details.template.name}</h2>
            <Badge bg={currentInstanceData.enabled ? "success" : "secondary"}>
              {currentInstanceData.enabled ? "Habilitada" : "Desabilitada"}
            </Badge>
          </div>
          <small className="text-muted">
            Automação (Template ID): {details.template.id} / Instância (Doc ID):{" "}
            {currentInstanceData.id}
          </small>
        </Card.Header>
        <Card.Body>
          <p>{details.template.description}</p>
          <p>
            <strong>Status Atual:</strong>{" "}
            {currentInstanceData.status || "Indefinido"}
          </p>
          {currentInstanceData.lastRun && (
            <p>
              <small>
                <strong>Última Execução:</strong>{" "}
                {currentInstanceData.lastRun.toDate().toLocaleString()}
              </small>
            </p>
          )}

          <hr className="my-4" />

          {renderAutomationActionBlock()}

          {actionInProgress && (
            <div className="text-center mt-3">
              <Spinner animation="border" size="sm" /> Processando sua
              solicitação...
            </div>
          )}
          {actionMessage && (
            <Alert
              variant={actionMessage.type}
              onClose={() => setActionMessage(null)}
              dismissible
              className="mt-3"
            >
              {actionMessage.text}
            </Alert>
          )}

          <div className="mt-4">
            <h5>Resultado</h5>
            {loadingInstance && !instanceData && (
              <p>
                <Spinner size="sm" /> Monitorando status...
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
                    );
                  case "completed":
                    const canDownload =
                      instanceData.storagePath || instanceData.resultFileUrl;
                    return canDownload ? (
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
                  default:
                    return (
                      <p className="text-muted">
                        Aguardando início ou nova execução.
                      </p>
                    );
                }
              })()}
            {!loadingInstance && !errorInstance && !instanceData && (
              <p className="text-muted">Status da automação indisponível.</p>
            )}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AutomationDetailPage;
