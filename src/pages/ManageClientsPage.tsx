// src/pages/ManageClientsPage.tsx
import React, { useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import {
  BsPersonPlus,
  BsPencilFill,
  BsTrash,
  BsPower,
  BsCheckCircleFill,
} from "react-icons/bs";

import { useAuth } from "../contexts/AuthContext";
import { db } from "../config/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp, // Importante ter Timestamp
} from "firebase/firestore";
import {
  deleteClientRecipient,
  updateClientEnabledStatus,
  updateClientRecipient, // Esta função precisa aceitar o campo dueDate
} from "../services/firestoreService";

// --- Funções Helper para Formatar Timestamps ---
const formatTimestampToDate = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return "-";
  try {
    const dateToFormat = timestamp.toDate();
    // Use getUTCFullYear(), getUTCMonth(), getUTCDate()
    const year = dateToFormat.getUTCFullYear();
    const month = (dateToFormat.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = dateToFormat.getUTCDate().toString().padStart(2, '0');
    return `${day}/${month}/${year}`; // Formato DD/MM/YYYY
  } catch (error) {
    console.error("Erro ao formatar timestamp para data:", error, timestamp);
    // Verificar se o objeto é realmente um Timestamp do Firestore
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('pt-BR');
    }
    return "Data inválida";
  }
};

const formatTimestampToDateTime = (
  timestamp: Timestamp | undefined
): string => {
  if (!timestamp) return "-";
  try {
    return timestamp.toDate().toLocaleString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error(
      "Erro ao formatar timestamp para data e hora:",
      error,
      timestamp
    );
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleString('pt-BR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }
    return "Data/hora inválida";
  }
};
// --- Fim Funções Helper ---

export interface ClientRecipient {
  id: string;
  name: string;
  responsible?: string;
  phone: string;
  email: string;
  enabled: boolean;
  driveFileNameHint?: string;
  lastWhatsappStatus?: string;
  lastEmailStatus?: string;
  lastStatusUpdate?: Timestamp; // Já existe
  createdAt?: Timestamp;
  dueDate?: Timestamp; // << ADICIONAR ESTE
  lastPaymentReminderSentWhatsapp?: Timestamp;
  lastPaymentReminderSentEmail?: Timestamp;
}

// Tipos para os dados do formulário
type ClientFormData = {
  name: string;
  responsible?: string;
  phone: string;
  email: string;
  driveFileNameHint?: string;
  dueDate?: Timestamp; // Será Timestamp ao enviar para o Firestore
};

const ManageClientsPage: React.FC = () => {
  const { currentUser, dbUser } = useAuth();
  const [clients, setClients] = useState<ClientRecipient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Estados do Modal de Adicionar/Editar Cliente
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecipient | null>(null);
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Campos do Formulário do Modal
  const [clientName, setClientName] = useState("");
  const [clientResponsible, setClientResponsible] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientDriveHint, setClientDriveHint] = useState("");
  const [clientDueDate, setClientDueDate] = useState<string>(""); // Input type="date" usa string YYYY-MM-DD

  // Estados do Modal de Exclusão
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientRecipient | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [deleteClientError, setDeleteClientError] = useState<string | null>(null);

  const [togglingClientId, setTogglingClientId] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (!dbUser?.companyId) {
      setLoading(false);
      if (currentUser) setError("Não foi possível identificar sua empresa.");
      return;
    }

    setLoading(true);
    const clientsColRef = collection(db, "companies", dbUser.companyId, "clients");
    const q = query(clientsColRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const clientsData: ClientRecipient[] = [];
        querySnapshot.forEach((doc) => {
          // Importante: Converter os campos de data do Firestore para Timestamp se necessário
          // Firestore SDK v9+ geralmente já retorna objetos Timestamp
          const data = doc.data();
          clientsData.push({
            id: doc.id,
            ...data,
            // Garantir que os Timestamps são de fato Timestamps
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
            lastStatusUpdate: data.lastStatusUpdate instanceof Timestamp ? data.lastStatusUpdate : undefined,
            dueDate: data.dueDate instanceof Timestamp ? data.dueDate : undefined,
            lastPaymentReminderSentWhatsapp: data.lastPaymentReminderSentWhatsapp instanceof Timestamp ? data.lastPaymentReminderSentWhatsapp : undefined,
            lastPaymentReminderSentEmail: data.lastPaymentReminderSentEmail instanceof Timestamp ? data.lastPaymentReminderSentEmail : undefined,
          } as ClientRecipient);
        });
        setClients(clientsData);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Erro no listener de clientes:", err);
        setError("Erro ao carregar a lista de clientes.");
        setClients([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [dbUser?.companyId, currentUser]);

  const handleShowClientModal = (clientToEdit: ClientRecipient | null = null) => {
  setEditingClient(clientToEdit); // Define se estamos editando ou criando um novo
  setModalError(null); // Limpa erros anteriores do modal

  if (clientToEdit) {
    // Modo Edição: Preenche o formulário com dados existentes do cliente
    setClientName(clientToEdit.name);
    setClientResponsible(clientToEdit.responsible || ""); // Usa string vazia se for undefined
    setClientPhone(clientToEdit.phone);
    setClientEmail(clientToEdit.email);
    setClientDriveHint(clientToEdit.driveFileNameHint || "");

    // CORREÇÃO APLICADA AQUI:
    // Converte o Timestamp do Firestore para uma string no formato YYYY-MM-DD
    // que o input type="date" espera, usando a data local do usuário.
    if (clientToEdit.dueDate) {
      const dateForInput = clientToEdit.dueDate.toDate(); // Converte para Date (mantém o ponto no tempo)
    // Use getUTCFullYear(), getUTCMonth(), getUTCDate()
    const year = dateForInput.getUTCFullYear();
    const month = (dateForInput.getUTCMonth() + 1).toString().padStart(2, '0'); // Mês é 0-indexed
    const day = dateForInput.getUTCDate().toString().padStart(2, '0');
    setClientDueDate(`${year}-${month}-${day}`);
    } else {
      setClientDueDate(""); // Se não houver dueDate, limpa o campo
    }

  } else {
    // Modo Adição: Limpa todos os campos do formulário
    setClientName("");
    setClientResponsible("");
    setClientPhone("");
    setClientEmail("");
    setClientDriveHint("");
    setClientDueDate(""); // Limpa o campo de data
  }

  setShowClientModal(true); // Abre o modal
};

  const handleCloseClientModal = () => {
    if (!isSubmittingClient) {
      setShowClientModal(false);
      setEditingClient(null);
    }
  };

  const handleClientSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModalError(null);

    if (!clientName.trim() || !clientPhone.trim() || !clientEmail.trim() || !clientDueDate.trim()) {
      setModalError("Nome, Telefone, Email e Data de Vencimento são obrigatórios.");
      return;
    }
    if (!dbUser?.companyId) {
      setModalError("ID da empresa não encontrado.");
      return;
    }

    setIsSubmittingClient(true);
    try {
      let dueDateAsTimestamp: Timestamp | undefined = undefined;
      if (clientDueDate) {
        // Adicionar T00:00:00 para evitar problemas de fuso local ao converter para Date, e usar UTC (Z)
        const dateObj = new Date(clientDueDate + "T00:00:00.000Z");
        if (!isNaN(dateObj.getTime())) {
          dueDateAsTimestamp = Timestamp.fromDate(dateObj);
        } else {
          setModalError("Data de vencimento inválida.");
          setIsSubmittingClient(false);
          return;
        }
      }

      const clientDataPayload: ClientFormData = {
        name: clientName.trim(),
        responsible: clientResponsible.trim() || undefined,
        phone: clientPhone.trim(),
        email: clientEmail.trim(),
        driveFileNameHint: clientDriveHint.trim() || undefined,
        dueDate: dueDateAsTimestamp,
      };

      if (editingClient) {
        const updatePayload = {
          ...clientDataPayload,
          lastStatusUpdate: serverTimestamp(),
        };
        await updateClientRecipient(
          dbUser.companyId,
          editingClient.id,
          updatePayload // updateClientRecipient deve aceitar Partial<ClientRecipient> ou este formato
        );
      } else {
        const newClientPayload = {
          ...clientDataPayload,
          enabled: true,
          createdAt: serverTimestamp(),
          lastStatusUpdate: serverTimestamp(),
          // lastPaymentReminderSentWhatsapp e Email são definidos pelo n8n, não aqui
        };
        const clientsColRef = collection(db, "companies", dbUser.companyId, "clients");
        await addDoc(clientsColRef, newClientPayload);
      }

      handleCloseClientModal();
    } catch (err: any) {
      console.error(`Erro ao ${editingClient ? "atualizar" : "adicionar"} cliente:`, err);
      setModalError(err.message || `Falha ao ${editingClient ? "atualizar" : "adicionar"} cliente.`);
    } finally {
      setIsSubmittingClient(false);
    }
  };

  const handleToggleClientStatus = async (client: ClientRecipient) => {
    if (!dbUser?.companyId) return;
    const newStatus = !client.enabled;
    setTogglingClientId(client.id);
    try {
      await updateClientEnabledStatus(dbUser.companyId, client.id, newStatus);
    } catch (error: any) {
      alert(`Erro ao alterar status: ${error.message}`);
    } finally {
      setTogglingClientId(null);
    }
  };

  const handleShowDeleteClientModal = (client: ClientRecipient) => {
    setClientToDelete(client);
    setDeleteClientError(null);
    setShowDeleteClientModal(true);
  };

  const handleCloseDeleteClientModal = () => {
    if (!isDeletingClient) {
      setShowDeleteClientModal(false);
      setClientToDelete(null);
    }
  };

  const handleConfirmDeleteClient = async () => {
    if (!clientToDelete || !dbUser?.companyId) return;
    setIsDeletingClient(true);
    setDeleteClientError(null);
    try {
      await deleteClientRecipient(dbUser.companyId, clientToDelete.id);
      handleCloseDeleteClientModal();
    } catch (err: any) {
      setDeleteClientError(err.message || "Falha ao excluir cliente.");
    } finally {
      setIsDeletingClient(false);
    }
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Gerenciar Clientes</h1>
        <Button variant="primary" onClick={() => handleShowClientModal()}>
          <BsPersonPlus /> Adicionar Cliente
        </Button>
      </div>

      {loading && (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
          <p>Carregando clientes...</p>
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && (
        <Table striped bordered hover responsive variant="dark" size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Responsável</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Vencimento</th> {/* NOVA COLUNA */}
              <th className="text-center">Habilitado</th>
              <th>Envio Wpp</th> {/* Renomeado */}
              <th>Envio Email</th> {/* Renomeado */}
              <th>Lembrete Wpp</th> {/* NOVA COLUNA */}
              <th>Lembrete Email</th> {/* NOVA COLUNA */}
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center text-muted py-3"> {/* Ajustado colSpan */}
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>{client.responsible || "-"}</td>
                  <td>{client.phone}</td>
                  <td>{client.email}</td>
                  <td>{formatTimestampToDate(client.dueDate)}</td> {/* NOVO DADO */}
                  <td className="text-center">
                    <Button
                      variant={client.enabled ? "success" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleClientStatus(client)}
                      disabled={togglingClientId === client.id}
                      title={client.enabled ? "Clique para Desabilitar" : "Clique para Habilitar"}
                    >
                      {togglingClientId === client.id ? (
                        <Spinner as="span" animation="border" size="sm" />
                      ) : client.enabled ? (
                        <BsCheckCircleFill />
                      ) : (
                        <BsPower />
                      )}
                    </Button>
                  </td>
                  <td><Badge bg="info" text="dark">{client.lastWhatsappStatus || "-"}</Badge></td>
                  <td><Badge bg="info" text="dark">{client.lastEmailStatus || "-"}</Badge></td>
                  <td> {/* NOVO DADO */}
                    <Badge bg={client.lastPaymentReminderSentWhatsapp ? "success" : "secondary"}>
                      {formatTimestampToDateTime(client.lastPaymentReminderSentWhatsapp)}
                    </Badge>
                  </td>
                  <td> {/* NOVO DADO */}
                    <Badge bg={client.lastPaymentReminderSentEmail ? "success" : "secondary"}>
                      {formatTimestampToDateTime(client.lastPaymentReminderSentEmail)}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      variant="outline-info"
                      size="sm"
                      className="me-2 mb-1 mb-md-0" // Ajuste para telas menores
                      onClick={() => handleShowClientModal(client)}
                    >
                      <BsPencilFill />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleShowDeleteClientModal(client)}
                      disabled={isDeletingClient && clientToDelete?.id === client.id}
                    >
                      {isDeletingClient && clientToDelete?.id === client.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <BsTrash />
                      )}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {/* Modal de Adicionar/Editar Cliente */}
      <Modal
        show={showClientModal}
        onHide={handleCloseClientModal}
        backdrop="static"
        keyboard={!isSubmittingClient}
        centered
      >
        <Modal.Header closeButton={!isSubmittingClient}>
          <Modal.Title>{editingClient ? "Editar Cliente" : "Adicionar Novo Cliente"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleClientSubmit} id="clientForm">
          <Modal.Body>
            {modalError && <Alert variant="danger">{modalError}</Alert>}
            <Form.Group className="mb-3" controlId="clientName">
              <Form.Label>Nome do Cliente *</Form.Label>
              <Form.Control type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} required disabled={isSubmittingClient} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="clientResponsible">
              <Form.Label>Contato Responsável (Opcional)</Form.Label>
              <Form.Control type="text" value={clientResponsible} onChange={(e) => setClientResponsible(e.target.value)} disabled={isSubmittingClient} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="clientPhone">
              <Form.Label>Telefone (com DDD e país) *</Form.Label>
              <Form.Control type="tel" placeholder="Ex: 5511999998888" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} required disabled={isSubmittingClient} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="clientEmail">
              <Form.Label>Email *</Form.Label>
              <Form.Control type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required disabled={isSubmittingClient} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="clientDriveHint">
              <Form.Label>Nome do Arquivo no Drive (Opcional)</Form.Label>
              <Form.Control type="text" value={clientDriveHint} onChange={(e) => setClientDriveHint(e.target.value)} disabled={isSubmittingClient} />
            </Form.Group>
            {/* NOVO CAMPO - DATA DE VENCIMENTO */}
            <Form.Group className="mb-3" controlId="clientDueDate">
              <Form.Label>Data de Vencimento *</Form.Label>
              <Form.Control type="date" value={clientDueDate} onChange={(e) => setClientDueDate(e.target.value)} required disabled={isSubmittingClient} />
              <Form.Text className="text-muted">
                Data de vencimento da fatura/serviço para este cliente.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseClientModal} disabled={isSubmittingClient}>Cancelar</Button>
            <Button variant="primary" type="submit" form="clientForm" disabled={isSubmittingClient}>
              {isSubmittingClient ? <><Spinner as="span" size="sm" /> Salvando...</> : (editingClient ? "Salvar Alterações" : "Adicionar Cliente")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal show={showDeleteClientModal} onHide={handleCloseDeleteClientModal} centered>
        <Modal.Header closeButton={!isDeletingClient}><Modal.Title>Confirmar Exclusão</Modal.Title></Modal.Header>
        <Modal.Body>
          {deleteClientError && <Alert variant="danger">{deleteClientError}</Alert>}
          Tem certeza que deseja excluir o cliente <strong>{clientToDelete?.name || "Selecionado"}</strong>?
          <p className="text-danger mt-2">Esta ação não pode ser desfeita.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteClientModal} disabled={isDeletingClient}>Cancelar</Button>
          <Button variant="danger" onClick={handleConfirmDeleteClient} disabled={isDeletingClient}>
            {isDeletingClient ? <><Spinner as="span" size="sm" /> Excluindo...</> : "Confirmar Exclusão"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManageClientsPage;