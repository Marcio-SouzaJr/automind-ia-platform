// src/pages/AutomationsPage.tsx (Página que LISTA as automações)
import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import { Link } from 'react-router-dom'; // 1. Importar Link

import { useAuth } from '../contexts/AuthContext';
import { getCompanyAutomations, CompanyAutomation } from '../services/firestoreService';

// Removido :React.FC para evitar problemas de tipo, TypeScript inferirá
const AutomationsPage = () => {
    const [automations, setAutomations] = useState<CompanyAutomation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [message, setMessage] = useState<string | null>(null);
    const { dbUser } = useAuth();

    useEffect(() => {
        const fetchAutomations = async () => {
            if (dbUser && dbUser.companyId) {
                setLoading(true); setMessage(null);
                try {
                    const companyAutomationsData = await getCompanyAutomations(dbUser.companyId);
                    setAutomations(companyAutomationsData);
                    if (companyAutomationsData.length === 0) {
                        setMessage("Nenhuma automação habilitada encontrada para sua empresa.");
                    }
                } catch (error) {
                    console.error("Erro ao buscar automações na página:", error);
                    setMessage("Falha ao carregar as automações.");
                    setAutomations([]);
                } finally {
                    setLoading(false);
                }
            } else {
                if (dbUser) { // Se tem dbUser mas não companyId
                    console.warn("AutomationsPage: companyId não encontrado em dbUser.");
                    setMessage("Não foi possível identificar a empresa do usuário para carregar as automações.");
                } else {
                    console.log("AutomationsPage: Aguardando dados do usuário (dbUser).");
                    // Não define mensagem aqui, AuthContext pode estar carregando
                }
                setLoading(false);
                setAutomations([]);
            }
        };

        // Só busca se dbUser estiver definido para evitar chamadas com companyId undefined
        if(dbUser) {
            fetchAutomations();
        } else if (dbUser === null) { // Se dbUser é explicitamente null (não carregando mais)
            setLoading(false);
            setMessage("Faça login para ver suas automações.");
        }

    }, [dbUser]);

    if (loading) {
        return ( <Container className="text-center mt-5"><Spinner animation="border" variant="primary" /><p className="mt-2">Carregando...</p></Container> );
    }

    return (
        <Container fluid>
            <h1 className="mb-4">Automações Disponíveis</h1>
            {message && <Alert variant={automations.length === 0 && !message.includes("Falha") ? "info" : "warning"}>{message}</Alert>}

            {automations.length > 0 && (
                <Row xs={1} md={2} lg={3} className="g-4">
                    {automations.map((automation) => (
                        <Col key={automation.id}>
                            <Card className="h-100">
                                <Card.Body className="d-flex flex-column">
                                    {/* Idealmente, buscaríamos o nome do template aqui */}
                                    <Card.Title>{automation.name || automation.automationId || automation.id}</Card.Title>
                                    <Card.Text>
                                        Status: {automation.status || 'Indefinido'}
                                    </Card.Text>
                                    {/* 👇 2. Usar Link envolvendo o Button 👇 */}
                                    <Link
                                        to={`/automations/${automation.id}`}
                                        className="mt-auto text-decoration-none d-block" // d-block para o Link preencher o botão
                                    >
                                        <Button
                                            variant="primary"
                                            className="w-100" // Botão preenche o Link
                                        >
                                            Gerenciar
                                        </Button>
                                    </Link>
                                </Card.Body>
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
            )}
        </Container>
    );
};

export default AutomationsPage;