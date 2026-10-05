# Roteiro de estudo da FixFlow

Este documento acompanha a arquitetura atual do projeto. Ele separa o que já
funciona no protótipo do que foi preparado para produção e para a futura
persistência em banco de dados.

## 1. Visão geral

O projeto tem duas partes:

- **Frontend:** HTML, CSS e JavaScript nativo em `src/`.
- **Backend:** Node.js, sem framework HTTP, em `server/`.

O frontend é uma SPA simples executada pelo navegador. O backend expõe uma API
REST e concentra regras sensíveis, principalmente cadastro, conta e cobrança.
Os dados de runtime ainda ficam em repositórios em memória; reiniciar a API
perde esses dados.

## 2. Como executar

Na raiz do projeto, abra dois terminais.

Terminal do frontend:

```bash
npm start
```

Abra `http://localhost:4173`.

Terminal da API:

```bash
npm run dev:api
```

Esse comando carrega o `.env` automaticamente e inicia a API na porta `3333`.
Para iniciar a API usando variáveis já fornecidas pelo ambiente:

```bash
npm run start:api
```

Para validar o projeto:

```bash
npm test
```

O teste verifica a sintaxe dos entry points e executa os testes de
`server/tests`.

## 3. Primeiro caminho de estudo

Estude nesta ordem:

1. `index.html`: shell inicial, CSS, Lucide e entrada JavaScript.
2. `src/js/app.js`: registro das rotas e ciclo de renderização.
3. `src/js/core/router.js`: navegação por hash, como `#/login`.
4. `src/js/core/store.js`: estado local, sessão, workspace e dados da aplicação.
5. `src/js/components/ui.js`: ícones, toast, cabeçalhos e estados vazios.
6. `src/js/components/shell.js`: sidebar, topbar, notificações e logout.
7. Uma página completa, preferencialmente `dashboard.js` ou `orders.js`.
8. O backend, seguindo request → router → middleware → controller → service
   → repository/gateway.

As páginas retornam HTML por template literals. Cada página pode ter uma função
`bind...` que liga eventos depois que o HTML é inserido em `#app`.

## 4. Frontend

### Rotas

As rotas são registradas em `src/js/app.js`:

| Rota | Acesso | Arquivo |
|---|---|---|
| `/` | Público | `pages/landing.js` |
| `/privacidade` | Público | `pages/legal.js` |
| `/termos` | Público | `pages/legal.js` |
| `/planos/pro` | Público | `pages/pro-comparison.js` |
| `/login` | Público | `pages/auth.js` |
| `/cadastro` | Público | `pages/auth.js` |
| `/recuperar-senha` | Público | `pages/recovery.js` |
| `/onboarding` | Após cadastro | `pages/onboarding.js` |
| `/checkout/pro` | Autenticado | `pages/checkout.js` |
| `/checkout/business` | Autenticado | `pages/checkout.js` |
| `/checkout/sucesso` | Público | `pages/checkout.js` |
| `/checkout/pendente` | Público | `pages/checkout.js` |
| `/checkout/falhou` | Público | `pages/checkout.js` |
| `/app/dashboard` | Privado | `pages/dashboard.js` |
| `/app/orders` | Privado | `pages/orders.js` |
| `/app/clients` | Privado | `pages/clients.js` |
| `/app/client` | Privado | `pages/client-area.js` |
| `/app/billing` | Privado | `pages/billing.js` |
| `/app/history` | Privado | `pages/history.js` |
| `/app/finance` | Privado | `pages/finance.js` |
| `/app/reports` | Privado | `pages/reports.js` |
| `/app/settings` | Privado | `pages/settings.js` |

`renderPublic` oculta o shell interno. `renderPrivate` exige sessão local,
monta o shell e então renderiza a página.

### Estado local

`src/js/core/store.js` usa a chave `fixflow.app.v1` no `localStorage`.
Atualmente ele mantém:

- usuários e sessão;
- workspaces;
- clientes;
- demandas;
- movimentações financeiras;
- atividades e notificações;
- preferências;
- recuperação local de senha.

Esse armazenamento é adequado para estudo e protótipo, mas não é autenticação
ou persistência de produção. A senha local usa SHA-256 no navegador; o cadastro
server-side usa `scrypt`, e os fluxos ainda não estão unificados.

### API do frontend

`src/js/config/api.js` centraliza a origem da API:

- em desenvolvimento local, usa `http://localhost:3333`;
- em produção, usa a origem da aplicação;
- pode ser sobrescrita por `globalThis.__FIXFLOW_API_URL__`.

Nenhum Access Token ou segredo do Mercado Pago deve ser importado pelo frontend.

### Páginas de negócio

- `dashboard.js`: indicadores, período e demandas recentes.
- `orders.js`: criação, edição, status, filtro e exclusão de demandas.
- `clients.js`: clientes pessoa física/jurídica, validação e duplicidade.
- `finance.js`: receitas, despesas, filtros e exclusão em lote.
- `reports.js`: indicadores derivados dos dados locais.
- `history.js`: atividades e limpeza do histórico.
- `settings.js`: perfil, empresa, endereço, preferências e ações críticas.
- `billing.js`: catálogo consultado da API e início do checkout.
- `checkout.js`: resumo do plano, redirecionamento e estados de retorno.

Ao editar templates, use `escapeHtml` para valores vindos do usuário. Não
confie em `planId`, valor ou status enviados pelo navegador.

## 5. Backend

### Composição

`server/index.js` instancia e conecta:

```text
HTTP server
  -> CORS
  -> request guard
  -> Router
  -> middleware de autenticação
  -> controller
  -> service
  -> repository ou gateway externo
```

### Configuração

`server/config/env.js` centraliza porta, ambiente, URL da aplicação, Mercado
Pago e tolerância de cobrança.

Variáveis do `.env.example`:

```env
NODE_ENV=development
PORT=3333
APP_URL=http://localhost:4173
DATABASE_URL=
MERCADO_PAGO_API_URL=https://api.mercadopago.com
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
BILLING_GRACE_PERIOD_DAYS=3
```

O Access Token e o segredo do webhook ficam somente no backend. Nunca coloque
valores reais no frontend, no `.env.example` ou no Git.

### Middlewares e router

- `request-guard.js`: limita requisições por IP/método/rota e o tamanho do corpo.
- `cors.js`: permite a origem configurada em `APP_URL` e responde preflight.
- `auth.js`: ainda usa `x-user-id` e `x-workspace-id` como autenticação de
  desenvolvimento; isso precisa ser substituído por sessão ou token server-side.
- `http/router.js`: roteia, lê JSON e converte erros internos em códigos públicos
  controlados.

## 6. Cadastro e conta

O cadastro passa por:

```text
auth.js
  -> POST /api/auth/register
  -> auth.controller.js
  -> auth.service.js
  -> legal.repository.js + consent.service.js
```

O `AuthService` valida os dados, normaliza email, rejeita duplicidade, exige os
dois aceites, deriva a senha com `scrypt`, cria usuário/workspace/membership e
registra consentimentos.

`account.service.js` concentra operações de proprietário:

- consultar assinatura;
- cancelar assinatura;
- exportar dados;
- desativar conta;
- excluir conta com confirmação e reautenticação.

No navegador, `settings.js` sincroniza essas operações com a API e também
atualiza o `localStorage`. Isso permite testar desativação e exclusão mesmo
quando a API não está disponível. Quando a API responde, a alteração server-side
é feita primeiro; o estado local só é removido ou desativado depois do sucesso.
Na futura troca dos repositórios por banco relacional, esse contrato de API
permanece o mesmo.

## 7. Billing e Mercado Pago

### Fluxo de checkout

```text
billing.js ou checkout.js
  -> POST /api/billing/checkout
  -> billing.controller.js
  -> payment.service.js
  -> billing.repository.js
  -> mercadopago.service.js
  -> init_point do Mercado Pago
```

O backend busca o plano oficial, calcula o valor em centavos, cria o pagamento
pendente e só retorna ao frontend a URL de checkout. O redirect não ativa
assinatura.

### Webhook

Endpoint:

```text
POST /api/webhooks/mercadopago
```

O `MercadoPagoService`:

1. valida `x-signature` e `x-request-id`;
2. identifica o pagamento recebido;
3. consulta o pagamento na API do Mercado Pago;
4. extrai `external_reference`, status, transação e valor;
5. normaliza o evento para o `PaymentService`.

O `PaymentService` valida pedido, valor e plano, registra idempotência e só
ativa a assinatura quando o status é `approved`. Estados pendentes, recusados,
cancelados e reembolsados não liberam recursos pagos.

### Planos e assinatura

O catálogo existe em dois pontos temporários:

- `src/js/config/plans.js`: apresentação no frontend;
- `server/repositories/billing.repository.js`: autoridade atual da API.

A regra de acesso está em `subscription.service.js`. É ali que devem ser
estudados e futuramente conectados:

- Free, Pro e Business;
- limites de clientes, demandas, recursos e equipe;
- ativação;
- renovação;
- cancelamento;
- expiração;
- upgrade e downgrade.

O frontend pode mostrar planos, mas nunca é a fonte de verdade de preço,
status ou permissão.

## 8. Persistência futura

O banco não está implementado no runtime. Os repositórios em memória são os
pontos de substituição:

- `LegalRepository`: usuários, workspaces, memberships e consentimentos;
- `BillingRepository`: planos, assinaturas, pagamentos e eventos.

`server/database/schema.sql` documenta uma possível modelagem PostgreSQL, mas
não deve ser tratado como persistência ativa. Ao estudar banco, compare os
métodos dos repositórios com as tabelas e substitua o adaptador sem mover as
regras dos services.

## 9. Testes

Os testes usam `node:test`:

- `auth.test.js`: cadastro, aceite, hash e duplicidade;
- `account.test.js`: proprietário, isolamento e ações críticas;
- `billing.test.js`: preço oficial, valor adulterado, idempotência, pendência,
  aprovação posterior, renovação e limites;
- `cors.test.js`: preflight e origem permitida;
- `request-guard.test.js`: rate limit e corpo excedente.

Ao alterar uma regra server-side:

1. escreva primeiro o caso de teste;
2. altere o service ou middleware;
3. rode `npm test`;
4. faça uma chamada HTTP manual quando a mudança envolver API.

## 10. Exercícios recomendados

### Exercício A — frontend

Altere uma mensagem de erro em `clients.js`, mantendo:

- validação;
- `escapeHtml`;
- feedback visível;
- nenhum erro técnico para o cliente.

### Exercício B — backend

Adicione uma regra pequena ao `PaymentService` e cubra:

- entrada válida;
- entrada adulterada;
- evento repetido;
- estado não aprovado.

### Exercício C — repositório

Mapeie cada método de `BillingRepository` para a tabela correspondente em
`schema.sql`, sem alterar o service.

### Exercício D — integração

Siga uma chamada de checkout no debugger:

```text
checkout.js
-> /api/billing/checkout
-> billing.controller.js
-> payment.service.js
-> mercadopago.service.js
```

## 11. Limitações atuais

Antes de chamar o produto de pronto para produção, ainda será necessário:

- substituir headers de desenvolvimento por autenticação server-side;
- integrar o frontend de login/cadastro a uma sessão real;
- trocar repositórios em memória por persistência;
- configurar credenciais e webhook público do Mercado Pago;
- adicionar verificação de email e recuperação por email;
- adicionar testes HTTP e testes de interface para os fluxos críticos;
- revisar rate limit para múltiplas instâncias;
- configurar HTTPS, logs seguros e observabilidade.

Essas limitações são intencionais nesta etapa. O objetivo atual é estudar a
arquitetura e conectar a persistência depois, sem reescrever o checkout ou as
regras de negócio.
