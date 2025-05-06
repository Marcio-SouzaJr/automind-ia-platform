// functions/src/index.ts

import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https"; // Usar v2
import * as admin from "firebase-admin";

// Inicializar Admin SDK
admin.initializeApp();
const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;
const FieldValue = admin.firestore.FieldValue;

// --- Interface para Payload da Função de Atualização (Existente) ---
interface UpdateAutomationPayload {
  companyId: string;
  instanceId: string;
  status: string;
  lastRun?: string;
  resultFileUrl?: string;
  storagePath?: string;   // Adicionar se o n8n for salvar isso
  resultFileName?: string;// Adicionar se o n8n for salvar isso
  errorMessage?: string;
}

// --- Função 1: Atualizar Instância de Automação (Chamada pelo N8N) --- (Existente e Corrigida)
export const updateAutomationInstance = onCall(async (request) => {
  const data = request.data as UpdateAutomationPayload;
  logger.info("Recebida requisição para updateAutomationInstance:", data);

  if (!data.companyId || !data.instanceId || !data.status) {
    throw new HttpsError("invalid-argument","companyId, instanceId e status são obrigatórios.");
  }

  try {
    const instanceDocRef = db.collection("companies").doc(data.companyId)
                             .collection("company_automations").doc(data.instanceId);

    const updateData: { [key: string]: any } = { status: data.status };
    if (data.lastRun) { try { updateData.lastRun = Timestamp.fromDate(new Date(data.lastRun)); } catch (e) { logger.warn("lastRun inválido");} }
    if (data.resultFileUrl) { updateData.resultFileUrl = data.resultFileUrl; }
    if (data.storagePath) { updateData.storagePath = data.storagePath; } // Salvar storagePath
    if (data.resultFileName) { updateData.resultFileName = data.resultFileName; } // Salvar nome do arquivo
    if (data.errorMessage) { updateData.errorMessage = data.errorMessage; }
    else if (data.status !== 'error') { updateData.errorMessage = FieldValue.delete(); }

    await instanceDocRef.update(updateData);
    logger.info("Documento atualizado com sucesso!");
    return { success: true, message: "Status atualizado." };
  } catch (error: any) {
    logger.error(`Erro ao atualizar Firestore (${data.companyId}/${data.instanceId}):`, error);
    throw new HttpsError("internal", "Falha ao atualizar status.", error.message);
  }
});


// --- Interface para Payload da Função de Validação de Código ---
interface ValidateCompanyCodePayload {
    companyCode: string;
}

// --- Função 2: Validar Código da Empresa (Chamada pelo Frontend no Cadastro) --- (NOVA)
export const validateCompanyCode = onCall(async (request) => {
    const data = request.data as ValidateCompanyCodePayload;
    logger.info("Recebida requisição para validateCompanyCode:", data);

    if (!data.companyCode) {
        throw new HttpsError("invalid-argument", "O código da empresa é obrigatório.");
    }

    try {
        const companiesRef = db.collection('companies');
        const q = companiesRef.where("accessCode", "==", data.companyCode).limit(1);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
            const companyDoc = querySnapshot.docs[0];
            logger.info(`Código ${data.companyCode} validado para empresa ${companyDoc.id}`);
            // Retorna o ID da empresa se o código for válido
            return { success: true, companyId: companyDoc.id };
        } else {
            logger.warn(`Código ${data.companyCode} não encontrado.`);
            // Lança erro específico se não encontrado
            throw new HttpsError("not-found", "Código da empresa inválido ou não encontrado.");
        }
    } catch (error: any) {
         // Se for um HttpsError já lançado (not-found), repassa
         if (error.code === 'not-found') {
            throw error;
         }
         // Para outros erros (ex: problema de conexão com Firestore)
        logger.error(`Erro ao validar código ${data.companyCode}:`, error);
        throw new HttpsError("internal", "Falha ao validar o código da empresa.", error.message);
    }
});


// --- Função 3: Marcar Automação como Processando (Chamada pelo Frontend após Upload) --- (Opcional, mas Recomendada)
interface MarkProcessingPayload {
    companyId: string;
    instanceId: string;
}

export const markProcessing = onCall(async (request) => {
    const data = request.data as MarkProcessingPayload;
     if (!data.companyId || !data.instanceId) { throw new HttpsError("invalid-argument", "IDs são obrigatórios."); }
     logger.info(`Marcando ${data.instanceId} como 'processing' para ${data.companyId}`);
     try {
         const instanceDocRef = db.collection("companies").doc(data.companyId)
                                  .collection("company_automations").doc(data.instanceId);
         await instanceDocRef.update({
             status: "processing",
             resultFileUrl: FieldValue.delete(),
             storagePath: FieldValue.delete(),
             errorMessage: FieldValue.delete(),
             lastRun: FieldValue.serverTimestamp() // Marca início do processamento
         });
         logger.info("Status atualizado para 'processing'.");
         return { success: true };
     } catch (error: any) {
         logger.error(`Erro ao marcar ${data.instanceId} como 'processing':`, error);
         throw new HttpsError("internal", "Falha ao atualizar status inicial.");
     }
 });