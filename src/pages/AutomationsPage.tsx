// src/pages/AutomationsPage.tsx
import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner'; // Para indicar carregamento
import Alert from 'react-bootstrap/Alert'; // Para mensagens

// Importar hook de autenticação para pegar companyId
import { useAuth } from '../contexts/AuthContext';

// Importar função do serviço Firestore e a interface
import { getCompanyAutomations, CompanyAutomation } from '../services/firestoreService';

const AutomationsPage: React.FC = () => {
    // Estado para armazenar a lista de automações da empresa
    const [automations, setAutomations] = useState<CompanyAutomation[]>([]);
    // Estado para indicar carregamento dos dados
    const [loading, setLoading] = useState<boolean>(true);
    // Estado para mensagens de erro ou informativas
    const [message, setMessage] = useState<string | null>(null);

    // Obter dados do usuário logado (incluindo companyId) do contexto
    const { dbUser } = useAuth();

    // Efeito para buscar os dados quando o componente montar ou dbUser mudar
    useEffect(() => {
        // Função async interna para buscar os dados
        const fetchAutomations = async () => {
            // Garantir que temos o dbUser e a companyId antes de buscar
            if (dbUser && dbUser.companyId) {
                setLoading(true); // Inicia o carregamento
                setMessage(null); // Limpa mensagens anteriores
                try {
                    console.log(`AutomationsPage: Buscando automações para companyId ${dbUser.companyId}`);
                    const companyAutomations = await getCompanyAutomations(dbUser.companyId);
                    setAutomations(companyAutomations); // Atualiza o estado com os dados buscados

                    if (companyAutomations.length === 0) {
                        setMessage("Nenhuma automação habilitada encontrada para sua empresa.");
                    }

                } catch (error) {
                    console.error("Erro ao buscar automações na página:", error);
                    setMessage("Falha ao carregar as automações. Tente novamente mais tarde.");
                    setAutomations([]); // Limpa automações em caso de erro
                } finally {
                    setLoading(false); // Finaliza o carregamento
                }
            } else {
                // Se não houver dbUser ou companyId (pode acontecer brevemente ou se houver erro no AuthContext)
                console.log("AutomationsPage: Aguardando dados do usuário ou companyId não encontrada.");
                setMessage("Não foi possível identificar a empresa do usuário.");
                setLoading(false);
                setAutomations([]);
            }
        };

        fetchAutomations(); // Chama a função de busca

    }, [dbUser]); // O efeito depende do dbUser (re-executa se dbUser mudar)

    // --- Renderização ---

    // Renderiza um spinner enquanto carrega
    if (loading) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Carregando automações...</p>
            </Container>
        );
    }

    // Renderiza a página principal com os cards
    return (
        <Container fluid>
            <h1 className="mb-4">Automações Disponíveis</h1>

            {/* Exibe mensagens de erro ou informativas */}
            {message && <Alert variant={automations.length === 0 && !message.includes("Falha") ? "info" : "warning"}>{message}</Alert>}

            {/* Renderiza os cards das automações */}
            <Row xs={1} md={2} lg={3} className="g-4"> {/* Grid responsivo */}
                {automations.map((automation) => (
                    <Col key={automation.id}>
                        <Card className="h-100"> {/* h-100 para cards terem mesma altura na linha */}
                             {/* Opcional: Adicionar um Card.Header ou Card.Img */}
                            <Card.Body className="d-flex flex-column"> {/* Flex column para empurrar botão para baixo */}
                                <Card.Title>{automation.name || automation.id}</Card.Title>
                                <Card.Text>
                                    {/* Poderíamos buscar a descrição do template se necessário */}
                                    Status: {automation.status || 'Indefinido'} <br/>
                                    {/* Mostrar algumas configs? Cuidado com dados sensíveis! */}
                                    {/* Config: {JSON.stringify(automation.config)} */}
                                </Card.Text>
                                <Button
                                    variant="primary"
                                    className="mt-auto"
                                    href={`/automations/${automation.id}`} // Define o destino dinâmico
                                >
                                    Gerenciar
                                </Button>
                            </Card.Body>
                             {/* Opcional: Adicionar um Card.Footer com lastRun */}
                             {automation.lastRun && (
                                <Card.Footer>
                                    <small className="text-muted">
                                        Última execução: {automation.lastRun.toDate().toLocaleString()}
                                     </small>
                                 </Card.Footer>
                             )}
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
};

export default AutomationsPage;