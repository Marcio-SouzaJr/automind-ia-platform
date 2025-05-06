// src/services/firestoreService.ts

import { db } from '../config/firebaseConfig';
import {
    collection, // Para referenciar uma coleção ou subcoleção
    query,      // Para criar uma consulta
    where,      // Para adicionar filtros à consulta (opcional)
    getDocs,    // Para executar a consulta e obter os documentos
    Timestamp,   // Para tipar campos de data/hora, se necessário
    limit,
    doc,
    getDoc,
    orderBy,
    addDoc, // 🟢➡️ Importar addDoc
    serverTimestamp, // 🟢➡️ Importar serverTimestamp (melhor que Timestamp.now() para escritas)
    setDoc,
    updateDoc,
    deleteDoc,
    FieldValue,
    deleteField
} from 'firebase/firestore';
import { ClientRecipient } from '../pages/ManageClientsPage';

// 1. Interface para representar os dados de um documento na subcoleção 'company_automations'
//    Baseado na nossa modelagem anterior.
export interface CompanyAutomation {
    id: string; // O ID do documento (que geralmente é o mesmo ID da automação)
    automationId: string;
    name?: string; // Pode ser redundante, mas útil
    enabled: boolean;
    config: { [key: string]: any }; // Configuração específica da empresa (objeto genérico por enquanto)
    lastRun?: Timestamp;
    status?: string;
    resultFileUrl?: string; // 🟢➡️ Adicionado (opcional)
    errorMessage?: string; // 🟢➡️ Adicionado (opcional)
    storagePath?: string; // 🟢➡️ Adicionado (opcional)
    resultFileName?: string; // 🟢➡️ Adicionado (opcional)
    // Adicione outros campos se definidos na modelagem
}

// 2. Função para buscar as automações configuradas para uma empresa específica
export const getCompanyAutomations = async (companyId: string): Promise<CompanyAutomation[]> => {
    if (!companyId) {
        console.error("Erro: companyId é necessário para buscar automações.");
        return []; // Retorna array vazio se não houver companyId
    }

    console.log(`Buscando automações para companyId: ${companyId}`);

    try {
        // 3. Referência para a subcoleção 'company_automations' dentro da empresa específica
        const automationsSubcollectionRef = collection(db, 'companies', companyId, 'company_automations');

        // 4. (Opcional) Criar uma query para filtrar, por exemplo, apenas as habilitadas
        // Se quiser TODAS as configuradas (habilitadas ou não), use apenas automationsSubcollectionRef
        const q = query(automationsSubcollectionRef, where("enabled", "==", true));
        console.log("Query:", q); // Log da query para debug

        // 5. Executar a query (ou buscar todos os docs se não usar 'q')
        const querySnapshot = await getDocs(q); // Usar getDocs(automationsSubcollectionRef) se não filtrar

        // 6. Mapear os resultados para o formato da nossa interface
        const automations: CompanyAutomation[] = [];
        querySnapshot.forEach((doc) => {
            // console.log(doc.id, " => ", doc.data()); // Log para debug
            automations.push({
                id: doc.id, // Adiciona o ID do documento
                ...doc.data() // Inclui todos os outros campos do documento
            } as CompanyAutomation); // Type assertion para garantir o formato
        });

        console.log(`Encontradas ${automations.length} automações habilitadas para ${companyId}`);
        return automations;

    } catch (error) {
        console.error(`Erro ao buscar automações para a empresa ${companyId}:`, error);
        // Relançar o erro ou retornar array vazio? Por enquanto, retornamos vazio.
        // throw error; // Descomente se quiser que a página trate o erro
        return []; // Retorna vazio em caso de erro
    }
};

export interface CompanyData {
    id: string; // ID do documento Firestore
    name: string;
    cnpj?: string; // Tornar opcional se nem todas tiverem
    accessCode: string; // Campo que usaremos para busca
    // Adicione outros campos relevantes aqui (phone, contactEmail, etc.)
    createdAt: Timestamp;
}

export const findCompanyByCode = async (code: string): Promise<{ id: string; data: Omit<CompanyData, 'id'> } | null> => {
    if (!code) return null; // Retorna nulo se o código for vazio

    console.log(`Firestore: Procurando empresa com accessCode: ${code}`);
    try {
        // Referência à coleção 'companies'
        const companiesRef = collection(db, 'companies');

        // Cria a query: busca na coleção 'companies' onde o campo 'accessCode' é igual ao código fornecido
        // limit(1) otimiza a busca, pois esperamos apenas uma empresa com esse código
        const q = query(companiesRef, where("accessCode", "==", code), limit(1));

        // Executa a query
        const querySnapshot = await getDocs(q);

        // Verifica se algum documento foi encontrado
        if (!querySnapshot.empty) {
            // Pega o primeiro (e único, devido ao limit(1)) documento encontrado
            const companyDoc = querySnapshot.docs[0];
            console.log(`Firestore: Empresa encontrada - ID: ${companyDoc.id}`);
            // Retorna o ID do documento e os dados, tipando os dados
            return {
                id: companyDoc.id,
                data: companyDoc.data() as Omit<CompanyData, 'id'>
            };
        } else {
            // Nenhum documento encontrado com esse código
            console.log(`Firestore: Nenhuma empresa encontrada com accessCode: ${code}`);
            return null;
        }
    } catch (error) {
        console.error("Erro ao buscar empresa por código:", error);
        // throw error; // Ou apenas retorna null
        return null;
    }
};

export interface AutomationTemplate {
    id: string;
    name: string;
    description: string;
    icon?: string;
    configSchema?: { [key: string]: any };
    createdAt?: Timestamp; // Adicionar data de criação
    // outros campos do template...
}

// 🟢➡️ Interface para os dados combinados que a página usará
export interface CombinedAutomationDetails {
    instance: CompanyAutomation; // Dados da instância específica da empresa
    template: AutomationTemplate; // Dados do template geral
}

export const getCompanyAutomationDetails = async (
    companyId: string,
    instanceId: string // ID do documento na subcoleção company_automations
): Promise<CombinedAutomationDetails | null> => {

    // 👇 LOG 1: Início da função e parâmetros recebidos 👇
    console.log(`[getCompanyAutomationDetails] Iniciando busca para companyId: ${companyId}, instanceId: ${instanceId}`);

    if (!companyId || !instanceId) {
        console.error("[getCompanyAutomationDetails] Erro: IDs faltando.");
        return null;
    }

    try {
        // 1. Buscar o documento da instância na subcoleção
        const instanceDocPath = `companies/${companyId}/company_automations/${instanceId}`;
        const instanceDocRef = doc(db, instanceDocPath);
        // 👇 LOG 2: Caminho que está sendo buscado para a instância 👇
        console.log(`[getCompanyAutomationDetails] Buscando instância em: ${instanceDocRef.path}`);
        const instanceDocSnap = await getDoc(instanceDocRef);

        // 👇 LOG 3: Resultado da busca da instância 👇
        console.log(`[getCompanyAutomationDetails] Snapshot da instância existe? ${instanceDocSnap.exists()}`);

        if (!instanceDocSnap.exists()) {
            console.error(`[getCompanyAutomationDetails] Instância ${instanceId} não encontrada para ${companyId}.`);
            return null;
        }

        // Extrair dados da instância
        const instanceData = { id: instanceDocSnap.id, ...instanceDocSnap.data() } as CompanyAutomation;
        // 👇 LOG 4: Dados da instância encontrados 👇
        console.log("[getCompanyAutomationDetails] Dados da instância:", instanceData);

        // Garantir que temos o ID do template para buscar
        if (!instanceData.automationId) {
            console.error(`[getCompanyAutomationDetails] Campo 'automationId' faltando na instância ${instanceId}.`);
            return null;
        }

        // 2. Buscar o documento do template na coleção raiz 'automations'
        const templateDocPath = `automations/${instanceData.automationId}`;
        const templateDocRef = doc(db, templateDocPath);
        // 👇 LOG 5: Caminho que está sendo buscado para o template 👇
        console.log(`[getCompanyAutomationDetails] Buscando template em: ${templateDocRef.path}`);
        const templateDocSnap = await getDoc(templateDocRef);

        // 👇 LOG 6: Resultado da busca do template 👇
        console.log(`[getCompanyAutomationDetails] Snapshot do template existe? ${templateDocSnap.exists()}`);

        if (!templateDocSnap.exists()) {
            console.error(`[getCompanyAutomationDetails] Template ${instanceData.automationId} não encontrado.`);
            return null; // Ou poderia retornar só a instância? Decidimos retornar null antes.
        }

        // Extrair dados do template
        const templateData = { id: templateDocSnap.id, ...templateDocSnap.data() } as AutomationTemplate;
        // 👇 LOG 7: Dados do template encontrados 👇
        console.log("[getCompanyAutomationDetails] Dados do template:", templateData);

        // 3. Combinar e retornar os dados
        // 👇 LOG 8: Retornando dados combinados 👇
        console.log("[getCompanyAutomationDetails] Sucesso! Retornando detalhes combinados.");
        return {
            instance: instanceData,
            template: templateData
        };

    } catch (error) {
        // 👇 LOG 9: Erro durante a execução 👇
        console.error(`[getCompanyAutomationDetails] Erro ao buscar detalhes combinados (${instanceId}):`, error);
        return null; // Retorna null em caso de erro
    }
};

export const listCompanies = async (): Promise<CompanyData[]> => {
    console.log("Firestore: Buscando lista de empresas...");
    try {
        // Referência à coleção 'companies'
        const companiesRef = collection(db, 'companies');

        // Criar uma query para ordenar (opcional, mas recomendado)
        // Ordenar por nome da empresa (case-sensitive por padrão) ou data de criação
        const q = query(companiesRef, orderBy("name", "asc")); // Ordena por nome ascendente
        // const q = query(companiesRef, orderBy("createdAt", "desc")); // Ordena por data de criação descendente

        // Executar a query
        const querySnapshot = await getDocs(q);

        // Mapear os resultados para o formato da nossa interface, incluindo o ID
        const companies: CompanyData[] = [];
        querySnapshot.forEach((doc) => {
            companies.push({
                id: doc.id, // Inclui o ID do documento
                ...doc.data() // Inclui todos os outros campos
            } as CompanyData); // Garante o tipo
        });

        console.log(`Firestore: ${companies.length} empresas encontradas.`);
        return companies;

    } catch (error) {
        console.error("Erro ao listar empresas:", error);
        // Em caso de erro (ex: permissão), retorna array vazio
        // Poderia lançar o erro se a página de admin precisar tratá-lo
        return [];
    }
};

type NewCompanyInput = Pick<CompanyData, 'name'> & Partial<Pick<CompanyData, 'cnpj'>>;

// Função para gerar um código de acesso aleatório
const generateAccessCode = (length: number = 8): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    // Poderia adicionar verificação se o código já existe, mas é raro colidir com 8 chars
    return `AUTO-${result}`; // Adiciona um prefixo
};


export const addCompany = async (companyInput: NewCompanyInput): Promise<string> => {
    console.log("Firestore: Adicionando nova empresa...", companyInput);
    try {
        // 1. Gerar o código de acesso único
        const accessCode = generateAccessCode();
        console.log("Firestore: Código de Acesso gerado:", accessCode);

        // 2. Preparar o documento completo para salvar
        const companyDocData = {
            ...companyInput, // Inclui name e cnpj (se houver)
            accessCode: accessCode, // Adiciona o código gerado
            createdAt: serverTimestamp() // Usa o timestamp do servidor Firestore
        };

        // 3. Referência à coleção 'companies'
        const companiesRef = collection(db, 'companies');

        // 4. Adicionar o documento usando addDoc (gera um ID automático)
        const docRef = await addDoc(companiesRef, companyDocData);

        console.log("Firestore: Empresa adicionada com ID:", docRef.id);
        return docRef.id; // Retorna o ID da nova empresa criada

    } catch (error) {
        console.error("Erro ao adicionar empresa:", error);
        throw new Error("Falha ao salvar a nova empresa no banco de dados."); // Lança um erro genérico para a UI
    }
};

export const listAutomationTemplates = async (): Promise<AutomationTemplate[]> => {
    console.log("Firestore: Buscando lista de templates de automação...");
    try {
        const templatesRef = collection(db, 'automations');
        // Ordenar por nome para facilitar a visualização
        const q = query(templatesRef, orderBy("name", "asc"));

        const querySnapshot = await getDocs(q);

        const templates: AutomationTemplate[] = [];
        querySnapshot.forEach((doc) => {
            templates.push({
                id: doc.id,
                ...doc.data()
            } as AutomationTemplate); // Confia que os dados correspondem à interface
        });

        console.log(`Firestore: ${templates.length} templates de automação encontrados.`);
        return templates;

    } catch (error) {
        console.error("Erro ao listar templates de automação:", error);
        return []; // Retorna vazio em caso de erro
    }
};

type NewTemplateInput = Omit<AutomationTemplate, 'id' | 'createdAt'>;

export const addAutomationTemplate = async (templateInput: NewTemplateInput): Promise<string> => {
    console.log("Firestore: Adicionando novo template...", templateInput);
    try {
        // Preparar o documento completo para salvar
        const templateDocData = {
            ...templateInput, // Inclui name, description, icon?, configSchema
            createdAt: serverTimestamp() // Adiciona a data de criação
        };

        const templatesRef = collection(db, 'automations');
        const docRef = await addDoc(templatesRef, templateDocData);

        console.log("Firestore: Template adicionado com ID:", docRef.id);
        return docRef.id; // Retorna o ID do novo template

    } catch (error) {
        console.error("Erro ao adicionar template de automação:", error);
        throw new Error("Falha ao salvar o novo template no banco de dados.");
    }
};

export const getCompanyDetails = async (companyId: string): Promise<CompanyData | null> => {
    console.log(`Firestore: Buscando detalhes da empresa ID: ${companyId}`);
    try {
        // Criar referência direta ao documento da empresa
        const companyDocRef = doc(db, 'companies', companyId);

        // Buscar o documento
        const docSnap = await getDoc(companyDocRef);

        // Verificar se o documento existe
        if (docSnap.exists()) {
            console.log("Firestore: Detalhes da empresa encontrados.");
            // Retorna um objeto combinando o ID e os dados
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as CompanyData; // Garante o tipo
        } else {
            console.warn(`Firestore: Empresa com ID ${companyId} não encontrada.`);
            return null; // Retorna null se não encontrar
        }
    } catch (error) {
        console.error(`Erro ao buscar detalhes da empresa ${companyId}:`, error);
        return null; // Retorna null em caso de erro
    }
};

export const associateAutomationToCompany = async (
    companyId: string,
    templateId: string, // ID do template selecionado
    configData: { [key: string]: any }, // Dados do formulário de configuração dinâmica
    enabledStatus: boolean // Status inicial (ex: true)
): Promise<void> => { // Não precisa retornar nada

    // Validações básicas de entrada
    if (!companyId || !templateId) {
        throw new Error("ID da Empresa e ID do Template são obrigatórios para associar automação.");
    }

    console.log(`Firestore: Associando/Habilitando template ${templateId} para empresa ${companyId}`);
    try {
        // 1. Referência ao DOCUMENTO na subcoleção company_automations.
        //    Usaremos o ID do TEMPLATE como ID do DOCUMENTO da instância para fácil referência.
        const instanceDocRef = doc(db, 'companies', companyId, 'company_automations', templateId);

        // 2. Preparar os dados a serem salvos/atualizados na instância
        const instanceData = {
            automationId: templateId,      // Armazena o ID do template referenciado
            config: configData,          // A configuração específica preenchida pelo admin
            enabled: enabledStatus,        // Se está ativa ou não
            createdAt: serverTimestamp(), // Data em que a associação foi criada/atualizada
            status: "idle",              // Status inicial da execução
            lastRun: null                // Ainda não foi executada
            // Poderíamos adicionar o 'name' do template aqui para denormalizar se facilitar a exibição,
            // mas buscar do template é mais consistente se o nome do template mudar.
            // name: nomeDoTemplateBuscadoAnteriormente // Opcional
        };

        // 3. Usar setDoc para CRIAR (se não existir) ou SOBRESCREVER COMPLETAMENTE (se já existir) o documento da instância.
        //    Se no futuro você quiser apenas ATUALIZAR campos específicos sem apagar outros,
        //    você usaria updateDoc() ou setDoc() com a opção { merge: true }.
        //    Para a ação inicial de "Habilitar e Salvar Config.", setDoc sem merge é adequado.
        await setDoc(instanceDocRef, instanceData);

        console.log(`Firestore: Automação ${templateId} associada/atualizada para ${companyId}.`);

    } catch (error) {
        console.error(`Erro ao associar automação ${templateId} à empresa ${companyId}:`, error);
        // Lança um erro para a UI (AdminClientDetailPage) tratar
        throw new Error("Falha ao salvar a configuração da automação.");
    }
};

type UpdateTemplateInput = Partial<Omit<AutomationTemplate, 'id' | 'createdAt'>>;

export const updateAutomationTemplate = async (
    templateId: string,
    templateUpdateData: UpdateTemplateInput
): Promise<void> => { // Não precisa retornar nada
    if (!templateId) throw new Error("ID do Template é obrigatório para atualizar.");

    console.log(`Firestore: Atualizando template ${templateId}...`, templateUpdateData);
    try {
        // 1. Referência ao documento do template específico
        const templateDocRef = doc(db, 'automations', templateId);

        // 2. Usar updateDoc para atualizar apenas os campos fornecidos
        //    Não precisamos adicionar createdAt aqui, pois só atualizamos
        await updateDoc(templateDocRef, templateUpdateData);

        console.log(`Firestore: Template ${templateId} atualizado com sucesso.`);

    } catch (error) {
        console.error(`Erro ao atualizar template ${templateId}:`, error);
        throw new Error("Falha ao atualizar o template no banco de dados.");
    }
};

type UpdateCompanyInput = Partial<Pick<CompanyData, 'name' | 'cnpj'>>; // Permite atualizar name e/ou cnpj

export const updateCompany = async (
    companyId: string,
    updateData: UpdateCompanyInput // Dados a serem atualizados (name?, cnpj?)
): Promise<void> => { // Não precisa retornar nada
    if (!companyId) throw new Error("ID da Empresa é obrigatório para atualizar.");
    if (!updateData || Object.keys(updateData).length === 0) {
        console.warn("Nenhum dado fornecido para atualização da empresa.");
        return; // Não faz nada se não houver dados para atualizar
    }

    console.log(`Firestore: Atualizando empresa ${companyId}...`, updateData);
    try {
        // 1. Referência ao documento da empresa específica
        const companyDocRef = doc(db, 'companies', companyId);

        // 2. Usar updateDoc para atualizar APENAS os campos fornecidos em updateData
        //    Campos como accessCode e createdAt não serão alterados.
        await updateDoc(companyDocRef, updateData);

        console.log(`Firestore: Empresa ${companyId} atualizada com sucesso.`);

    } catch (error) {
        console.error(`Erro ao atualizar empresa ${companyId}:`, error);
        throw new Error("Falha ao atualizar a empresa no banco de dados.");
    }
};

export const deleteCompany = async (companyId: string): Promise<void> => {
    if (!companyId) throw new Error("ID da Empresa é obrigatório para excluir.");

    console.warn(`Firestore: Tentando excluir empresa ${companyId}... ATENÇÃO: Subcoleções NÃO são excluídas automaticamente.`);
    try {
        // 1. Referência ao documento da empresa
        const companyDocRef = doc(db, 'companies', companyId);

        // 2. Usar deleteDoc para remover o documento
        await deleteDoc(companyDocRef);

        console.log(`Firestore: Empresa ${companyId} excluída com sucesso (documento principal).`);

    } catch (error) {
        console.error(`Erro ao excluir empresa ${companyId}:`, error);
        throw new Error("Falha ao excluir a empresa do banco de dados.");
    }
};

export const updateCompanyAutomationStatus = async (
    companyId: string,
    instanceId: string, // ID da instância (documento na subcoleção)
    newEnabledStatus: boolean // true para habilitar, false para desabilitar
): Promise<void> => {
    if (!companyId || !instanceId) {
        throw new Error("ID da Empresa e ID da Instância são obrigatórios.");
    }

    const statusText = newEnabledStatus ? "Habilitando" : "Desabilitando";
    console.log(`Firestore: ${statusText} automação ${instanceId} para empresa ${companyId}`);
    try {
        const instanceDocRef = doc(db, 'companies', companyId, 'company_automations', instanceId);

        // Atualiza apenas o campo 'enabled'
        await updateDoc(instanceDocRef, {
            enabled: newEnabledStatus
        });

        console.log(`Firestore: Status da automação ${instanceId} atualizado para ${newEnabledStatus}.`);

    } catch (error) {
        console.error(`Erro ao ${statusText.toLowerCase()} automação ${instanceId}:`, error);
        throw new Error("Falha ao atualizar o status da automação.");
    }
};

export const updateClientEnabledStatus = async (
    companyId: string,
    clientId: string,
    newEnabledStatus: boolean
): Promise<void> => {
    if (!companyId || !clientId) {
        throw new Error("ID da Empresa e ID do Cliente são obrigatórios.");
    }
    const statusText = newEnabledStatus ? "Habilitando" : "Desabilitando";
    console.log(`Firestore Client: ${statusText} cliente ${clientId} para empresa ${companyId}`);
    try {
        // Referência ao documento específico do cliente na subcoleção
        const clientDocRef = doc(db, 'companies', companyId, 'clients', clientId);

        // Atualiza apenas o campo 'enabled'
        await updateDoc(clientDocRef, {
            enabled: newEnabledStatus
            // Opcional: Adicionar um campo como 'statusLastChanged': serverTimestamp()
        });

        console.log(`Firestore Client: Status 'enabled' do cliente ${clientId} atualizado para ${newEnabledStatus}.`);

    } catch (error) {
        console.error(`Erro ao ${statusText.toLowerCase()} cliente ${clientId}:`, error);
        throw new Error("Falha ao atualizar o status de habilitação do cliente.");
    }
};

export type UpdateClientRecipientData = Omit<ClientRecipient, 'id' | 'createdAt' | 'lastWhatsappStatus' | 'lastEmailStatus' | 'lastStatusUpdate' | 'enabled'>;
export const updateClientRecipient = async (
    companyId: string,
    clientId: string,
    updateData: UpdateClientRecipientData // Apenas os campos que podem ser editados
): Promise<void> => {
    if (!companyId || !clientId) throw new Error("IDs são obrigatórios para atualizar cliente.");
    if (!updateData || Object.keys(updateData).length === 0) {
        console.warn("Nenhum dado fornecido para atualização do cliente.");
        return;
    }

    console.log(`Firestore Client: Atualizando cliente ${clientId} da empresa ${companyId}...`, updateData);
    try {
        const clientDocRef = doc(db, 'companies', companyId, 'clients', clientId);

        // updateDoc atualiza apenas os campos fornecidos em updateData
        // Não precisamos incluir 'enabled' ou 'createdAt' aqui se não queremos que sejam editados por este form
        await updateDoc(clientDocRef, {
            name: updateData.name,
            responsible: updateData.responsible || null, // Salva null se vazio
            phone: updateData.phone,
            email: updateData.email,
            driveFileNameHint: updateData.driveFileNameHint || null // Salva null se vazio
            // Poderia adicionar um campo 'updatedAt': serverTimestamp() aqui
        });

        console.log(`Firestore Client: Cliente ${clientId} atualizado com sucesso.`);

    } catch (error) {
        console.error(`Erro ao atualizar cliente ${clientId}:`, error);
        throw new Error("Falha ao atualizar os dados do cliente.");
    }
};

export const deleteClientRecipient = async (
    companyId: string,
    clientId: string
): Promise<void> => {
    if (!companyId || !clientId) {
        throw new Error("ID da Empresa e ID do Cliente são obrigatórios para excluir.");
    }
    console.log(`Firestore Client: Excluindo cliente ${clientId} da empresa ${companyId}...`);
    try {
        // Referência ao documento específico do cliente na subcoleção
        const clientDocRef = doc(db, 'companies', companyId, 'clients', clientId);

        // Usar deleteDoc para remover o documento
        await deleteDoc(clientDocRef);

        console.log(`Firestore Client: Cliente ${clientId} excluído com sucesso.`);

    } catch (error) {
        console.error(`Erro ao excluir cliente ${clientId}:`, error);
        throw new Error("Falha ao excluir o cliente do banco de dados.");
    }
};

export const getCompanyAutomationInstance = async (
    companyId: string,
    instanceId: string // ID da instância (geralmente o mesmo ID do template)
): Promise<CompanyAutomation | null> => {
    if (!companyId || !instanceId) {
        console.error("getCompanyAutomationInstance: IDs são obrigatórios.");
        return null;
    }
    console.log(`Firestore: Buscando instância ${instanceId} para empresa ${companyId}`);
    try {
        const instanceDocRef = doc(db, 'companies', companyId, 'company_automations', instanceId);
        const docSnap = await getDoc(instanceDocRef);

        if (docSnap.exists()) {
            console.log("Firestore: Instância encontrada:", docSnap.data());
            return { id: docSnap.id, ...docSnap.data() } as CompanyAutomation;
        } else {
            console.warn(`Firestore: Instância ${instanceId} não encontrada para empresa ${companyId}.`);
            return null;
        }
    } catch (error) {
        console.error(`Erro ao buscar instância ${instanceId} para empresa ${companyId}:`, error);
        return null;
    }
};