// src/pages/ManageClientsPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import Container from "react-bootstrap/Container";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
// import Modal from 'react-bootstrap/Modal'; // Para depois (Criar/Editar)
// import Form from 'react-bootstrap/Form';   // Para depois (Criar/Editar)
import {
  BsPersonPlus,
  BsPencilFill,
  BsTrash,
  BsPower,
  BsCheckCircleFill,
} from "react-icons/bs"; // Ícones

import { useAuth } from "../contexts/AuthContext";
// Funções e Tipos do Firestore
import { db } from "../config/firebaseConfig"; // Importar db
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
} from "firebase/firestore"; // Funções Firestore
import { Modal } from "react-bootstrap";
import Form from "react-bootstrap/Form";
import {
  deleteClientRecipient,
  updateClientEnabledStatus,
  updateClientRecipient,
} from "../services/firestoreService";

// Interface para dados do Cliente Final
export interface ClientRecipient {
  id: string; // ID do documento Firestore
  name: string;
  responsible?: string;
  phone: string;
  email: string;
  enabled: boolean;
  driveFileNameHint?: string;
  lastWhatsappStatus?: string;
  lastEmailStatus?: string;
  lastStatusUpdate?: Timestamp;
}

const ManageClientsPage: React.FC = () => {
  const { currentUser, dbUser } = useAuth(); // Precisa de companyId
  const [clients, setClients] = useState<ClientRecipient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientRecipient | null>(
    null
  );
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [deleteClientError, setDeleteClientError] = useState<string | null>(
    null
  );
  const [clientName, setClientName] = useState("");
  const [ClientResponsible, setClientResponsible] = useState("");
  const [ClientPhone, setClientPhone] = useState("");
  const [ClientEmail, setClientEmail] = useState("");
  const [ClientDriveHint, setClientDriveHint] = useState("");
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [togglingClientId, setTogglingClientId] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false); // Renomeado
  const [editingClient, setEditingClient] = useState<ClientRecipient | null>(
    null
  ); // Para guardar cliente em edição
  // Efeito para ouvir a coleção de clientes da empresa logada
  useEffect(() => {
    setError(null);
    // Só inicia se tivermos companyId
    if (!dbUser?.companyId) {
      setLoading(false);
      // Poderia mostrar um erro se companyId for esperado mas não encontrado
      if (currentUser) setError("Não foi possível identificar sua empresa.");
      return;
    }

    console.log(
      `Listener: Configurando onSnapshot para clients da empresa ${dbUser.companyId}`
    );
    setLoading(true); // Inicia loading aqui

    const clientsColRef = collection(
      db,
      "companies",
      dbUser.companyId,
      "clients"
    );
    // Opcional: Ordenar a lista (ex: por nome)
    const q = query(clientsColRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const clientsData: ClientRecipient[] = [];
        querySnapshot.forEach((doc) => {
          clientsData.push({ id: doc.id, ...doc.data() } as ClientRecipient);
        });
        setClients(clientsData);
        setError(null); // Limpa erro se receber dados
        setLoading(false); // Finaliza loading após receber dados
        console.log("Listener: Lista de clientes atualizada.", clientsData);
      },
      (err) => {
        // Callback de erro do listener
        console.error("Erro no listener de clientes:", err);
        setError("Erro ao carregar a lista de clientes.");
        setClients([]); // Limpa lista em caso de erro
        setLoading(false); // Finaliza loading
      }
    );

    // Limpeza ao desmontar
    return () => {
      console.log("Listener: Parando listener de clientes.");
      unsubscribe();
    };
  }, [dbUser?.companyId, currentUser]); // Depende de companyId e currentUser

  type NewClientRecipientData = Omit<
    ClientRecipient,
    "id" | "lastWhatsappStatus" | "lastEmailStatus" | "lastStatusUpdate"
  > & { createdAt?: any };

  type UpdateClientRecipientData = Omit<
    ClientRecipient,
    | "id"
    | "createdAt"
    | "lastWhatsappStatus"
    | "lastEmailStatus"
    | "lastStatusUpdate"
    | "enabled"
  >;

  // --- Funções CRUD (a implementar com Modais) ---

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
      console.log(
        `Excluindo cliente ${clientToDelete.id} da empresa ${dbUser.companyId}...`
      );
      await deleteClientRecipient(dbUser.companyId, clientToDelete.id); // Chama o serviço

      console.log("Cliente excluído com sucesso!");
      handleCloseDeleteClientModal();
      // A lista será atualizada automaticamente pelo onSnapshot
    } catch (err: any) {
      console.error("Erro ao excluir cliente:", err);
      setDeleteClientError(err.message || "Falha ao excluir cliente.");
    } finally {
      setIsDeletingClient(false);
    }
  };
  // ------------------------------------------------

  const handleToggleClientStatus = async (client: ClientRecipient) => {
    if (!dbUser?.companyId) {
      alert("Erro: ID da empresa não encontrado.");
      return;
    }

    const newStatus = !client.enabled;
    const actionText = newStatus ? "habilitar" : "desabilitar";

    // Confirmação opcional
    // if (!confirm(`Tem certeza que deseja ${actionText} o cliente "${client.name}"?`)) {
    //     return;
    // }

    setTogglingClientId(client.id); // Indica que este cliente está sendo alterado
    try {
      console.log(
        `Trocando status 'enabled' para ${newStatus} no cliente ${client.id}`
      );
      await updateClientEnabledStatus(dbUser.companyId, client.id, newStatus);
      // A lista será atualizada automaticamente pelo onSnapshot.
      // Se não fosse, chamaríamos fetchClients() aqui.
      console.log(`Status do cliente ${client.id} alterado com sucesso.`);
    } catch (error: any) {
      console.error(`Erro ao ${actionText} cliente:`, error);
      alert(
        `Erro ao ${actionText} cliente: ${error.message || "Erro desconhecido"}`
      );
    } finally {
      setTogglingClientId(null); // Limpa o estado de loading específico
    }
  };

  const handleShowClientModal = (
    clientToEdit: ClientRecipient | null = null
  ) => {
    setEditingClient(clientToEdit); // Define se estamos editando ou criando
    setModalError(null);

    if (clientToEdit) {
      // Modo Edição: Preenche o formulário com dados existentes
      setClientName(clientToEdit.name);
      setClientResponsible(clientToEdit.responsible || "");
      setClientPhone(clientToEdit.phone);
      setClientEmail(clientToEdit.email);
      setClientDriveHint(clientToEdit.driveFileNameHint || "");
    } else {
      // Modo Adição: Limpa o formulário
      setClientName("");
      setClientResponsible("");
      setClientPhone("");
      setClientEmail("");
      setClientDriveHint("");
    }
    setShowClientModal(true); // Abre o modal
  };

  const handleCloseClientModal = () => {
    if (!isSubmittingClient) {
      setShowClientModal(false);
      setEditingClient(null); // Limpa o cliente em edição ao fechar
    }
  };

  const handleClientSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setModalError(null);

    if (!clientName.trim() || !ClientPhone.trim() || !ClientEmail.trim()) {
      setModalError("Nome, Telefone e Email são obrigatórios.");
      return;
    }
    if (!dbUser?.companyId) {
      setModalError("ID da empresa não encontrado.");
      return;
    }

    setIsSubmittingClient(true);
    try {
      const clientFormData: UpdateClientRecipientData = {
        // Usa tipo para dados editáveis
        name: clientName.trim(),
        responsible: ClientResponsible.trim() || undefined,
        phone: ClientPhone.trim(),
        email: ClientEmail.trim(),
        driveFileNameHint: ClientDriveHint.trim() || undefined,
      };

      if (editingClient) {
        // --- MODO EDIÇÃO ---
        console.log(`Atualizando cliente ${editingClient.id}:`, clientFormData);
        // Chamar função updateClientRecipient (a ser criada)
        // await updateClientRecipient(dbUser.companyId, editingClient.id, clientFormData);
        await updateClientRecipient(
          dbUser.companyId,
          editingClient.id,
          clientFormData
        );
      } else {
        // --- MODO CRIAÇÃO ---
        const newClientData: NewClientRecipientData = {
          ...clientFormData, // Dados do form
          enabled: true,
          createdAt: serverTimestamp(),
        };
        console.log("Adicionando novo cliente:", newClientData);
        const clientsColRef = collection(
          db,
          "companies",
          dbUser.companyId,
          "clients"
        );
        await addDoc(clientsColRef, newClientData);
        console.log("Novo cliente adicionado com sucesso!");
      }

      handleCloseClientModal(); // Fecha modal
      // onSnapshot já atualiza a lista
    } catch (err: any) {
      console.error(
        `Erro ao ${editingClient ? "atualizar" : "adicionar"} cliente:`,
        err
      );
      setModalError(
        err.message ||
          `Falha ao ${editingClient ? "atualizar" : "adicionar"} cliente.`
      );
    } finally {
      setIsSubmittingClient(false);
    }
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Gerenciar Clientes para Envio</h1>
        <Button variant="primary" onClick={() => handleShowClientModal()}>
          <BsPersonPlus /> Adicionar Cliente
        </Button>
      </div>

      {loading && (
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && (
        <Table
          striped
          bordered
          hover
          responsive
          variant="dark"
          size="sm"
          className="align-middle"
        >
          <thead>
            <tr>
              <th>Nome</th>
              <th>Responsável</th>
              <th>Telefone</th>
              <th>Email</th>
              <th className="text-center">Habilitado</th>
              <th>Status Wpp</th>
              <th>Status Email</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted">
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
                  <td className="text-center">
                    <Button
                      variant={client.enabled ? "success" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleClientStatus(client)}
                      // 👇 Desabilita se ESTE cliente estiver sendo alterado 👇
                      disabled={togglingClientId === client.id}
                      title={
                        client.enabled
                          ? "Clique para Desabilitar"
                          : "Clique para Habilitar"
                      }
                    >
                      {/* Mostra spinner se ESTE cliente estiver sendo alterado */}
                      {togglingClientId === client.id ? (
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                        />
                      ) : client.enabled ? (
                        <BsCheckCircleFill />
                      ) : (
                        <BsPower />
                      )}
                    </Button>
                  </td>
                  <td>
                    <Badge bg="secondary">
                      {client.lastWhatsappStatus || "-"}
                    </Badge>
                  </td>
                  <td>
                    <Badge bg="secondary">
                      {client.lastEmailStatus || "-"}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      variant="outline-info"
                      size="sm"
                      className="me-2"
                      onClick={() => handleShowClientModal(client)}
                    >
                      <BsPencilFill /> Editar
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleShowDeleteClientModal(client)}
                      disabled={
                        isDeletingClient && clientToDelete?.id === client.id
                      } // Desabilita só o botão do item sendo excluído
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

      <Modal
        show={showClientModal}
        onHide={handleCloseClientModal}
        backdrop="static"
        keyboard={!isSubmittingClient}
        centered
      >
        <Modal.Header closeButton={!isSubmittingClient}>
          <Modal.Title>
            {editingClient ? "Editar Cliente" : "Adicionar Novo Cliente"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleClientSubmit} id="addClientForm">
          <Modal.Body>
            {modalError && <Alert variant="danger">{modalError}</Alert>}

            <Form.Group className="mb-3" controlId="newClientName">
              <Form.Label>Nome do Cliente *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Nome completo do cliente"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={isSubmittingClient}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="newClientResponsible">
              <Form.Label>Contato Responsável (Opcional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Nome do contato principal"
                value={ClientResponsible}
                onChange={(e) => setClientResponsible(e.target.value)}
                disabled={isSubmittingClient}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="newClientPhone">
              <Form.Label>Telefone (com DDD e país) *</Form.Label>
              <Form.Control
                type="tel"
                placeholder="Ex: 5511999998888"
                required
                value={ClientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                disabled={isSubmittingClient}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="newClientEmail">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                placeholder="email@cliente.com"
                required
                value={ClientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                disabled={isSubmittingClient}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="newClientDriveHint">
              <Form.Label>Nome do Arquivo no Drive (Opcional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ex: Cliente Exemplo Alfa - Fatura Maio"
                value={ClientDriveHint}
                onChange={(e) => setClientDriveHint(e.target.value)}
                disabled={isSubmittingClient}
              />
              <Form.Text className="text-muted">
                Como o arquivo deste cliente é nomeado no Google Drive.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={handleCloseClientModal}
              disabled={isSubmittingClient}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="addClientForm"
              disabled={isSubmittingClient}
            >
              {isSubmittingClient ? (
                <>
                  <Spinner as="span" size="sm" /> Adicionando...
                </>
              ) : editingClient ? (
                "Editar Cliente"
              ) : (
                "Adicionar Novo Cliente"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={showDeleteClientModal}
        onHide={handleCloseDeleteClientModal}
        centered
      >
        <Modal.Header closeButton={!isDeletingClient}>
          <Modal.Title>Confirmar Exclusão de Cliente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteClientError && (
            <Alert variant="danger">{deleteClientError}</Alert>
          )}
          Tem certeza que deseja excluir o cliente{" "}
          <strong>{clientToDelete?.name || "Selecionado"}</strong>?
          <p className="text-danger mt-2">Esta ação não pode ser desfeita.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleCloseDeleteClientModal}
            disabled={isDeletingClient}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDeleteClient}
            disabled={isDeletingClient}
          >
            {isDeletingClient ? (
              <>
                {" "}
                <Spinner as="span" size="sm" /> Excluindo...{" "}
              </>
            ) : (
              "Confirmar Exclusão"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManageClientsPage;
