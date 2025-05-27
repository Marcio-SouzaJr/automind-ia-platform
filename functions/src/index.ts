// functions/src/index.ts

import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https"; // Usar v2
import * as admin from "firebase-admin";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler"; // Importar ScheduledEvent

// Inicializar Admin SDK
if (admin.apps.length === 0) { // Evitar reinicialização
  admin.initializeApp();
}
const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;
const FieldValue = admin.firestore.FieldValue;

// Constantes para a Automação de Lembretes (se for diferente da de Envios)
const PAYMENT_REMINDER_AUTOMATION_ID = "MGGct7RZTCgk2eWwDpb4";
const N8N_PAYMENT_REMINDER_WEBHOOK_URL = "https://automind-ia.app.n8n.cloud/webhook-test/8de937f2-8de5-4698-a05c-75998ba45258"; // Substitua se for usar

// --- Interface para Payload da Função de Validação de Código ---
interface ValidateCompanyCodePayload {
    companyCode: string;
}

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
            return { success: true, companyId: companyDoc.id };
        } else {
            logger.warn(`Código ${data.companyCode} não encontrado.`);
            throw new HttpsError("not-found", "Código da empresa inválido ou não encontrado.");
        }
    } catch (error: any) {
         if (error.code === 'not-found') {
            throw error;
         }
        logger.error(`Erro ao validar código ${data.companyCode}:`, error);
        throw new HttpsError("internal", "Falha ao validar o código da empresa.", error.message);
    }
});

// --- Função: Marcar Automação como Processando ---
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
             resultFileUrl: FieldValue.delete(), // Limpa resultados anteriores
             storagePath: FieldValue.delete(),
             resultFileName: FieldValue.delete(),
             errorMessage: FieldValue.delete(),
             lastRunDetails: FieldValue.delete(), // Limpa detalhes da última execução
             lastRun: FieldValue.serverTimestamp() // Marca início do processamento
         });
         logger.info("Status atualizado para 'processing' e campos de resultado limpos.");
         return { success: true };
     } catch (error: any) {
         logger.error(`Erro ao marcar ${data.instanceId} como 'processing':`, error);
         throw new HttpsError("internal", "Falha ao atualizar status inicial da automação.");
     }
 });

// --- Interface para Payload da Função de Atualização ---
interface UpdatePayload {
  companyId: string;
  instanceId: string;
  // Campos para atualizar a INSTÂNCIA GERAL
  instanceStatus?: 'completed_batch' | 'error_batch' | 'processing' | 'completed_daily_check' | 'error_daily_check' | 'completed' | 'error'; // Adicionado novos status
  instanceLastRun?: string;    // ISO String da data
  instanceResultFileUrl?: string;
  instanceStoragePath?: string;
  instanceResultFileName?: string;
  instanceErrorMessage?: string;
  instanceLastRunDetails?: object; // <<<<<<< NOVO CAMPO PARA KPIs
  // Campos para atualizar UM CLIENTE ESPECÍFICO
  clientId?: string;
  clientWhatsappStatus?: string;
  clientEmailStatus?: string;
  clientErrorMessage?: string;
  // Campos específicos para o webhook Mailgun (se usar esta função)
  clientLastPaymentReminderEmailStatusEvent?: string;
  clientLastPaymentReminderEmailEventTimestamp?: string; // Pode ser string ISO ou já convertido para Timestamp
  clientLastPaymentReminderEmailRecipient?: string;
  clientLastPaymentReminderEmailMessageId?: string;
  clientLastPaymentReminderEmailFailureReason?: string;
}

export const updateAutomationInstance = onCall(async (request) => {
  const data = request.data as UpdatePayload; // O frontend envia os dados dentro de um objeto 'data' por padrão
  logger.info(">>>> CF updateAutomationInstance: Payload recebido:", JSON.stringify(data, null, 2));

  if (!data.companyId || !data.instanceId) {
    logger.error("CF Erro: companyId ou instanceId faltando.", data);
    throw new HttpsError("invalid-argument", "companyId e instanceId são obrigatórios.");
  }

  try {
    if (data.clientId) {
      // --- ATUALIZAÇÃO DE CLIENTE ESPECÍFICO ---
      logger.info(`CF: Atualizando cliente ${data.clientId} para instância ${data.instanceId} da empresa ${data.companyId}`);
      const clientDocRef = db.collection("companies").doc(data.companyId)
                             .collection("clients").doc(data.clientId);
      
      const clientUpdateData: { [key: string]: any } = {
          lastStatusUpdate: FieldValue.serverTimestamp()
      };

      if (data.clientWhatsappStatus) clientUpdateData.lastWhatsappStatus = data.clientWhatsappStatus;
      if (data.clientEmailStatus) clientUpdateData.lastEmailStatus = data.clientEmailStatus;
      
      // Para a automação de Lembretes, se viesse por aqui
      if (data.clientLastPaymentReminderEmailStatusEvent) clientUpdateData.lastPaymentReminderEmailStatusEvent = data.clientLastPaymentReminderEmailStatusEvent;
      if (data.clientLastPaymentReminderEmailEventTimestamp) {
        // Se vier como string ISO, converte. Se já for Timestamp, pode dar erro se tentar converter de novo.
        // Idealmente, o n8n envia como string ISO para CFs onCall.
        try {
            clientUpdateData.lastPaymentReminderEmailEventTimestamp = Timestamp.fromDate(new Date(data.clientLastPaymentReminderEmailEventTimestamp));
        } catch (e) {
            logger.warn("clientLastPaymentReminderEmailEventTimestamp não é uma string de data válida, salvando como está (ou ignorando).", data.clientLastPaymentReminderEmailEventTimestamp);
            // Ou não defina se não for válido: delete clientUpdateData.lastPaymentReminderEmailEventTimestamp;
        }
      }
      if (data.clientLastPaymentReminderEmailRecipient) clientUpdateData.lastPaymentReminderEmailRecipient = data.clientLastPaymentReminderEmailRecipient;
      if (data.clientLastPaymentReminderEmailMessageId) clientUpdateData.lastPaymentReminderEmailMessageId = data.clientLastPaymentReminderEmailMessageId;
      if (data.clientLastPaymentReminderEmailFailureReason) clientUpdateData.lastPaymentReminderEmailFailureReason = data.clientLastPaymentReminderEmailFailureReason;


      if (data.clientErrorMessage) {
        clientUpdateData.clientErrorMessage = data.clientErrorMessage;
      } else {
        // Apenas deleta se explicitamente não é um erro ou se não está presente,
        // para não apagar um erro anterior se esta atualização for só de status positivo.
        // Considere se quer sempre limpar o erro em caso de sucesso.
        if (data.clientWhatsappStatus?.includes('✅') || data.clientEmailStatus?.includes('✅')) {
             clientUpdateData.clientErrorMessage = FieldValue.delete();
        }
      }
      
      logger.info("CF: Dados para atualizar cliente:", clientUpdateData);
      await clientDocRef.update(clientUpdateData);
      logger.info(`CF: Cliente ${data.clientId} atualizado.`);
      return { success: true, message: "Status do cliente atualizado." };

    } else if (data.instanceStatus) {
      // --- ATUALIZAÇÃO DA INSTÂNCIA GERAL ---
      logger.info(`CF: Atualizando instância geral ${data.instanceId} da empresa ${data.companyId}`);
      const instanceDocRef = db.collection("companies").doc(data.companyId)
                               .collection("company_automations").doc(data.instanceId);

      const instanceUpdateData: { [key: string]: any } = {
          status: data.instanceStatus,
      };
      logger.info(`   CF: instanceStatus = ${data.instanceStatus}`);

      if (data.instanceLastRun) {
        try {
          instanceUpdateData.lastRun = Timestamp.fromDate(new Date(data.instanceLastRun));
          logger.info(`   CF: instanceLastRun = ${instanceUpdateData.lastRun.toDate().toISOString()}`);
        } catch(e){ logger.warn("   CF: instanceLastRun inválido, não será atualizado.", data.instanceLastRun); }
      }

      if (data.instanceResultFileUrl) instanceUpdateData.resultFileUrl = data.instanceResultFileUrl;
      if (data.instanceStoragePath) instanceUpdateData.storagePath = data.instanceStoragePath;
      if (data.instanceResultFileName) instanceUpdateData.resultFileName = data.instanceResultFileName;
      
      if (data.instanceErrorMessage) {
          instanceUpdateData.errorMessage = data.instanceErrorMessage;
      } else if (data.instanceStatus && !data.instanceStatus.toLowerCase().includes('error')) {
          // Limpa errorMessage se o status não for de erro.
          instanceUpdateData.errorMessage = FieldValue.delete();
      }

      // ADICIONADO: Salvar o instanceLastRunDetails com os KPIs
      if (data.instanceLastRunDetails && typeof data.instanceLastRunDetails === 'object') {
        instanceUpdateData.lastRunDetails = data.instanceLastRunDetails;
        logger.info(`   CF: Adicionando/Atualizando instanceLastRunDetails.`);
      } else if (data.instanceLastRunDetails) {
        logger.warn("   CF: instanceLastRunDetails recebido mas não é um objeto, não será salvo.", data.instanceLastRunDetails);
      }


      logger.info("CF: Objeto final para atualizar instância:", JSON.stringify(instanceUpdateData, null, 2));
      await instanceDocRef.update(instanceUpdateData);
      logger.info(`CF: Instância geral ${data.instanceId} atualizada.`);
      return { success: true, message: "Status da automação atualizado." };

    } else {
       logger.warn("CF Alerta: Nenhum dado de atualização válido (nem clientId, nem instanceStatus).", data);
       throw new HttpsError("invalid-argument", "Dados insuficientes para atualização.");
    }
  } catch (error: any) {
    logger.error(`CF Erro GERAL ao atualizar Firestore (${data.companyId}/${data.instanceId || data.clientId}):`, error);
    throw new HttpsError("internal", "Falha ao atualizar Firestore.", error.message);
  }
});

// --- Cloud Function Agendada para Lembretes de Pagamento ---
export const triggerPaymentReminders = onSchedule(
  {
    schedule: "every day 09:00", // Ajuste conforme necessário
    timeZone: "America/Sao_Paulo", // Ajuste
    timeoutSeconds: 540,
    memory: "256MiB",
  },
  async (event: ScheduledEvent) => { // Tipo ScheduledEvent adicionado
    logger.info(`[${event.jobName}] Iniciando triggerPaymentReminders. ScheduleTime: ${event.scheduleTime}`, { structuredData: true });

    try {
      const companiesSnapshot = await db.collection("companies").get();
      if (companiesSnapshot.empty) {
        logger.info(`[${event.jobName}] Nenhuma empresa encontrada.`);
        return; // Retorno void
      }
      logger.info(`[${event.jobName}] ${companiesSnapshot.docs.length} empresas para verificar.`);

      const processingPromises = companiesSnapshot.docs.map(async (companyDoc) => {
        const companyId = companyDoc.id;
        const companyData = companyDoc.data();
        const companyName = companyData.name || `Empresa ${companyId}`;
        logger.info(`[${event.jobName}] Verificando empresa: ${companyName} (ID: ${companyId})`);

        const instanceDocRef = db.doc(`companies/${companyId}/company_automations/${PAYMENT_REMINDER_AUTOMATION_ID}`);
        const instanceDocSnap = await instanceDocRef.get();

        if (!instanceDocSnap.exists || !instanceDocSnap.data()?.enabled) {
          logger.info(`[${event.jobName}] Automação ${PAYMENT_REMINDER_AUTOMATION_ID} não encontrada, desabilitada ou sem dados para ${companyId}.`);
          return;
        }

        const instanceData = instanceDocSnap.data()!; // Non-null assertion pois já checamos exists
        const automationConfig = instanceData.config;
        if (!automationConfig || !automationConfig.clientDueDateField) {
          logger.warn(`[${event.jobName}] Config ou clientDueDateField ausente para ${companyId}/${PAYMENT_REMINDER_AUTOMATION_ID}.`);
          return;
        }

        const clientsSnapshot = await db.collection(`companies/${companyId}/clients`).where("enabled", "==", true).get();
        if (clientsSnapshot.empty) {
          logger.info(`[${event.jobName}] Nenhum cliente habilitado para ${companyId}.`);
          return;
        }

        const activeClientsData = clientsSnapshot.docs.map(doc => {
            const clientDocData = doc.data();
            // Certifique-se de que o campo dueDate (ou o que estiver em clientDueDateField) é incluído
            // e outros campos que o n8n de lembretes possa precisar.
            return {
                id: doc.id, // ou clientId: doc.id se o n8n esperar assim
                name: clientDocData.name,
                phone: clientDocData.phone,
                email: clientDocData.email,
                [automationConfig.clientDueDateField]: clientDocData[automationConfig.clientDueDateField], // Inclui o campo da data de vencimento
                // Adicione outros campos se o n8n de lembretes precisar
                // Ex: clientDocData.invoiceLink, clientDocData.invoiceValue (se usar os campos do schema)
            };
        });
        
        logger.info(`[${event.jobName}] ${activeClientsData.length} clientes habilitados para ${companyId}.`);

        const n8nPayload = {
          triggeringMechanism: "scheduled_function",
          invokedByJob: event.jobName,
          invokedAt: event.scheduleTime,
          companyId: companyId,
          companyName: companyName,
          instanceId: PAYMENT_REMINDER_AUTOMATION_ID,
          automationId: PAYMENT_REMINDER_AUTOMATION_ID, // Template ID
          config: automationConfig,
          clients: activeClientsData,
        };

        logger.info(`[${event.jobName}] Enviando payload para n8n (Lembretes) para ${companyId}. Clientes: ${activeClientsData.length}.`);
        
        try {
            const response = await fetch(N8N_PAYMENT_REMINDER_WEBHOOK_URL, { // Use a URL correta aqui
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(n8nPayload),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                logger.error(`[${event.jobName}] Erro ao chamar webhook n8n (Lembretes) para ${companyId}. Status: ${response.status}. Body: ${errorBody}`);
            } else {
                logger.info(`[${event.jobName}] Webhook n8n (Lembretes) chamado com sucesso para ${companyId}. Status: ${response.status}`);
            }
        } catch (fetchError: any) {
            logger.error(`[${event.jobName}] Falha na requisição fetch para n8n (Lembretes) (${companyId}):`, fetchError);
        }
      });

      await Promise.all(processingPromises);
      logger.info(`[${event.jobName}] triggerPaymentReminders concluído.`);

    } catch (error) {
      logger.error(`[${event.jobName}] Erro GERAL em triggerPaymentReminders:`, error);
      throw error; // Lança o erro para o Cloud Functions registrar a falha
    }
    // Retorno void implícito
  }
);


// TODO: Adicionar a Cloud Function handleMailgunEvent aqui se você for criá-la
// export const handleMailgunEvent = onRequest(...)