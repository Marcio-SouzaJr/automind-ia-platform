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

 interface UpdatePayload {
    companyId: string;
    instanceId: string;      // ID da instância da automação (ex: 'envios-automaticos')
    // Campos para atualizar a INSTÂNCIA GERAL (após todo o loop n8n)
    instanceStatus?: 'completed' | 'error' | 'processing'; // Status geral da execução
    instanceLastRun?: string;    // ISO String da data
    instanceResultFileUrl?: string;
    instanceStoragePath?: string;
    instanceResultFileName?: string;
    instanceErrorMessage?: string;
    // Campos para atualizar UM CLIENTE ESPECÍFICO (dentro do loop n8n)
    clientId?: string;             // ID do cliente a ser atualizado
    clientWhatsappStatus?: 'sent' | 'failed' | 'pending' | string; // Status específico do Wpp
    clientEmailStatus?: 'sent' | 'failed' | 'pending' | string;    // Status específico do Email
    clientErrorMessage?: string;   // Erro específico do cliente
  }

  export const updateAutomationInstance = onCall(async (request) => {
    // Usar 'any' temporariamente para flexibilidade ou validar payload com mais rigor
    const data = request.data as UpdatePayload;
    logger.info("Recebida requisição para updateAutomationInstance:", data);
  
    // Validações básicas
    if (!data.companyId || !data.instanceId) {
      throw new HttpsError("invalid-argument", "companyId e instanceId são obrigatórios.");
    }
  
    try {
      // Determina se é uma atualização de cliente ou da instância geral
      if (data.clientId) {
        // --- ATUALIZAÇÃO DE CLIENTE ESPECÍFICO ---
        logger.info(`Atualizando status do cliente ${data.clientId} na instância ${data.instanceId}`);
        const clientDocRef = db.collection("companies").doc(data.companyId)
                               .collection("clients").doc(data.clientId);
  
        const clientUpdateData: { [key: string]: any } = {
            lastStatusUpdate: FieldValue.serverTimestamp() // Sempre atualiza o timestamp
        };
        if (data.clientWhatsappStatus) clientUpdateData.lastWhatsappStatus = data.clientWhatsappStatus;
        if (data.clientEmailStatus) clientUpdateData.lastEmailStatus = data.clientEmailStatus;
        if (data.clientErrorMessage) clientUpdateData.clientErrorMessage = data.clientErrorMessage;
         else clientUpdateData.clientErrorMessage = FieldValue.delete(); // Limpa erro se não enviado
  
        await clientDocRef.update(clientUpdateData);
        logger.info(`Status do cliente ${data.clientId} atualizado.`);
        return { success: true, message: "Status do cliente atualizado." };
  
      } else if (data.instanceStatus) {
        // --- ATUALIZAÇÃO DA INSTÂNCIA GERAL ---
        logger.info(`Atualizando status geral da instância ${data.instanceId}`);
        const instanceDocRef = db.collection("companies").doc(data.companyId)
                                 .collection("company_automations").doc(data.instanceId);
  
        const instanceUpdateData: { [key: string]: any } = {
            status: data.instanceStatus,
        };
        if (data.instanceLastRun) { try { instanceUpdateData.lastRun = Timestamp.fromDate(new Date(data.instanceLastRun)); } catch(e){ logger.warn("lastRun inválido"); } }
        if (data.instanceResultFileUrl) { instanceUpdateData.resultFileUrl = data.instanceResultFileUrl; }
        if (data.instanceStoragePath) { instanceUpdateData.storagePath = data.instanceStoragePath; }
        if (data.instanceResultFileName) { instanceUpdateData.resultFileName = data.instanceResultFileName; }
        if (data.instanceErrorMessage) { instanceUpdateData.errorMessage = data.instanceErrorMessage; }
        else if (data.instanceStatus !== 'error') { instanceUpdateData.errorMessage = FieldValue.delete(); }
  
        await instanceDocRef.update(instanceUpdateData);
        logger.info(`Status geral da instância ${data.instanceId} atualizado.`);
        return { success: true, message: "Status da automação atualizado." };
  
      } else {
         logger.warn("Nenhum dado de atualização válido fornecido (nem cliente, nem instância).", data);
         throw new HttpsError("invalid-argument", "Dados insuficientes para atualização.");
      }
  
    } catch (error: any) {
      logger.error(`Erro ao atualizar Firestore (${data.companyId}/${data.instanceId}):`, error);
      throw new HttpsError("internal", "Falha ao atualizar Firestore.", error.message);
    }
  });