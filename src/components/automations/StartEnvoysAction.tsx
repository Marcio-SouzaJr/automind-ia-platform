// src/components/automations/StartEnvoysAction.tsx
import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';

import { useAuth } from '../../contexts/AuthContext'; // Para pegar currentUser se necessário
import { db } from '../../config/firebaseConfig';    // Para buscar clientes
import { collection, query, where, getDocs } from 'firebase/firestore';

// Importar função e interfaces do firestoreService
import {  CompanyAutomation } from '../../services/firestoreService';

// Interface para dados do Cliente Final que serão enviados ao n8n
interface ClientForN8n {
    clientId: string;
    name: string;
    phone: string;
    email: string;
    responsible: string;
    driveFileNameHint?: string;
}

// Interface para as props do componente
interface StartEnvoysActionProps {
    instance: CompanyAutomation; // Instância da automação "Envios Automáticos" (vem da AutomationDetailPage)
    companyId: string;           // ID da empresa (vem da AutomationDetailPage via dbUser)
    onProcessingStart: () => void; // Callback para notificar o início
    onProcessingComplete: (success: boolean, message: string) => void; // Callback para o resultado
}

// URL do Webhook N8N para esta automação específica
const ENVOYS_N8N_WEBHOOK_URL = "https://automind-ia.app.n8n.cloud/webhook/c50a4f42-258d-40d4-8fab-4c14f3bcc993"; // SUBSTITUA!

const StartEnvoysAction: React.FC<StartEnvoysActionProps> = ({ instance, companyId, onProcessingStart, onProcessingComplete }) => {
    const { currentUser } = useAuth(); // Para o triggeringUserId

    const [isStarting, setIsStarting] = useState(false);
    // Não precisamos de startError/startSuccess aqui, o pai (AutomationDetailPage) cuidará disso
    // através da prop onProcessingComplete.

    const handleStartEnvoys = async () => {
        // Validações Iniciais
        if (!companyId || !currentUser?.uid) {
            onProcessingComplete(false, "Não foi possível identificar sua empresa ou usuário.");
            return;
        }
        if (!ENVOYS_N8N_WEBHOOK_URL || ENVOYS_N8N_WEBHOOK_URL.startsWith("SUA_URL")) {
             onProcessingComplete(false, "Erro de configuração: URL do Webhook para Envios não definida.");
             return;
        }
        if (!instance || !instance.config) {
            onProcessingComplete(false, "Configuração da automação 'Envios Automáticos' não encontrada ou inválida.");
            return;
        }

        onProcessingStart(); // Notifica o pai que o processo começou
        setIsStarting(true);

        try {
            // 1. Buscar clientes habilitados da subcoleção da empresa atual
            console.log(`StartEnvoysAction: Buscando clientes habilitados para empresa ${companyId}`);
            const clientsColRef = collection(db, 'companies', companyId, 'clients');
            const q = query(clientsColRef, where("enabled", "==", true));
            const querySnapshot = await getDocs(q);

            const enabledClientsData: ClientForN8n[] = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                enabledClientsData.push({
                    clientId: doc.id,
                    name: data.name,
                    phone: data.phone,
                    email: data.email,
                    responsible: data.responsible,
                    driveFileNameHint: data.driveFileNameHint || '',
                });
            });

            if (enabledClientsData.length === 0) {
                throw new Error("Nenhum cliente habilitado para envio na lista de gerenciamento.");
            }
            console.log(`StartEnvoysAction: ${enabledClientsData.length} clientes habilitados encontrados.`);

            // 2. Montar o payload
            const payload = {
                triggeringUserId: currentUser.uid,
                companyId: companyId,
                instanceId: instance.id, // ID da instância "envios-automaticos"
                automationId: instance.automationId, // ID do template
                config: instance.config, // Configurações do admin (Drive ID, API Keys, etc.)
                clientList: enabledClientsData // Array de clientes habilitados
            };

            console.log("StartEnvoysAction: Enviando para n8n (Envios Automáticos):", ENVOYS_N8N_WEBHOOK_URL);
            console.log("StartEnvoysAction: Payload:", JSON.stringify(payload, null, 2));

            // 3. Chamar o Webhook N8N
            const response = await fetch(ENVOYS_N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("StartEnvoysAction: Erro resposta n8n:", response.status, errorText);
                throw new Error(`Falha ao iniciar envios (n8n status ${response.status}): ${errorText}`);
            }

            const responseData = await response.json();
            console.log("StartEnvoysAction: Resposta do n8n:", responseData);
            onProcessingComplete(true, "Processo de envios automáticos foi solicitado com sucesso!");

        } catch (err: any) {
            console.error("StartEnvoysAction: Erro ao iniciar envios automáticos:", err);
            onProcessingComplete(false, err.message || "Ocorreu um erro desconhecido ao iniciar os envios.");
        } finally {
            setIsStarting(false);
        }
    };

    // Só mostra o botão se a instância da automação estiver habilitada
    if (!instance.enabled) {
        return <Alert variant="secondary">Esta automação está atualmente desabilitada.</Alert>;
    }

    return (
        <>
            <h4>Iniciar Envios em Massa</h4>
            <p className="text-muted">
                Esta ação buscará os clientes habilitados na página "Gerenciar Clientes" e iniciará o processo de envio de faturas/boletos para eles.
            </p>
            <Button
                variant="info" // Cor diferente para esta ação
                onClick={handleStartEnvoys}
                disabled={isStarting} // Desabilita enquanto estiver enviando
            >
                {isStarting ? (
                    <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Iniciando Envios...</>
                ) : (
                    '🚀 Iniciar Envios Automáticos para Clientes Habilitados'
                )}
            </Button>
        </>
    );
};

export default StartEnvoysAction;