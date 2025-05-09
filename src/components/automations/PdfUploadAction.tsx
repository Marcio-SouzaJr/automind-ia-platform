// src/components/automations/PdfUploadAction.tsx
import React, { useState, useRef } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import ProgressBar from "react-bootstrap/ProgressBar";

import { useAuth } from "../../contexts/AuthContext";
import { app, storage } from "../../config/firebaseConfig";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTaskSnapshot,
} from "firebase/storage";
import { CompanyAutomation } from "../../services/firestoreService"; // Reutilizar interface

import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(app); 
// URL do Webhook para esta automação específica
const PDF_N8N_WEBHOOK_URL =
  "https://automind-ia.app.n8n.cloud/webhook/bfdd0c40-0430-4bc7-9b2e-fae837564d1f";

interface PdfUploadActionProps {
  instance: CompanyAutomation; // Instância da automação (contém config, id)
  onProcessingStart: () => void; // Callback para notificar o pai que iniciou
  onProcessingComplete: (success: boolean, message: string) => void; // Callback para resultado
}

const PdfUploadAction: React.FC<PdfUploadActionProps> = ({
  instance,
  onProcessingStart,
  onProcessingComplete,
}) => {
  const { currentUser, dbUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadError(null);
    } else {
      setSelectedFile(null);
    }
  };

  const triggerN8nWorkflow = async (pdfFileUrl: string) => {
    onProcessingStart(); // Notifica o pai
    if (
      !dbUser?.companyId ||
      !currentUser?.uid ||
      !PDF_N8N_WEBHOOK_URL ||
      PDF_N8N_WEBHOOK_URL.startsWith("COLE_SUA")
    ) {
      onProcessingComplete(
        false,
        "Erro interno de configuração (webhook PDF)."
      );
      return;
    }
    const payload = {
      triggeringUserId: currentUser.uid,
      companyId: dbUser.companyId,
      instanceId: instance.id,
      automationId: instance.automationId,
      config: instance.config,
      pdfUrl: pdfFileUrl,
    };
    try {
      const response = await fetch(PDF_N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Falha (Status ${response.status})`);
      }
      onProcessingComplete(true, "Processamento do relatório solicitado!");
    } catch (error: any) {
      onProcessingComplete(
        false,
        error.message || "Erro ao acionar automação PDF."
      );
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !currentUser || !dbUser?.companyId || !instance) {
        setUploadError("Selecione um arquivo PDF e garanta que os detalhes da automação foram carregados.");
        return;
    }
    if (selectedFile.type !== "application/pdf") {
         setUploadError("Por favor, selecione um arquivo PDF válido.");
         return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    onProcessingStart(); // Notifica o pai que o processo (upload) começou

    const timestamp = Date.now();
    // Caminho: uploads/userId/companyId/instanceId-timestamp-nomeoriginal.pdf
    const storagePath = `uploads/${currentUser.uid}/${dbUser.companyId}/${instance.id}-${timestamp}-${selectedFile.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on('state_changed',
        (snapshot: UploadTaskSnapshot) => { // Progresso
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
        },
        (error) => { // Erro no Upload
            console.error("PdfUploadAction: Erro no upload para o Firebase Storage:", error);
            let message = "Falha no upload do arquivo para o servidor.";
            if (error.code === 'storage/unauthorized') message = "Permissão negada para enviar o arquivo.";
            else if (error.code === 'storage/canceled') message = "Upload cancelado pelo usuário.";
            setUploadError(message);
            setIsUploading(false);
            setUploadProgress(null);
            onProcessingComplete(false, message); // Notifica o pai sobre a falha
        },
        () => { // Upload Concluído com Sucesso
          console.log("DEBUG: 'functions' no escopo do callback do upload?", typeof functions); // <-- LOG AQUI
            getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
              console.log("DEBUG: 'functions' no escopo do .then(getDownloadURL)?", typeof functions); // <-- LOG AQUI
                setIsUploading(false); // Upload em si terminou
                setUploadProgress(100); // Mantém barra em 100%

                // Limpa o input de arquivo
                if(fileInputRef.current) fileInputRef.current.value = "";
                setSelectedFile(null); // Limpa seleção

                // 1. Chamar Cloud Function para marcar como "processing" e limpar resultados antigos
                if (dbUser?.companyId && instance.id) {
                    console.log(`PdfUploadAction: Chamando Cloud Function 'markProcessing' para instanceId: ${instance.id}`);
                    const markProcessingFn = httpsCallable(functions, 'markProcessing');
                    try {
                        await markProcessingFn({ companyId: dbUser.companyId, instanceId: instance.id });
                        console.log("PdfUploadAction: Status marcado como 'processing' via Cloud Function.");

                        // 2. SOMENTE se marcou com sucesso, chama o n8n
                        await triggerN8nWorkflow(downloadURL); // triggerN8nWorkflow já chama onProcessingComplete

                    } catch (processingError: any) {
                        console.error("PdfUploadAction: Erro ao chamar Cloud Function 'markProcessing':", processingError);
                        const errorMessage = processingError.message || 'Erro ao atualizar status inicial da automação.';
                        setUploadError(errorMessage); // Mostra erro do markProcessing no local do uploadError
                        onProcessingComplete(false, `Falha ao iniciar processamento: ${errorMessage}`);
                    }
                } else {
                    console.error("PdfUploadAction: IDs faltando para chamar markProcessing (companyId ou instance.id).");
                    onProcessingComplete(false, "Erro interno: Não foi possível preparar a automação.");
                }
            }).catch(urlError => {
                console.error("PdfUploadAction: Erro ao obter URL de download do Storage:", urlError);
                setUploadError("Upload bem-sucedido, mas falha ao obter URL do arquivo.");
                setIsUploading(false); // Garante que isUploading é false
                onProcessingComplete(false, "Falha ao obter URL do arquivo após upload.");
            });
        }
    );
};

  if (!instance.enabled) {
    return <Alert variant="secondary">Esta automação está desabilitada.</Alert>;
  }

  return (
    <>
      <h4>Iniciar Automação (Enviar PDF)</h4>
      <Form.Group controlId="formFilePdf" className="mb-3">
        <Form.Label>Selecione o arquivo PDF:</Form.Label>
        <Form.Control
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={isUploading}
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
        disabled={!selectedFile || isUploading}
      >
        {isUploading ? (
          <>
            <Spinner as="span" size="sm" /> Enviando...
          </>
        ) : (
          "Enviar PDF e Iniciar"
        )}
      </Button>
    </>
  );
};
export default PdfUploadAction;
