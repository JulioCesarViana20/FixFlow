# Guia de estudo de JavaScript do FixFlow

Este guia descreve o estado atual do projeto e uma ordem prática para estudá-lo.
O FixFlow é um SaaS para organizar processos, demandas e responsabilidades de
empresas de diferentes segmentos, dividido em:

- **Frontend:** JavaScript nativo executado no navegador em `src/js`.
- **API:** Node.js sem framework HTTP em `server`.
- **Persistência planejada:** PostgreSQL descrito em `server/database/schema.sql`.
- **Documentação funcional:** `docs/billing.md`.

## Como executar

Na raiz do projeto:

```bash
npm start
```

Isso serve os arquivos estáticos em `http://localhost:4173`.

Para iniciar a API em outro terminal:

```bash
npm run dev:api
```

O servidor usa a porta `3333` por padrão. Em produção, `server/config/env.js`
exige `DATABASE_URL`, credenciais da InfinitePay e o segredo do webhook.

Para executar as verificações existentes:

```bash
npm test
```

O script verifica a sintaxe de alguns entry points e executa os testes de
`server/tests`.

## Visao geral do frontend

O ponto de entrada HTML é `index.html`. Ele cria o shell vazio, carrega Lucide
por CDN, carrega `src/styles/style.css` e inicia `src/js/app.js`.

O frontend usa uma SPA simples:

1. `app.js` registra as rotas.
2. `router.js` lê o hash, por exemplo `#/login`.
3. O handler da rota chama uma page que retorna uma string HTML.
4. O HTML é inserido em `#app`.
5. Uma função `bind...` conecta formulários, botões e outros eventos.
6. O estado local ou a API fornece os dados.

Não há React, Vue ou bundler. As páginas são funções JavaScript e os módulos
usam ES Modules diretamente no navegador.

### `src/js/app.js`

É o orquestrador do frontend. Registra as rotas públicas e privadas, decide
quando montar o shell lateral, renderiza `#app`, hidrata os ícones e inicia o
roteador.

As funções centrais são:

- `renderPublic`: esconde sidebar/topbar e renderiza páginas públicas.
- `renderPrivate`: exige autenticação local e monta o shell operacional.
- `registerRoute`: associa um caminho a um handler.
- `startRouter`: inicia a primeira renderização.

Estude imports, callbacks, closures e o ciclo de renderização.

### `src/js/core/router.js`

Implementa o roteamento por hash com um `Map`. `navigate("/login")` muda a URL
para `#/login`, enquanto `currentPath()` lê o caminho atual. Os eventos
`hashchange` e `popstate` renderizam novamente a rota.

Não confunda este roteador com um servidor: todas as páginas continuam sendo
servidas por `index.html`.

### `src/js/core/store.js`

É o armazenamento local usado hoje pelo frontend. A chave
`fixflow.app.v1` guarda usuários, workspaces e sessão em `localStorage`.

Responsabilidades:

- criar conta e workspace;
- autenticar e encerrar sessão;
- atualizar workspace;
- registrar atividades;
- solicitar e concluir reset local de senha;
- calcular se existe uma sessão autenticada.

As senhas locais são transformadas por SHA-256 no navegador. Isso é útil para o
protótipo, mas não substitui autenticação server-side. A API já possui um fluxo
separado de cadastro com `scrypt`; os dois fluxos ainda não estão integrados.

### `src/js/components/ui.js`

Contém os componentes visuais reutilizáveis: geração/hidratação de ícones
Lucide, toast, cabeçalho de página, estados vazios e botões.

Observe como template literals permitem compor HTML, mas exigem cuidado com
dados vindos do usuário. Para isso, use `escapeHtml` de `utils/format.js`.

### `src/js/components/shell.js`

Monta a área autenticada: sidebar, workspace, breadcrumb, ações do topo,
logout e navegação entre módulos. Usa `dataset`, `classList`, listeners e
funções de renderização.

### `src/js/utils/format.js` e `src/js/utils/validation.js`

`format.js` reúne funções puras para escapar HTML, formatar moeda em reais e
gerar iniciais.

`validation.js` centraliza validações de email, telefone brasileiro e regras de
entrada. Formato válido não prova que um email ou telefone pertence à pessoa;
produção ainda exige confirmação por email ou OTP.

## Frontend: rotas e páginas

As rotas são registradas em `src/js/app.js`:

| Rota | Tipo | Arquivo |
|---|---|---|
| `/` | pública | `pages/landing.js` |
| `/privacidade` | pública | `pages/legal.js` |
| `/termos` | pública | `pages/legal.js` |
| `/planos/pro` | pública | `pages/pro-comparison.js` |
| `/login` | pública | `pages/auth.js` |
| `/cadastro` | pública | `pages/auth.js` |
| `/recuperar-senha` | pública | `pages/recovery.js` |
| `/onboarding` | pública após cadastro | `pages/onboarding.js` |
| `/checkout/pro` | pública/autorizada | `pages/checkout.js` |
| `/checkout/business` | pública/autorizada | `pages/checkout.js` |
| `/checkout/sucesso` | pública | `pages/checkout.js` |
| `/checkout/pendente` | pública | `pages/checkout.js` |
| `/checkout/falhou` | pública | `pages/checkout.js` |
| `/app/dashboard` | privada | `pages/dashboard.js` |
| `/app/orders` | privada | `pages/orders.js` |
| `/app/clients` | privada/provisória | `pages/placeholder.js` |
| `/app/client` | privada/provisória | `pages/placeholder.js` |
| `/app/billing` | privada | `pages/billing.js` |
| `/app/history` | privada/provisória | `pages/placeholder.js` |
| `/app/settings` | privada | `pages/settings.js` |

### Páginas principais

- `landing.js`: landing page, posicionamento para empresas de diferentes
  segmentos, links de âncora, CTA, planos e efeito de movimento do hero.
- `auth.js`: login e cadastro locais, validação, prevenção de email duplicado
  e redirecionamento para onboarding ou dashboard.
- `recovery.js`: fluxo local de recuperação e troca de senha.
- `onboarding.js`: empresa, telefone e categoria do negócio.
- `dashboard.js`: indicadores, status e ordens recentes.
- `orders.js`: kanban de ordens por status.
- `billing.js`: planos e pagamentos consumidos pela API.
- `checkout.js`: criação de checkout e estados de retorno do pagamento.
- `pro-comparison.js`: comparação dos planos.
- `legal.js`: páginas de privacidade e termos.
- `settings.js`: configurações e ações de conta.
- `placeholder.js`: telas temporárias para módulos ainda não implementados.

### Intro/splash screen

Na primeira renderização da landing page, `landing.js` insere `.landing-entry`.
A abertura atual é desenhada em CSS com um SVG inline do símbolo, wordmark,
halo azul discreto e transições de opacity, blur e transform.

O fluxo dura aproximadamente 3 segundos:

1. símbolo surge com blur e escala reduzidos;
2. halo e wordmark aparecem suavemente;
3. a marca permanece estabelecida por um curto intervalo;
4. o overlay faz fade-out e é removido pelo `bindLanding`.

`prefers-reduced-motion` desativa as animações internas, preserva a leitura da
marca e mantém a remoção do overlay. O conteúdo da aplicação é renderizado por
baixo, portanto a intro não deve bloquear o carregamento nem permanecer
capturando cliques depois do fim.

O visual e o timing estão em `src/styles/style.css`; a estrutura da marca está
em `src/js/pages/landing.js`.

## Backend: composição da API

### `server/index.js`

É o composition root. Instancia repositórios, serviços, controllers, router e
request guard; registra as rotas e inicia o servidor HTTP.

A separação importante é:

```text
request -> Router -> middleware -> controller -> service -> repository/gateway
```

### `server/http/router.js`

É um roteador HTTP próprio. Encaminha método e caminho, lê JSON, limita o corpo
da requisição e transforma falhas internas em respostas públicas controladas.

### `server/config/env.js`

Centraliza `PORT`, `NODE_ENV`, `DATABASE_URL`, `APP_URL`, credenciais da
InfinitePay e tolerância do período de cobrança. Segredos obrigatórios são
exigidos quando `NODE_ENV=production`.

### Middlewares

- `server/middleware/request-guard.js`: rate limit em memória por IP/método/rota
  e limite de payload. Retorna `429` ou `413`.
- `server/middleware/auth.js`: valida os headers de autenticação atuais
  (`x-user-id` e `x-workspace-id`) e o acesso ao workspace.

O header de desenvolvimento não deve ser tratado como autenticação final de
produção. Ele precisa ser substituído por sessão ou token server-side.

## Backend: autenticação, conta e consentimento

### `server/services/auth.service.js`

O cadastro server-side:

1. valida nome, email e senha;
2. normaliza o email;
3. rejeita duplicidade;
4. exige aceite da política e dos termos;
5. deriva a senha com `scrypt` e salt aleatório;
6. cria usuário, workspace e membership OWNER;
7. registra os aceites legais.

`server/controllers/auth.controller.js` e `server/routes/auth.routes.js`
expõem atualmente `POST /api/auth/register`.

### Consentimento e dados legais

- `server/config/legal.js`: versões oficiais dos documentos.
- `server/services/consent.service.js`: valida e registra os dois aceites.
- `server/repositories/legal.repository.js`: persistência temporária em memória.

O aceite guarda versão, data, IP e user-agent. O registro é revertido se a
gravação do consentimento falhar durante o cadastro.

### Conta e privacidade

`server/services/account.service.js` concentra operações que exigem OWNER:

- consultar assinatura;
- cancelar assinatura;
- exportar dados;
- desativar workspace;
- excluir conta após confirmação textual e reautenticação por senha.

As rotas estão em `server/routes/account.routes.js`. A exclusão exige a frase
`DELETE MY FIXFLOW ACCOUNT`, senha atual e gateway configurado quando há
assinatura InfinitePay. As operações críticas também geram audit log.

## Backend: billing

### Rotas atuais

Declaradas em `server/routes/billing.routes.js`:

- `GET /api/billing/plans`
- `POST /api/billing/checkout`
- `GET /api/billing/subscription`
- `GET /api/billing/payments`
- `POST /api/billing/cancel`
- `POST /api/webhooks/infinitepay`

Checkout, assinatura, pagamentos, cancelamento e webhook passam por
`billing.controller.js` e pelos serviços de pagamento e assinatura.

### Serviços e repositórios

- `payment.service.js`: valida plano/preço oficial, cria pedido, chama gateway,
  processa webhook e evita evento duplicado.
- `subscription.service.js`: controla status, período, cancelamento, renovação
  e acesso a recursos.
- `infinitepay.service.js`: adaptador da InfinitePay; recusa operar sem
  configuração.
- `billing.repository.js`: armazenamento em memória atual.

O frontend nunca deve ser a fonte de verdade do preço. O servidor deve buscar o
plano oficial por código e ignorar valores enviados pelo cliente.

### Banco de dados

`server/database/schema.sql` documenta o modelo PostgreSQL com tabelas para:

- `plans`;
- `subscriptions`;
- `payments`;
- `webhook_events`;
- `legal_acceptances`;
- `workspaces`;
- `workspace_members`;
- `audit_logs`.

O schema já prevê constraints, índices, unicidade de assinatura corrente e
idempotência de webhook. A implementação em execução ainda usa repositórios em
memória, então reiniciar o servidor perde os dados.

## Testes

Os testes usam `node:test` e ficam em `server/tests`:

- `auth.test.js`: aceites obrigatórios, versões legais, hash sem senha em texto
  puro e email duplicado.
- `account.test.js`: autorização exclusiva de OWNER, isolamento do workspace,
  confirmação de exclusão e reautenticação.
- `billing.test.js`: preço oficial, pedido inexistente, webhook duplicado,
  renovação e bloqueio de recurso pago.
- `request-guard.test.js`: rate limit e corpo acima do limite.

Ao alterar regras server-side, adicione ou atualize o teste do serviço
correspondente e execute `npm test`.

## O que já existe e o que ainda não está integrado

Já existe uma fundação de API para autenticação, consentimento, conta e billing,
além do schema PostgreSQL e da proteção básica de requests. Entretanto:

- o frontend ainda autentica pelo `localStorage`;
- a API server-side não possui login/troca de sessão completos;
- repositories de billing e legal continuam em memória;
- o adaptador InfinitePay depende de credenciais e contrato configurados;
- clients, histórico e parte de settings ainda usam placeholders;
- validação de formato não substitui verificação de email/telefone;
- o rate limit em memória não funciona como contador compartilhado entre
  múltiplas instâncias.

Essa distinção é importante para não estudar o schema como se ele já fosse a
persistência usada em runtime.

## Ordem recomendada de estudo

1. Leia `index.html`, `app.js` e `router.js` para entender o ciclo de tela.
2. Siga a criação de uma conta por `auth.js`, `validation.js` e `store.js`.
3. Estude `shell.js`, `dashboard.js` e `orders.js` para ver estado virando UI.
4. Leia `landing.js` e `style.css`, incluindo a intro/splash e responsividade.
5. Acompanhe billing do botão em `billing.js` até as rotas da API.
6. Leia `server/index.js`, router, middleware, controller e service nessa ordem.
7. Compare `billing.repository.js` e `schema.sql` para entender a migração
   futura para PostgreSQL.
8. Leia `auth.service.js`, `consent.service.js` e `account.service.js` junto
   dos testes correspondentes.
9. Faça uma alteração pequena, execute `npm test` e observe o fluxo completo.

## Próximas evoluções naturais

1. Integrar cadastro/login do frontend à API.
2. Implementar sessão segura e autorização server-side real.
3. Trocar repositories em memória por PostgreSQL.
4. Implementar envio de email, recuperação segura e verificação de contato.
5. Completar módulos de clientes, histórico e gestão de equipe.
6. Adicionar testes de integração HTTP e testes de UI para os fluxos críticos.
