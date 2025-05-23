// src/components/automation_actions/PaymentReminderSettings.tsx

import React, { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebaseConfig"; // Ajuste o caminho
import { useAuth } from "../../contexts/AuthContext"; // Para companyId
// Se você tiver uma interface CompanyAutomation, importe-a
// import { CompanyAutomation } from '../../services/firestoreService'; // ou de onde ela estiver

import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge"; // Para status
import firebase from "firebase/compat/app";

// Supondo que a interface CompanyAutomation já existe e é importada
// Se não, defina uma aqui ou importe do seu firestoreService.ts
interface CompanyAutomation {
  id: string;
  automationId: string;
  enabled: boolean;
  config?: { [key: string]: any };
  lastRun?: firebase.firestore.Timestamp | any; // Use o tipo Timestamp correto do seu SDK
  status?: string; // ex: 'idle', 'processing_daily_check', 'completed_daily_check'
  lastRunDetails?: {
    remindersSentWhatsapp?: number;
    remindersSentEmail?: number;
    clientsProcessed?: number;
    errorsEncountered?: number;
    timestamp?: firebase.firestore.Timestamp | any;
  };
  errorMessage?: string;
}

interface PaymentReminderSettingsProps {
  instanceId: string; // ID da instância da automação (MGGct7RZTCgk2eWwDpb4)
  // companyId pode vir do AuthContext
}

const PaymentReminderSettings: React.FC<PaymentReminderSettingsProps> = ({
  instanceId,
}) => {
  const { dbUser } = useAuth();
  const [instanceData, setInstanceData] = useState<CompanyAutomation | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<boolean>(false);

  const companyId = dbUser?.companyId;

  useEffect(() => {
    if (!companyId || !instanceId) {
      setError("Informações da empresa ou da automação não encontradas.");
      setLoading(false);
      return;
    }

    const instanceDocRef = doc(
      db,
      "companies",
      companyId,
      "company_automations",
      instanceId
    );
    setLoading(true);

    const unsubscribe = onSnapshot(
      instanceDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setInstanceData({
            id: docSnap.id,
            ...docSnap.data(),
          } as CompanyAutomation);
          setError(null);
        } else {
          setError(
            "Configuração desta automação não encontrada para sua empresa."
          );
          setInstanceData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao buscar dados da instância da automação:", err);
        setError("Falha ao carregar dados da automação.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId, instanceId]);

  const handleToggleEnabled = async () => {
    const newStatus = !instanceData?.enabled;

    console.log("Tentando toggle. Usuário dbUser:", dbUser);
    console.log("companyId para a regra:", companyId); // companyId = dbUser?.companyId
    console.log("instanceId para a regra:", instanceId);
    console.log("Dados da instância atual:", instanceData);
    console.log("Novo status 'enabled' a ser salvo:", newStatus);
    if (!companyId || !instanceId || !instanceData) return;

    setIsToggling(true);
    const instanceDocRef = doc(
      db,
      "companies",
      companyId,
      "company_automations",
      instanceId
    );

    try {
      await updateDoc(instanceDocRef, {
        enabled: newStatus,
      });
      // O onSnapshot já deve atualizar instanceData, não precisa de setState aqui.
      console.log(
        `Automação ${instanceId} ${newStatus ? "habilitada" : "desabilitada"}.`
      );
    } catch (err) {
      console.error("Erro ao atualizar status da automação:", err);
      // Poderia reverter visualmente ou mostrar um erro mais persistente
      alert("Falha ao alterar o status da automação.");
    } finally {
      setIsToggling(false);
    }
  };

  // Helper para formatar timestamp (similar ao que você tem em ManageClientsPage)
  const formatTimestamp = (
    timestamp: firebase.firestore.Timestamp | any | undefined
  ): string => {
    if (!timestamp) return "N/A";
    // Adapte para o tipo de Timestamp do seu SDK (v8 ou v9)
    if (timestamp && typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    }
    return "Data inválida";
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p>Carregando configurações da automação...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!instanceData) {
    return (
      <Alert variant="warning">
        Configurações da automação não encontradas.
      </Alert>
    );
  }

  return (
    <Card bg="dark" text="white" className="mb-4">
      <Card.Header as="h5">
        Configurações: Envio Automático de Lembretes
        <Badge
          bg={instanceData.enabled ? "success" : "secondary"}
          className="ms-2"
        >
          {instanceData.enabled ? "Habilitada" : "Desabilitada"}
        </Badge>
      </Card.Header>
      <Card.Body>
        <p>
          Esta automação enviará lembretes de pagamento para seus clientes
          habilitados conforme as datas de vencimento e configurações definidas
          pelo administrador.
        </p>

        <Form.Group className="mb-3 d-flex align-items-center">
          <Form.Label htmlFor="automation-enabled-switch" className="me-3 mb-0">
            Status da Automação:
          </Form.Label>
          <Form.Check
            type="switch"
            id="automation-enabled-switch"
            label={
              instanceData.enabled
                ? "Desabilitar Automação"
                : "Habilitar Automação"
            }
            checked={instanceData.enabled}
            onChange={handleToggleEnabled}
            disabled={isToggling}
          />
          {isToggling && (
            <Spinner animation="border" size="sm" className="ms-2" />
          )}
        </Form.Group>

        <hr />

        <h5>Última Atividade</h5>
        {instanceData.lastRun ? (
          <>
            <p>
              <strong>Última Verificação Agendada:</strong>{" "}
              {formatTimestamp(instanceData.lastRun)}
            </p>
            <p>
              <strong>Status da Última Verificação:</strong>{" "}
              <Badge
                bg={
                  instanceData.status === "error_daily_check"
                    ? "danger"
                    : instanceData.status === "completed_daily_check"
                    ? "success"
                    : "secondary"
                }
              >
                {instanceData.status || "Não disponível"}
              </Badge>
            </p>
            {instanceData.lastRunDetails && (
              <>
                <p>
                  Clientes Processados:{" "}
                  {instanceData.lastRunDetails.clientsProcessed ?? "N/A"}
                </p>
                <p>
                  Lembretes WhatsApp Enviados:{" "}
                  {instanceData.lastRunDetails.remindersSentWhatsapp ?? "N/A"}
                </p>
                <p>
                  Lembretes Email Enviados:{" "}
                  {instanceData.lastRunDetails.remindersSentEmail ?? "N/A"}
                </p>
                {(instanceData.lastRunDetails?.errorsEncountered ?? 0) > 0 && (
                  <p className="text-danger">
                    Erros Encontrados:{" "}
                    {instanceData.lastRunDetails.errorsEncountered}
                  </p>
                )}
              </>
            )}
            {instanceData.errorMessage && (
              <Alert variant="warning" className="mt-2">
                <strong>Mensagem da Última Execução:</strong>{" "}
                {instanceData.errorMessage}
              </Alert>
            )}
          </>
        ) : (
          <p>
            Esta automação ainda não foi executada ou não há registros da última
            execução.
          </p>
        )}
      </Card.Body>
    </Card>
  );
};

export default PaymentReminderSettings;
