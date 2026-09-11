# Guia de estudo do JavaScript do FixFlow

Este projeto tem duas partes:

- `src/js`: frontend, executado no navegador.
- `server`: backend da API de billing, executado com Node.js.

## Como o frontend funciona

O navegador carrega `src/js/app.js`. Esse arquivo registra as rotas, escolhe a tela atual e injeta HTML dentro de `#app`. As páginas são funções que retornam strings HTML; depois, funções `bind...` conectam os eventos dos botões e formulários.

Fluxo principal:

1. `app.js` inicia o roteador.
2. O roteador lê o hash, por exemplo `#/login`.
3. Uma página é renderizada.
4. O estado vem de `store.js`.
5. Eventos são conectados ao DOM.
6. Uma ação atualiza o estado e navega para outra rota.

## Frontend: entrada e infraestrutura

### `src/js/app.js`

É o ponto de entrada da aplicação. Registra as rotas públicas e privadas, decide se deve mostrar o shell do sistema, renderiza conteúdo público ou privado e inicia o roteador.

Estude: imports, funções de ordem superior, callbacks e controle de acesso por rota.

### `src/js/core/router.js`

Implementa um roteador simples usando o hash da URL. `registerRoute` associa caminho e função; `navigate` muda a URL; `currentPath` lê a rota atual; `startRouter` escuta mudanças do navegador.

Estude: `Map`, eventos `hashchange`/`popstate` e funções callback.

### `src/js/core/store.js`

É o estado local da aplicação. Salva usuários, workspaces e sessão no `localStorage`. Também cria contas, autentica, encerra sessão e altera o workspace.

Também contém `requestPasswordReset` e `resetPassword`: cria um token temporário de 15 minutos, permite uma única troca e remove o token depois do uso.

Importante: hoje o cadastro e login ainda são locais. Isso é adequado para protótipo, mas não para autenticação real em produção.

Estude: estado, persistência, `localStorage`, objetos e arrays.

### `src/js/components/ui.js`

Reúne funções visuais reutilizáveis: ícones Lucide, toast, cabeçalho de página, estado vazio e botão principal.

Estude: funções que retornam HTML, template literals e reutilização de componentes.

### `src/js/components/shell.js`

Controla o layout privado do empresário: sidebar, workspace atual, breadcrumb, navegação entre páginas e logout.

Estude: manipulação do DOM, `dataset`, `classList` e eventos de clique.

### `src/js/utils/format.js`

Possui funções pequenas de apresentação: escapar HTML, formatar moeda em reais e gerar iniciais.

Estude: funções puras e `toLocaleString`.

### `src/js/utils/validation.js`

Centraliza as regras de entrada. Valida email, bloqueia domínios de exemplo/temporários comuns, valida DDD e quantidade de dígitos de telefones brasileiros e formata o telefone enquanto o usuário digita.

Importante: formato válido não prova que o email ou telefone pertence à pessoa. Para isso ainda será necessário email de confirmação ou OTP por SMS.

## Frontend: páginas

### `src/js/pages/landing.js`

Monta a página pública de apresentação. Também conecta os botões de navegação, links de âncora e o efeito 3D que acompanha mouse/toque no herói.

### `src/js/pages/auth.js`

Monta login e cadastro. Valida email, confirma senha, evita email duplicado, cria a conta no store e redireciona para o primeiro acesso.

No login, também leva o usuário para a página de recuperação quando ele clica em “Esqueci minha senha”.

### `src/js/pages/recovery.js`

Monta o formulário de recuperação, valida o email, exibe o formulário de nova senha no modo local e conecta a redefinição ao store. Em produção, o formulário deverá ser acessado por um link enviado por email.

### `src/js/pages/onboarding.js`

Monta o primeiro acesso do empresário. Valida telefone, aplica máscara, oferece categorias de negócio e revela o campo livre quando `Outros` é escolhido.

### `src/js/pages/dashboard.js`

Calcula os indicadores do workspace e monta a visão geral: ordens abertas, status, total a receber e ordens recentes.

### `src/js/pages/orders.js`

Monta o kanban de ordens de serviço por status. Também conecta o clique de cada card à rota da ordem.

### `src/js/pages/billing.js`

Consulta os planos na API, monta os cards de preço e inicia o checkout. O preço não é confiado ao frontend; o backend decide o plano oficial.

### `src/js/pages/placeholder.js`

É uma tela provisória reutilizável para módulos ainda não implementados, como clientes, histórico e configurações.

## Backend: entrada e infraestrutura

### `server/index.js`

Inicializa dependências, cria o roteador, registra as rotas de billing, aplica autenticação e instala o bloqueio global de requisições.

### `server/config/env.js`

Lê variáveis de ambiente e define configurações como porta, banco, URL da aplicação e credenciais do gateway. Em produção, exige os segredos obrigatórios.

### `server/http/router.js`

É o roteador HTTP próprio do backend. Encaminha método e caminho para handlers, lê JSON, limita o corpo a 64 KB e transforma erros internos em respostas públicas controladas.

### `server/middleware/auth.js`

Valida os headers de autenticação de desenvolvimento (`x-user-id` e `x-workspace-id`) e verifica acesso a funcionalidades pagas.

Ainda precisa ser substituído por autenticação server-side real.

### `server/middleware/request-guard.js`

Protege a API contra abuso básico: limita requisições por IP, método e rota, retorna `429` e bloqueia corpos muito grandes com `413`.

O contador atual fica em memória. Em produção com várias instâncias, deve ser migrado para Redis ou outro armazenamento compartilhado.

## Backend: billing

### `server/routes/billing.routes.js`

Declara as rotas de planos, checkout, assinatura, pagamentos, cancelamento e webhook.

### `server/controllers/billing.controller.js`

Recebe a requisição HTTP, extrai dados e chama os serviços. Controller deve coordenar o fluxo, não conter toda a regra de negócio.

### `server/services/payment.service.js`

Implementa as regras de pagamento: usa preço oficial, cria pedido, chama o gateway, valida webhook, evita eventos duplicados e aprova pagamento.

### `server/services/subscription.service.js`

Controla planos, acesso a recursos, expiração, cancelamento e renovação de assinaturas.

### `server/services/infinitepay.service.js`

É o adaptador do gateway. Define o ponto onde a integração oficial da InfinitePay será conectada e recusa operar enquanto as credenciais/contrato não estiverem configurados.

### `server/repositories/billing.repository.js`

É a camada de persistência atual, em memória. Guarda planos, pagamentos, assinaturas e eventos de webhook. Depois pode ser trocada por PostgreSQL sem espalhar SQL pelos serviços.

## Testes

### `server/tests/billing.test.js`

Testa preço oficial, rejeição de valor adulterado, pedido inexistente, idempotência de webhook, renovação e bloqueio de recurso pago.

### `server/tests/request-guard.test.js`

Testa o limite de requisições e o bloqueio de payload grande.

## Próxima etapa recomendada

1. Criar endpoints server-side de cadastro e login.
2. Persistir usuários em banco, nunca em `localStorage`.
3. Escolher provedor de email e SMS.
4. Criar códigos OTP com expiração, limite de envio e limite de tentativas.
5. Só marcar `email_verified` ou `phone_verified` depois da confirmação.

## Como estudar sem se perder

1. Leia `app.js` e `router.js` juntos.
2. Depois leia `store.js` e acompanhe uma conta sendo criada.
3. Leia `auth.js` e `onboarding.js` para entender os formulários.
4. Leia `dashboard.js` para ver como o estado vira interface.
5. Por fim, estude `server/index.js`, controllers, services e repository.
6. Altere uma pequena regra, rode `npm test` e observe o resultado.
