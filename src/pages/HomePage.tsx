// src/pages/HomePage.tsx
import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Image from "react-bootstrap/Image";

// Importar Ícones
import {
  BsGraphUp,
  BsBell,
  BsGearWideConnected,
  BsChatQuote,
  BsSend,
  BsPlayCircleFill,
} from "react-icons/bs"; // Adicionado Play



const HomePage: React.FC = () => {
  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert("Formulário de contato enviado (simulação)!");
  };

  return (
    <Container
      fluid
      className="p-0"
      style={{ backgroundColor: "#000", color: "#fff" }}
    >
      {/* ---------- Seção Hero ---------- */}
      <Container
        style={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "5rem 1rem",
        }}
        className="text-center"
      >
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            {/* <Image src="/logo_automind_ia.png" alt="Automind IA Logo" width={180} className="mb-4"/> */}
            <Image
              src="/automind-logo-nome.png" // <-- USE O NOME CORRETO DO SEU ARQUIVO NA PASTA /public
              alt="Automind IA Logo"
              className="logo-fade-edges"
              fluid // Torna a imagem responsiva (max-width: 100%)
              style={{ maxWidth: "450px", marginBottom: "2rem" }} // Ajuste maxWidth e margin conforme necessário
            />
            <h2 className="display-5 mb-4">
              Central de Automações para Empresas
            </h2>
            <p className="lead mb-4" style={{ color: "#adb5bd" }}>
              Automatize processos, envie notificações e analise dados com o
              poder da Inteligência Artificial. Otimize seu negócio agora.
            </p>
            <Button variant="primary" size="lg" href="/signup" className="me-2">
              Começar Agora
            </Button>
            <Button variant="outline-light" size="lg" href="/login">
              Entrar
            </Button>
          </Col>
        </Row>
      </Container>

      {/* ---------- Seção Funcionalidades ---------- */}
      <Container className="py-5">
        <h2 className="text-center mb-5 display-6">
          Funcionalidades Principais
        </h2>
        <Row xs={1} md={3} className="g-4 justify-content-center">
          {/* Card 1: Fluxos */}
          <Col>
            <Card
              className="h-100 text-center"
              style={{ backgroundColor: "#2C2C2C", border: "none" }}
            >
              <Card.Body>
                <BsGearWideConnected
                  size={40}
                  className="mb-3"
                  style={{ color: "#FF8000" }}
                />
                <Card.Title className="h5">Fluxos de Trabalho</Card.Title>
                <Card.Text style={{ color: "#adb5bd" }}>
                  Automatize e integre processos empresariais complexos com
                  fluxos inteligentes.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          {/* Card 2: Notificações */}
          <Col>
            <Card
              className="h-100 text-center"
              style={{ backgroundColor: "#2C2C2C", border: "none" }}
            >
              <Card.Body>
                <BsBell
                  size={40}
                  className="mb-3"
                  style={{ color: "#FF8000" }}
                />
                <Card.Title className="h5">Notificações</Card.Title>
                <Card.Text style={{ color: "#adb5bd" }}>
                  Envie alertas e mensagens automáticas para seus clientes ou
                  equipe interna.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          {/* Card 3: Análise */}
          <Col>
            <Card
              className="h-100 text-center"
              style={{ backgroundColor: "#2C2C2C", border: "none" }}
            >
              <Card.Body>
                <BsGraphUp
                  size={40}
                  className="mb-3"
                  style={{ color: "#FF8000" }}
                />
                <Card.Title className="h5">Análise de Dados</Card.Title>
                <Card.Text style={{ color: "#adb5bd" }}>
                  Extraia insights valiosos de suas informações com análises
                  baseadas em IA.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* ---------- Seção Vídeo Demonstrativo ---------- */}
      {/* 👇 Seção Descomentada e Ativada 👇 */}
      <Container className="py-5 text-center">
        <h2 className="mb-5 display-6">
          <BsPlayCircleFill
            size={35}
            style={{
              marginRight: "10px",
              color: "#FF8000",
              verticalAlign: "middle",
            }}
          />
          Veja como Funciona
        </h2>
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            {/* Container responsivo para vídeo (16:9 aspect ratio) */}
            <div
              className="ratio ratio-16x9"
              style={{
                backgroundColor: "#1a1a1a",
                borderRadius: "0.5rem",
                overflow: "hidden",
              }}
            >
              <video
                src="/automind-demo.mp4" // <-- USE O NOME CORRETO DO SEU ARQUIVO NA PASTA /public
                controls // Adiciona controles padrão (play/pause, volume, etc.)
                poster="/caminho/para/imagem_poster.jpg" // Opcional: Imagem mostrada antes do vídeo carregar
                style={{ width: "100%", height: "100%", objectFit: "cover" }} // Garante que o vídeo preencha o container
                muted
                autoPlay
                loop
              >
                {/* Mensagem para navegadores que não suportam vídeo */}
                Seu navegador não suporta o elemento <code>video</code>.
                {/* Opcional: Adicionar <source> para múltiplos formatos */}
                {/* <source src="/automind-demo.webm" type="video/webm" /> */}
                {/* <source src="/automind-demo.ogv" type="video/ogg" /> */}
              </video>
            </div>
            <p className="mt-4" style={{ color: "#adb5bd" }}>
              Descubra em minutos como a Automind IA pode simplificar suas
              operações e impulsionar seus resultados.
            </p>
          </Col>
        </Row>
      </Container>
      {/* 👆 Fim da Seção Vídeo 👆 */}

      {/* ---------- Seção Depoimentos / Comentários dos Clientes ---------- */}
      {/* 👇 Seção Descomentada e Ativada 👇 */}
      <Container className="py-5" style={{ backgroundColor: "#1a1a1a" }}>
        {" "}
        {/* Fundo diferente */}
        <h2 className="text-center mb-5 display-6">
          O que Nossos Clientes Dizem
        </h2>
        <Row xs={1} md={2} className="g-4 justify-content-center">
          {/* Depoimento 1 */}
          <Col>
            <Card
              className="h-100"
              style={{ backgroundColor: "#2C2C2C", border: "none" }}
            >
              <Card.Body>
                <BsChatQuote
                  size={30}
                  className="mb-3"
                  style={{ color: "#FF8000" }}
                />
                <Card.Text className="fst-italic">
                  "A plataforma transformou nossa eficiência operacional. As
                  automações de análise de dados são incrivelmente poderosas e
                  fáceis de configurar."
                </Card.Text>
                <footer
                  className="blockquote-footer mt-2"
                  style={{ color: "#adb5bd" }}
                >
                  Carlos Andrade{" "}
                  <cite title="Source Title">da Tech Solutions</cite>
                </footer>
              </Card.Body>
            </Card>
          </Col>
          {/* Depoimento 2 */}
          <Col>
            <Card
              className="h-100"
              style={{ backgroundColor: "#2C2C2C", border: "none" }}
            >
              <Card.Body>
                <BsChatQuote
                  size={30}
                  className="mb-3"
                  style={{ color: "#FF8000" }}
                />
                <Card.Text className="fst-italic">
                  "Finalmente uma ferramenta de automação que entende as
                  necessidades específicas do nosso negócio. O suporte e a
                  integração foram fantásticos."
                </Card.Text>
                <footer
                  className="blockquote-footer mt-2"
                  style={{ color: "#adb5bd" }}
                >
                  Ana Pereira <cite title="Source Title">da Inova Corp</cite>
                </footer>
              </Card.Body>
            </Card>
          </Col>
          {/* Adicione mais Col's para mais depoimentos se necessário */}
        </Row>
      </Container>
      {/* 👆 Fim da Seção Depoimentos 👆 */}

      {/* ---------- Seção Contato ---------- */}
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={10} lg={8} className="text-center">
            <h2 className="mb-3 display-6">Entre em Contato</h2>
            <p className="mb-4" style={{ color: "#adb5bd" }}>
              Tem alguma dúvida ou sugestão? Quer saber mais sobre planos
              personalizados? Preencha o formulário abaixo.
            </p>
          </Col>
        </Row>
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Form onSubmit={handleContactSubmit}>
              {/* ... Campos do Formulário ... */}
              <Form.Group className="mb-3" controlId="contactName">
                <Form.Label>Seu Nome</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Como podemos te chamar?"
                  required
                  className="form-control-dark"
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="contactEmail">
                <Form.Label>Seu E-mail</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Para onde enviamos a resposta?"
                  required
                  className="form-control-dark"
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="contactSubject">
                <Form.Label>Assunto (Opcional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Sobre o que você quer falar?"
                  className="form-control-dark"
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="contactMessage">
                <Form.Label>Mensagem</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Digite sua dúvida ou sugestão aqui..."
                  required
                  className="form-control-dark"
                />
              </Form.Group>
              <Button variant="primary" type="submit" className="w-100">
                <BsSend style={{ marginRight: "8px" }} /> Enviar Mensagem
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>

      {/* ---------- Rodapé ---------- */}
      <footer
        className="text-center py-4 mt-5"
        style={{ backgroundColor: "#1a1a1a", borderTop: "1px solid #2C2C2C" }}
      >
        <Container>
          <small style={{ color: "#adb5bd" }}>
            © {new Date().getFullYear()} Automind IA. Todos os direitos
            reservados.
          </small>
        </Container>
      </footer>
    </Container>
  );
};

export default HomePage;
