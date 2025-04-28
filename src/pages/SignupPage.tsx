// src/pages/SignupPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import { signUp } from '../services/authService';

// Importar função de signup (criaremos depois)
// import { signUp } from '../services/authService';

// Importar hook de contexto (criaremos depois)
// import { useAuth } from '../contexts/AuthContext';

const cardStyle: React.CSSProperties = {
    backgroundColor: '#2C2C2C',
    color: '#fff',
    border: 'none',
    padding: '2rem',
    width: '100%'
};

const inputStyle: React.CSSProperties = {
    backgroundColor: '#404040',
    color: '#fff',
    border: '1px solid #555'
};

const SignupPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [companyCode, setCompanyCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    // const { signup } = useAuth(); // Descomentar com context

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        // Validação de senha
        if (password !== confirmPassword) {
            return setError('As senhas não coincidem.');
        }

        // Validação de força da senha (opcional, mas recomendado)
        if (password.length < 6) {
             return setError('A senha deve ter pelo menos 6 caracteres.');
        }

        if (!companyCode.trim()) return setError('Por favor, insira o Código da Empresa.');

        try {
            setLoading(true);
            console.log(`Tentando cadastro com email: ${email} e código: ${companyCode.trim()}`);
    
            // 👇 CHAMADA ATUALIZADA: Passar companyCode para signUp 👇
            const userCredential = await signUp(email, password, companyCode.trim());
    
            // Se chegou aqui, tudo deu certo (Auth e Firestore)
            console.log('Cadastro bem-sucedido (UI):', userCredential.user.uid);
            alert('Conta criada com sucesso! Por favor, faça login.');
            navigate('/login'); // Redireciona para login
    
        } catch (err: any) {
            // 👇 BLOCO CATCH ATUALIZADO 👇
            console.error("Erro no cadastro (capturado na página):", err);
    
            let errorMessage = 'Falha ao criar conta. Tente novamente mais tarde.'; // Mensagem padrão
    
            // 1. Verifica se o erro tem uma mensagem específica (como a que lançamos)
            if (err && err.message && typeof err.message === 'string') {
                // Verifica se a mensagem é a do código inválido
                if (err.message.includes('Código da empresa inválido')) {
                    errorMessage = err.message; // Usa a mensagem específica
                }
                // Adicione outros 'else if (err.message.includes(...))' se tiver mais erros customizados
            }
    
            // 2. Se não for um erro customizado com mensagem, verifica os códigos do Firebase Auth
            //    (Só entra aqui se a mensagem do erro não foi a do código inválido)
            else if (err && err.code) {
                switch (err.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Este endereço de e-mail já está em uso.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Formato de e-mail inválido.';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
                        break;
                    // Adicione outros códigos de erro do Auth se necessário
                }
            }
    
            // Define a mensagem de erro final (seja customizada, de código Auth, ou padrão)
            setError(errorMessage);
            // ------------------------------------
    
        } finally {
            setLoading(false);
        }
    };
    

    // O return também começa direto com Container
    return (
        <Container className="mx-auto" style={{ maxWidth: '500px' }}>
             <Row>
                <Col xs={12}>
                    <Card style={cardStyle}>
                        {/* Logo ou Título */}
                        <div className="text-center mb-4">
                            <h1 style={{ color: '#FF8000' }}>Automind IA</h1>
                        </div>
                        <Card.Body>
                            <Card.Title className="text-center mb-4 h3">Criar Nova Conta</Card.Title>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="signupEmail">
                                    <Form.Label>E-mail</Form.Label>
                                    <Form.Control type="email" placeholder="Digite seu e-mail" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} style={inputStyle} />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="signupPassword">
                                    <Form.Label>Senha</Form.Label>
                                    <Form.Control type="password" placeholder="Crie uma senha (mín. 6 caracteres)" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} style={inputStyle} />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="signupConfirmPassword">
                                    <Form.Label>Confirmar Senha</Form.Label>
                                    <Form.Control type="password" placeholder="Digite a senha novamente" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} style={inputStyle} />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="signupCompanyCode">
                                    <Form.Label>Código da Empresa</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Insira o código fornecido"
                                        required
                                        value={companyCode}
                                        onChange={(e) => setCompanyCode(e.target.value)}
                                        disabled={loading}
                                        style={inputStyle} />
                                    <Form.Text className="text-muted" style={{color: '#adb5bd !important'}}>
                                        Este código identifica a sua empresa na plataforma.
                                    </Form.Text>
                                </Form.Group>

                                <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                                    {loading ? 'Criando conta...' : 'Cadastrar'}
                                </Button>
                            </Form>
                            <div className="mt-3 text-center">
                                <small>
                                    Já tem uma conta? <Link to="/login" style={{ color: '#FF8000' }}>Faça login</Link>
                                </small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default SignupPage;