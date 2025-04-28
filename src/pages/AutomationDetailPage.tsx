// src/pages/AutomationDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Hook para pegar params da URL e para navegar
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner'; // Indicador de carregamento
import Alert from 'react-bootstrap/Alert'; // Para exibir erros ou mensagens
import Card from 'react-bootstrap/Card'; // Para organizar o conteúdo
import Badge from 'react-bootstrap/Badge'; // Para exibir status (habilitada/desabilitada)

// Hook de autenticação para obter dados do usuário e companyId
import { useAuth } from '../contexts/AuthContext';
// Função do serviço Firestore para buscar detalhes combinados e a interface do resultado
import { getCompanyAutomationDetails, CombinedAutomationDetails } from '../services/firestoreService';
import { Col, Row } from 'react-bootstrap';

const AutomationDetailPage: React.FC = () => {
    // Pegar o ID da instância da automação da URL (ex: "automacao_exemplo_1")
    const { automationInstanceId } = useParams<{ automationInstanceId: string }>();
    const navigate = useNavigate(); // Hook para navegação programática (ex: botão voltar)
    const { dbUser } = useAuth(); // Obter dados do usuário logado (inclui companyId)

    // Estado para armazenar os detalhes combinados (instância + template)
    const [details, setDetails] = useState<CombinedAutomationDetails | null>(null);
    // Estado para controlar o indicador de carregamento
    const [loading, setLoading] = useState<boolean>(true);
    // Estado para armazenar mensagens de erro
    const [error, setError] = useState<string | null>(null);

    // Efeito para buscar os dados quando o componente é montado
    // ou quando o ID da instância ou o usuário/empresa mudam
    useEffect(() => {
        // Define uma função async interna para poder usar await
        const fetchDetails = async () => {
            setLoading(true); // Mostra o spinner
            setError(null);   // Limpa erros anteriores
            setDetails(null); // Limpa detalhes antigos antes da nova busca

            // Verifica se temos os IDs necessários antes de prosseguir
            if (!automationInstanceId || !dbUser?.companyId) {
                setError("Não foi possível obter o ID da automação ou da empresa.");
                console.error("Erro: automationInstanceId ou dbUser.companyId estão faltando.", { automationInstanceId, dbUser });
                setLoading(false);
                return; // Sai da função se os IDs não estiverem disponíveis
            }

            console.log(`Página Detalhes: Buscando dados combinados para inst: ${automationInstanceId}, comp: ${dbUser.companyId}`);
            try {
                // Chama a função do serviço para buscar os dados
                const fetchedDetails = await getCompanyAutomationDetails(dbUser.companyId, automationInstanceId);

                // Verifica se os detalhes foram encontrados
                if (fetchedDetails) {
                    setDetails(fetchedDetails); // Atualiza o estado com os dados encontrados
                    console.log("Detalhes carregados:", fetchedDetails);
                } else {
                    // Se o serviço retornou null (instância ou template não encontrados)
                    setError(`Não foi possível carregar os detalhes para a automação "${automationInstanceId}". Verifique se ela está corretamente configurada para sua empresa.`);
                }
            } catch (err) {
                // Captura qualquer erro inesperado durante a busca
                console.error("Erro na página de detalhes ao buscar dados:", err);
                setError("Ocorreu um erro inesperado ao buscar os detalhes da automação.");
            } finally {
                // Independentemente de sucesso ou falha, para de carregar
                setLoading(false);
            }
        };

        fetchDetails(); // Executa a função de busca

    }, [automationInstanceId, dbUser]); // Dependências: re-executa se o ID na URL ou o usuário mudar

    // Função placeholder para o botão "Iniciar"
    const handleStartAutomation = () => {
         // Usar o nome do template se disponível, senão o ID da instância
         const automationName = details?.template?.name || automationInstanceId;
         alert(`Iniciar automação: ${automationName} (simulação)`);
         // TODO: Implementar a lógica real para iniciar a automação (ex: chamada a Cloud Function)
    };

    // --- Renderização ---

    // 1. Renderiza um spinner enquanto os dados estão sendo buscados
    if (loading) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Carregando detalhes da automação...</p>
            </Container>
        );
    }

    // 2. Renderiza uma mensagem de erro se algo deu errado
    if (error) {
         return (
             <Container className="mt-4">
                 <Alert variant="danger">
                     <h4>Erro ao Carregar</h4>
                     <p>{error}</p>
                 </Alert>
                 <Button variant="secondary" onClick={() => navigate('/automations')}>
                     ← Voltar para Automações
                 </Button>
             </Container>
         );
    }

    // 3. Renderiza uma mensagem se os detalhes não foram encontrados (mesmo sem erro explícito)
    if (!details) {
         return (
             <Container className="mt-4">
                 <Alert variant="warning">
                     Detalhes da automação não encontrados.
                 </Alert>
                  <Button variant="outline-secondary" size="sm" onClick={() => navigate('/automations')}>
                     ← Voltar para Automações
                 </Button>
             </Container>
         );
    }

    // 4. Renderiza o conteúdo principal com os detalhes da automação encontrados
    return (
        <Container>
             {/* Botão para voltar à lista */}
             <Button variant="outline-secondary" size="sm" onClick={() => navigate('/automations')} className="mb-3">
                 ← Voltar para Automações
             </Button>

            {/* Card principal com os detalhes */}
            <Card bg="dark" text="white" border="secondary"> {/* Aplicando tema escuro diretamente */}
                <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                        {/* Nome da Automação (do template) */}
                        <h2 className="h3 mb-0">{details.template.name}</h2>
                        {/* Status Habilitada/Desabilitada (da instância) */}
                        <Badge bg={details.instance.enabled ? "success" : "secondary"} pill>
                            {details.instance.enabled ? "Habilitada" : "Desabilitada"}
                        </Badge>
                     </div>
                     {/* ID da Instância (para referência) */}
                     <small className="text-muted">ID da Instância: {details.instance.id}</small>
                </Card.Header>
                <Card.Body>
                    {/* Descrição da Automação (do template) */}
                    <Card.Text className="mb-4">{details.template.description}</Card.Text>

                    <Row>
                        <Col md={6}>
                            <h5 className="mt-2">Status Atual</h5>
                            <p>{details.instance.status || 'Não definido'}</p>
                        </Col>
                        <Col md={6}>
                            <h5 className="mt-2">Última Execução</h5>
                             {details.instance.lastRun ? (
                                 <p>{details.instance.lastRun.toDate().toLocaleString()}</p>
                             ) : (
                                 <p><small className="text-muted">Nunca executada</small></p>
                             )}
                        </Col>
                    </Row>

                    <h5 className="mt-4">Configuração Específica da Empresa</h5>
                     {/* Exibe a configuração como JSON formatado. */}
                     {/* ATENÇÃO: Revise se há dados sensíveis antes de exibir em produção. */}
                     {/* Idealmente, mostre campos específicos em um formulário (desabilitado por enquanto). */}
                     <pre style={{
                         backgroundColor: '#1a1a1a',
                         padding: '1rem',
                         borderRadius: '0.25rem',
                         color: '#e9ecef', // Cor de texto clara para contraste
                         maxHeight: '250px',
                         overflowY: 'auto',
                         whiteSpace: 'pre-wrap', // Quebra linha no JSON
                         wordBreak: 'break-all' // Quebra palavras longas
                         }}>
                        <code>{JSON.stringify(details.instance.config, null, 2)}</code>
                     </pre>
                     <p className="text-muted"><small><em>(Edição de configuração será implementada futuramente)</em></small></p>

                </Card.Body>
                <Card.Footer className="text-end bg-dark" style={{borderColor: '#444'}}>
                     {/* Botão para Iniciar a Automação */}
                     <Button
                        variant={details.instance.enabled ? "success" : "secondary"} // Verde se habilitada
                        size="lg"
                        onClick={handleStartAutomation}
                        disabled={!details.instance.enabled} // Desabilita se não estiver habilitada
                       >
                         {details.instance.enabled ? 'Iniciar Automação' : 'Automação Desabilitada'}
                     </Button>
                </Card.Footer>
            </Card>
        </Container>
    );
};

export default AutomationDetailPage;