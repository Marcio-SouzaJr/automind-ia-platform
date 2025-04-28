// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import { signIn } from "../services/authService"; // <--- ADICIONAR ESTA LINHA
// import Image from 'react-bootstrap/Image'; // Removido se estiver usando h1

const cardStyle: React.CSSProperties = {
  backgroundColor: "#2C2C2C",
  color: "#fff",
  border: "none",
  padding: "2rem",
  width: "100%", // Card ocupa 100% da Col
};



const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    // ... Lógica do handleSubmit ...
    event.preventDefault();
    setError(null);
    if (!email || !password)
      return setError("Por favor, preencha o e-mail e a senha.");
    setLoading(true);
    try {
      setLoading(true);
      console.log("Tentando login com:", email); // Mantém o log

      // --- CHAMADA REAL AO FIREBASE AUTH ---
      const userCredential = await signIn(email, password); // <--- SUBSTITUIR PLACEHOLDER
      console.log("Login bem-sucedido:", userCredential.user.uid);
      // Ações após login bem-sucedido:
      // - Atualizar estado global (faremos com Context depois)
      // - Redirecionar para o dashboard
      navigate("/dashboard");
      // --- FIM DA CHAMADA REAL ---
    } catch (err: any) {
      // O erro lançado pelo authService será capturado aqui
      console.error("Erro no login (capturado na página):", err);
      // Mapear códigos de erro do Firebase para mensagens amigáveis
      let errorMessage = "Falha ao fazer login. Verifique suas credenciais.";
      // O 'code' virá do erro lançado pelo authService
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        errorMessage = "E-mail ou senha inválidos.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Formato de e-mail inválido.";
      } // Adicionar mais mapeamentos se necessário (ex: auth/too-many-requests)
      setError(errorMessage);
    } finally {
      setLoading(false); // Reabilita o botão
    }
  };

  // O return AGORA começa com o Container. O div de centralização foi removido.
  return (
    <Container className="mx-auto" style={{ maxWidth: "500px" }}>
      {" "}
      {/* Pode manter mx-auto e maxWidth */}
      <Row>
        {" "}
        {/* Não precisa mais de justify-content aqui */}
        <Col xs={12}>
          <Card style={cardStyle}>
            {/* Logo ou Título */}
            <div className="text-center mb-4">
              <h1 style={{ color: "#FF8000" }}>Automind IA</h1>
            </div>
            <Card.Body>
              <Card.Title className="text-center mb-4 h3">
                Entrar na Plataforma
              </Card.Title>
              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleSubmit}>
                {/* Campos Form.Group, Button, etc. */}
                <Form.Group className="mb-3" controlId="loginEmail">
                  <Form.Label>E-mail</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Digite seu e-mail"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="form-control-dark"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="loginPassword">
                  <Form.Label>Senha</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Digite sua senha"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="form-control-dark"
                  />
                </Form.Group>
                <Button
                  variant="primary"
                  type="submit"
                  className="w-100"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </Form>
              <div className="mt-3 text-center">
                <small>
                  Não tem uma conta?{" "}
                  <Link to="/signup" style={{ color: "#FF8000" }}>
                    Cadastre-se
                  </Link>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginPage;
