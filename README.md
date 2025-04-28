# Automind IA 🚀

## Visão Geral

Automind IA é uma plataforma web projetada para servir como uma central de automações B2B (Business-to-Business). A plataforma permite que empresas clientes acessem e gerenciem serviços de automação específicos habilitados para elas, utilizando Inteligência Artificial para otimizar processos, notificações e análise de dados.

Este repositório contém o código-fonte do **frontend da plataforma do cliente**, construído com React e Firebase.

**(Opcional: Adicione um screenshot da Landing Page ou Dashboard aqui)**
<!-- ![Automind IA Screenshot](link/para/seu/screenshot.png) -->

---

## ✨ Funcionalidades (MVP Atual)

*   **Landing Page:** Apresentação do serviço com seções de funcionalidades, vídeo, depoimentos e formulário de contato.
*   **Autenticação de Usuários:**
    *   Cadastro com E-mail/Senha e validação de **Código da Empresa**.
    *   Login seguro com E-mail/Senha.
    *   Logout.
*   **Integração com Firebase:**
    *   Firebase Authentication para gerenciamento de usuários.
    *   Firestore para armazenamento de dados de usuários, empresas e instâncias de automação.
    *   Firebase Hosting para deploy.
*   **Rotas Protegidas:** Acesso ao dashboard e funcionalidades restrito a usuários autenticados.
*   **Visualização de Automações:**
    *   Lista as automações habilitadas para a empresa do usuário logado.
    *   Página de detalhes (placeholder) para cada instância de automação.
*   **Layout Responsivo:** Interface adaptável para desktop e mobile, incluindo menu lateral (Sidebar) que se transforma em Offcanvas em telas menores.
*   **Controle de Acesso Básico (Planejado):** Estrutura preparada para diferenciar usuários comuns e administradores (via campo `role` no Firestore).

---

## 🛠️ Tecnologias Utilizadas

*   **Frontend:**
    *   [React](https://reactjs.org/) (v18+)
    *   [Vite](https://vitejs.dev/) (Build Tool e Servidor de Desenvolvimento)
    *   [TypeScript](https://www.typescriptlang.org/)
    *   [React Router DOM](https://reactrouter.com/) (v6+ para Roteamento)
    *   [React Bootstrap](https://react-bootstrap.github.io/) (Componentes de UI)
    *   [Bootstrap](https://getbootstrap.com/) (v5+ Framework CSS/SCSS)
    *   [Sass/SCSS](https://sass-lang.com/) (Pré-processador CSS)
    *   [React Icons](https://react-icons.github.io/react-icons/) (Biblioteca de Ícones)
*   **Backend & Infraestrutura:**
    *   [Firebase](https://firebase.google.com/)
        *   Authentication
        *   Firestore (Banco de Dados NoSQL)
        *   Hosting

---

## 🚀 Getting Started

Siga estas instruções para configurar e rodar o projeto localmente.

### Pré-requisitos

*   [Node.js](https://nodejs.org/) (Versão LTS recomendada)
*   [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

### Instalação

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/SEU_USUARIO/automind-ia.git
    cd automind-ia
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```

### Configuração do Ambiente

1.  **Crie um Projeto Firebase:**
    *   Acesse o [Console do Firebase](https://console.firebase.google.com/).
    *   Crie um novo projeto.
    *   No seu projeto, habilite os seguintes serviços:
        *   **Authentication:** Método de "E-mail/senha".
        *   **Firestore Database:** Inicie em modo de Produção (ajuste as regras conforme necessário - veja seção abaixo).
        *   **Hosting:** (Opcional para rodar localmente, necessário para deploy).
    *   Registre um novo **Aplicativo da Web** (`</>`) nas configurações do projeto.
    *   Copie as credenciais do objeto `firebaseConfig` fornecido.

2.  **Crie o Arquivo `.env.local`:**
    *   Na raiz do projeto, crie um arquivo chamado `.env.local`.
    *   **IMPORTANTE:** Adicione `.env.local` ao seu arquivo `.gitignore` para não commitar suas credenciais.
    *   Preencha o arquivo com as credenciais do Firebase, usando o prefixo `VITE_`:
        ```dotenv
        VITE_FIREBASE_API_KEY=SUA_API_KEY_AQUI
        VITE_FIREBASE_AUTH_DOMAIN=SEU_AUTH_DOMAIN_AQUI
        VITE_FIREBASE_PROJECT_ID=SEU_PROJECT_ID_AQUI
        VITE_FIREBASE_STORAGE_BUCKET=SEU_STORAGE_BUCKET_AQUI
        VITE_FIREBASE_MESSAGING_SENDER_ID=SEU_MESSAGING_SENDER_ID_AQUI
        VITE_FIREBASE_APP_ID=SEU_APP_ID_AQUI
        ```

3.  **Configure o Firestore (Inicial):**
    *   **Empresa Teste:** Crie manualmente uma coleção `companies`. Adicione um documento com um Auto-ID. Dentro deste documento, adicione um campo `name` (string) e um campo `accessCode` (string, ex: "AUTOMIND123").
    *   **Automação Teste:** Crie manualmente uma coleção `automations`. Adicione um documento com um ID (ex: `automacao_teste`). Adicione campos `name` (string) e `description` (string).
    *   **Instância Teste:** No documento da sua empresa teste, crie uma subcoleção `company_automations`. Adicione um documento com o mesmo ID da automação teste (ex: `automacao_teste`). Dentro dele, adicione os campos `automationId` (string, igual ao ID do template), `enabled` (boolean, `true`), `config` (map, com dados de exemplo).
    *   **Regras de Segurança:** Atualize as [Regras de Segurança do Firestore](https://console.firebase.google.com/project/_/firestore/rules) para permitir as operações necessárias (criar usuário, ler empresa pelo código, ler automações, etc.). Consulte o código ou histórico para as regras usadas durante o desenvolvimento (lembre-se de revisar a regra de leitura pública em `companies`!).
