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
    getDoc
} from 'firebase/firestore';

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
    name: string;
    cnpj?: string; // Tornar opcional se nem todas tiverem
    accessCode: string; // Campo que usaremos para busca
    // Adicione outros campos relevantes aqui (phone, contactEmail, etc.)
    createdAt: Timestamp;
}

export const findCompanyByCode = async (code: string): Promise<{ id: string; data: CompanyData } | null> => {
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
                data: companyDoc.data() as CompanyData
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

    if (!companyId || !instanceId) return null;

    console.log(`Firestore: Buscando detalhes da instância ${instanceId} para empresa ${companyId}`);
    try {
        // 1. Buscar o documento da instância na subcoleção
        const instanceDocRef = doc(db, 'companies', companyId, 'company_automations', instanceId);
        const instanceDocSnap = await getDoc(instanceDocRef);

        if (!instanceDocSnap.exists()) {
            console.error(`Instância de automação ${instanceId} não encontrada para a empresa ${companyId}`);
            return null;
        }

        // Extrair dados da instância, garantindo que 'automationId' (do template) está presente
        const instanceData = { id: instanceDocSnap.id, ...instanceDocSnap.data() } as CompanyAutomation;
        if (!instanceData.automationId) {
             console.error(`Campo 'automationId' faltando na instância ${instanceId} da empresa ${companyId}`);
             return null; // Não podemos buscar o template sem o ID dele
        }

        // 2. Buscar o documento do template na coleção raiz 'automations'
        const templateDocRef = doc(db, 'automations', instanceData.automationId);
        const templateDocSnap = await getDoc(templateDocRef);

        if (!templateDocSnap.exists()) {
            console.error(`Template de automação ${instanceData.automationId} não encontrado.`);
            // Poderia retornar só os dados da instância, ou null. Vamos retornar null por consistência.
            return null;
        }

        // Extrair dados do template
        const templateData = { id: templateDocSnap.id, ...templateDocSnap.data() } as AutomationTemplate;

        // 3. Combinar e retornar os dados
        console.log("Firestore: Detalhes combinados encontrados.");
        return {
            instance: instanceData,
            template: templateData
        };

    } catch (error) {
        console.error(`Erro ao buscar detalhes combinados da automação ${instanceId}:`, error);
        return null;
    }
};
// --- Adicione outras funções do Firestore aqui conforme necessário ---
// Ex: buscar detalhes de uma automação específica pelo ID, buscar dados da empresa, etc.

/* Exemplo de função para buscar detalhes de um template de automação:
import { doc, getDoc } from 'firebase/firestore';

export const getAutomationTemplateDetails = async (automationId: string) => {
    try {
        const docRef = doc(db, "automations", automationId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("Template de automação não encontrado:", automationId);
            return null;
        }
    } catch (error) {
        console.error("Erro ao buscar template de automação:", error);
        return null;
    }
}
*/