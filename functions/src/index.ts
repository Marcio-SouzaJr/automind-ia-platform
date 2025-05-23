// functions/src/index.ts

import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https"; // Usar v2
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";


// Inicializar Admin SDK
admin.initializeApp();
const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;
const FieldValue = admin.firestore.FieldValue;
const PAYMENT_REMINDER_AUTOMATION_ID = "MGGct7RZTCgk2eWwDpb4"; // ID da sua automação de lembretes
const N8N_PAYMENT_REMINDER_WEBHOOK_URL = "https://automind-ia.app.n8n.cloud/webhook/8de937f2-8de5-4698-a05c-75998ba45258"; // IMPORTANTE: Substitua!

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
  instanceId: string;
  instanceStatus?: 'completed' | 'error' | 'processing';
  instanceLastRun?: string;
  instanceResultFileUrl?: string;
  instanceStoragePath?: string;
  instanceResultFileName?: string;
  instanceErrorMessage?: string;
  clientId?: string;
  clientWhatsappStatus?: string;
  clientEmailStatus?: string;
  clientErrorMessage?: string;
}

export const updateAutomationInstance = onCall(async (request) => {
  const data = request.data as UpdatePayload;
  logger.info(">>>> CF updateAutomationInstance: Payload recebido:", JSON.stringify(data, null, 2)); // Log do payload completo

  if (!data.companyId || !data.instanceId) {
    logger.error("CF Erro: companyId ou instanceId faltando.", data);
    throw new HttpsError("invalid-argument", "companyId e instanceId são obrigatórios.");
  }

  try {
    if (data.clientId) {
      // --- ATUALIZAÇÃO DE CLIENTE ESPECÍFICO ---
      logger.info(`CF: Atualizando cliente ${data.clientId} para instância ${data.instanceId}`);
      const clientDocRef = db.collection("companies").doc(data.companyId)
                             .collection("clients").doc(data.clientId);
      const clientUpdateData: { [key: string]: any } = {
          lastStatusUpdate: FieldValue.serverTimestamp()
      };
      if (data.clientWhatsappStatus) clientUpdateData.lastWhatsappStatus = data.clientWhatsappStatus;
      if (data.clientEmailStatus) clientUpdateData.lastEmailStatus = data.clientEmailStatus;
      if (data.clientErrorMessage) clientUpdateData.clientErrorMessage = data.clientErrorMessage;
      else clientUpdateData.clientErrorMessage = FieldValue.delete();
      logger.info("CF: Dados para atualizar cliente:", clientUpdateData);
      await clientDocRef.update(clientUpdateData);
      logger.info(`CF: Cliente ${data.clientId} atualizado.`);
      return { success: true, message: "Status do cliente atualizado." };

    } else if (data.instanceStatus) {
      // --- ATUALIZAÇÃO DA INSTÂNCIA GERAL ---
      logger.info(`CF: Atualizando instância geral ${data.instanceId}`);
      const instanceDocRef = db.collection("companies").doc(data.companyId)
                               .collection("company_automations").doc(data.instanceId);

      const instanceUpdateData: { [key: string]: any } = {
          status: data.instanceStatus,
      };
      logger.info(`   CF: instanceStatus = ${data.instanceStatus}`);

      if (data.instanceLastRun) {
        try {
          instanceUpdateData.lastRun = Timestamp.fromDate(new Date(data.instanceLastRun));
          logger.info(`   CF: instanceLastRun = ${instanceUpdateData.lastRun.toDate()}`);
        } catch(e){ logger.warn("   CF: instanceLastRun inválido, não será atualizado.", data.instanceLastRun); }
      }

      // Logs específicos para os campos de resultado
      if (data.instanceResultFileUrl) {
          instanceUpdateData.resultFileUrl = data.instanceResultFileUrl;
          logger.info(`   CF: Adicionando resultFileUrl: ${data.instanceResultFileUrl}`);
      } else {
          logger.info("   CF: instanceResultFileUrl NÃO presente no payload.");
      }

      if (data.instanceStoragePath) {
          instanceUpdateData.storagePath = data.instanceStoragePath;
          logger.info(`   CF: Adicionando storagePath: ${data.instanceStoragePath}`);
      } else {
          logger.info("   CF: instanceStoragePath NÃO presente no payload.");
      }

      if (data.instanceResultFileName) {
          instanceUpdateData.resultFileName = data.instanceResultFileName;
          logger.info(`   CF: Adicionando resultFileName: ${data.instanceResultFileName}`);
      } else {
          logger.info("   CF: instanceResultFileName NÃO presente no payload.");
      }

      if (data.instanceErrorMessage) {
          instanceUpdateData.errorMessage = data.instanceErrorMessage;
          logger.info(`   CF: Adicionando errorMessage: ${data.instanceErrorMessage}`);
      } else if (data.instanceStatus !== 'error') {
          instanceUpdateData.errorMessage = FieldValue.delete();
          logger.info("   CF: Removendo errorMessage (status não é erro).");
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


  export const triggerPaymentReminders = onSchedule(
  {
    schedule: "every day 09:00", // Exemplo: todo dia às 09:00 (ajuste conforme necessário)
    timeZone: "America/Sao_Paulo", // Exemplo: Fuso horário de São Paulo (ajuste)
    timeoutSeconds: 540, // Máximo para onSchedule é 540s (9 minutos)
    memory: "256MiB", // Ou "128MiB", "512MiB", etc. Ajuste conforme necessidade.
  },
  async (event) => { // O parâmetro 'event' contém informações sobre o agendamento
    logger.info(`[${event.jobName}] Iniciando triggerPaymentReminders agendado. Event ID: ${event.jobName }`, { structuredData: true });

    try {
      const companiesSnapshot = await db.collection("companies").get();
      if (companiesSnapshot.empty) {
        logger.info(`[${event.jobName}] Nenhuma empresa encontrada. Encerrando função.`);
        return;
      }

      logger.info(`[${event.jobName}] Encontradas ${companiesSnapshot.docs.length} empresas para verificar.`);

      const processingPromises = companiesSnapshot.docs.map(async (companyDoc) => {
        const companyId = companyDoc.id;
        const companyData = companyDoc.data();
        const companyName = companyData.name || `Empresa ${companyId}`; // Fallback

        logger.info(`[${event.jobName}] Verificando empresa: ${companyName} (ID: ${companyId})`);

        // 1. Buscar a instância da automação de lembretes para esta empresa
        const instanceDocRef = db.doc(
          `companies/${companyId}/company_automations/${PAYMENT_REMINDER_AUTOMATION_ID}`
        );
        const instanceDocSnap = await instanceDocRef.get();

        if (!instanceDocSnap.exists) {
          logger.info(`[${event.jobName}] Instância ${PAYMENT_REMINDER_AUTOMATION_ID} não encontrada para empresa ${companyId}.`);
          return; // Pula para a próxima empresa
        }

        const instanceData = instanceDocSnap.data();
        if (!instanceData || !instanceData.enabled) {
          logger.info(`[${event.jobName}] Automação ${PAYMENT_REMINDER_AUTOMATION_ID} desabilitada ou dados da instância ausentes para empresa ${companyId}.`);
          return; // Pula para a próxima empresa
        }

        // 2. Obter a configuração da instância
        const automationConfig = instanceData.config;
        if (!automationConfig || !automationConfig.clientDueDateField) {
          logger.warn(`[${event.jobName}] Configuração (config) ou clientDueDateField ausente para ${companyId}/${PAYMENT_REMINDER_AUTOMATION_ID}.`);
          return;
        }

        logger.info(`[${event.jobName}] Automação habilitada para ${companyId}.`);

        // 3. Buscar clientes habilitados da empresa
        const clientsSnapshot = await db
          .collection(`companies/${companyId}/clients`)
          .where("enabled", "==", true)
          .get();

        if (clientsSnapshot.empty) {
          logger.info(`[${event.jobName}] Nenhum cliente habilitado encontrado para ${companyId}.`);
          return;
        }

        const activeClientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        logger.info(`[${event.jobName}] Encontrados ${activeClientsData.length} clientes habilitados para ${companyId}.`);

        // 4. Preparar payload para o n8n
        const n8nPayload = {
          triggeringMechanism: "scheduled_function",
          invokedByJob: event.jobName, // Adiciona o nome do job para rastreio
          invokedAt: event.scheduleTime, // Adiciona o tempo agendado para rastreio
          companyId: companyId,
          companyName: companyName,
          instanceId: PAYMENT_REMINDER_AUTOMATION_ID,
          automationId: PAYMENT_REMINDER_AUTOMATION_ID,
          config: automationConfig,
          clients: activeClientsData,
        };

        // 5. Chamar o Webhook n8n
        logger.info(`[${event.jobName}] Enviando ${activeClientsData.length} clientes para n8n para empresa ${companyId}.`);
        

        try {
            const response = await fetch(N8N_PAYMENT_REMINDER_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(n8nPayload),
                // Adicionar um timeout para a requisição fetch se necessário, embora o timeout da função seja o limite principal
                // signal: AbortSignal.timeout(30000) // Timeout de 30 segundos para a requisição (exemplo)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                logger.error(`[${event.jobName}] Erro ao chamar webhook n8n para ${companyId}. Status: ${response.status}. Body: ${errorBody}`);
                // Opcional: Atualizar status da instância para erro no trigger
                // await instanceDocRef.update({ status: 'error_triggering_n8n', errorMessage: `Webhook n8n falhou: ${response.status}` });
            } else {
                logger.info(`[${event.jobName}] Webhook n8n chamado com sucesso para ${companyId}. Status: ${response.status}`);
                // Opcional: Atualizar status da instância
                // await instanceDocRef.update({ status: 'n8n_triggered', lastTriggeredByScheduler: Timestamp.now() });
            }
        } catch (fetchError: any) {
            logger.error(`[${event.jobName}] Falha na requisição fetch para n8n (${companyId}):`, fetchError);
            // await instanceDocRef.update({ status: 'error_triggering_n8n', errorMessage: `Fetch para n8n falhou: ${fetchError.message}` });
        }
      }); // Fim do .map para companiesSnapshot.docs

      // Aguarda todas as promessas de processamento de empresa serem resolvidas
      await Promise.all(processingPromises);
      logger.info(`[${event.jobName}] Processo de triggerPaymentReminders concluído para todas as empresas verificadas.`);

    } catch (error) {
      logger.error(`[${event.jobName}] Erro geral na função triggerPaymentReminders:`, error);
        throw error; // Retornar null ou lançar o erro para logging no Cloud Functions
    }
    return; // Indica que a função concluiu com sucesso (mesmo que algumas empresas tenham falhado individualmente)
  }
);