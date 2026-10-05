# Billing do FixFlow

## Desenvolvimento local

O cadastro e as ações protegidas usam a API em `http://localhost:3000`. Execute `npm run dev:api` em um terminal e `npm start` em outro.

## Catálogo atual

- **Free**: R$ 0/mês, até 20 demandas, 20 clientes, 20 registros financeiros e 3 dispositivos; dashboard básico.
- **Pro**: R$ 49,99/mês, até 100 demandas, 100 clientes, 100 registros financeiros, dashboard avançado e relatórios.
- **Business**: R$ 99,99/mês, demandas, clientes e financeiro ilimitados, dashboard avançado, tudo do Pro e recursos de equipe. A configuração atual permite até 10 membros, podendo ser alterada no catálogo central.

Os preços, limites e permissões são mantidos em `src/js/config/plans.js` para o modo local e replicados no catálogo do backend em `server/repositories/billing.repository.js` e no schema SQL. O backend deve ser a autoridade final para permitir recursos e criações. Ao cancelar ou expirar uma assinatura, o workspace volta aos recursos do Free sem apagar dados excedentes.

## Como testar planos localmente

O plano de cada workspace local fica em `workspace.planCode`, criado como `free` em `src/js/core/store.js`. A troca manual é uma ferramenta de desenvolvimento, não uma validação de pagamento:

1. Entre no site e abra o console do navegador.
2. No console, use `fixflowDevPlans.set("pro")` (equivale a PRO) para testar o Pro ou `fixflowDevPlans.set("business")` (equivale a BUSINESS) para testar o Business. O helper salva o workspace e recarrega a tela.
3. Para voltar ao Free, use `fixflowDevPlans.reset()`.
4. Esse helper só é exposto em `localhost`/`127.0.0.1`; ele não é mecanismo de assinatura nem de segurança.

Os valores de limite ficam somente em `PLAN_CATALOG` (`src/js/config/plans.js`): `orders`, `clients`, `transactions`, `devices` e `teamMembers`. Para testar cada limite, preencha a coleção até 20 no Free ou 100 demandas/100 clientes/100 lançamentos no Pro e tente criar mais um registro. A criação é rejeitada antes da inserção e os dados existentes permanecem intactos. No Business, demandas, clientes e financeiro usam `-1` (ilimitado).

O Free também possui verificadores preparados para dispositivos (`canConnectDevice`) e equipe (`canAddTeamMember`), mas a aplicação atual não possui uma sessão server-side confiável nem cadastro de membros. Portanto, isso ainda não é proteção real.

## Evolução para banco e Mercado Pago

Em produção, `planCode` deve ser uma propriedade persistida da assinatura/workspace, nunca um valor confiado pelo navegador. O fluxo esperado é: o webhook autenticado consulta o pagamento oficial, valida usuário, plano e valor, grava/atualiza a assinatura no banco e o backend passa a resolver os limites a partir do plano persistido. O frontend deve apenas exibir o estado retornado pela API. O override local deve ser removido/desativado antes da publicação.

## Moeda, período e internacionalização no Workspace

Na área interna de Cobranças, `workspace.preferences.currency` controla `BRL` ou `USD`, e `workspace.preferences.billingPeriod` controla `month` ou `year`. Os preços mensais e anuais ficam em `src/js/config/plans.js`; o anual não é derivado no componente visual.

O módulo `src/js/services/exchange-rates.js` consulta `https://api.frankfurter.app/latest?from=BRL&to=USD`, uma API pública baseada nas taxas do BCE. Portanto, a cotação exibida não é inventada nem fixa: ela depende da resposta da API e mostra fonte/data. Se a API falhar, uma cotação em cache pode ser usada; sem cache, USD aparece como indisponível. Para produção, a consulta deve ser movida para o backend, com cache, timeout, observabilidade e política de fallback controlada.

Telefones usam `libphonenumber-js` via bundle carregado em `index.html`. `src/js/utils/validation.js` valida por país e normaliza para E.164 antes de salvar. O cadastro de clientes e o perfil em Configurações permitem escolher o país. A lista inicial pode crescer sem mudar o contrato do armazenamento.

## Estado atual

O projeto usa o Mercado Pago como provedor de pagamentos. O catálogo, os registros pendentes e a ativação de assinaturas continuam sob controle do backend.

- `server/database/schema.sql`: tabelas PostgreSQL e índices de unicidade.
- `server/repositories/billing.repository.js`: adaptador em memória apenas para desenvolvimento.
- `server/services/payment.service.js`: preço oficial, pedido, idempotência e confirmação.
- `server/services/subscription.service.js`: acesso, expiração, renovação e cancelamento.
- `server/services/mercadopago.service.js`: cria preferências de checkout, valida a assinatura do webhook e consulta o pagamento no Mercado Pago.

## Rotas

- `GET /api/billing/plans`: catálogo de planos sem preço vindo do frontend.
- `POST /api/billing/checkout`: protegido por autenticação de desenvolvimento; cria pagamento pendente e só delega ao gateway configurado.
- `GET /api/billing/subscription`: assinatura do workspace autenticado.
- `GET /api/billing/payments`: histórico sanitizado do workspace autenticado.
- `POST /api/billing/cancel`: cancela sem apagar dados.
- `POST /api/webhooks/mercadopago`: valida a assinatura, consulta o pagamento oficial e processa o evento de forma idempotente.

## Fluxo seguro

1. O cliente envia apenas `planId`.
2. O backend consulta o plano e o preço oficial.
3. Cria `order_nsu` único e pagamento pendente.
4. O gateway deve retornar uma URL de checkout através do adaptador oficial.
5. Redirect nunca ativa assinatura.
6. O webhook deve ser autenticado, validar pedido, valor e transação.
7. `webhook_events` impede reprocessamento.
8. Só então pagamento vira `approved` e assinatura `active`.

## Cancelamento, estados e reembolso

O Workspace diferencia plano, assinatura e status. Uma assinatura paga pode
estar `ACTIVE_PRO`, `ACTIVE_BUSINESS`, `CANCEL_AT_PERIOD_END`,
`PAYMENT_PENDING`, `PAYMENT_FAILED` ou `EXPIRED`. Cancelar significa desligar a
renovação automática; não significa apagar dados nem solicitar reembolso. No
cancelamento no fim do período, o acesso permanece até `currentPeriodEnd` e só
então o workspace retorna ao Free.

Pedidos de reembolso devem ter fluxo próprio e ser analisados conforme a
legislação aplicável, as condições da contratação e o provedor de pagamento.
O texto apresentado em Termos e Privacidade é conservador e precisa de revisão
jurídica antes do lançamento comercial, especialmente quanto a prazos,
direito de arrependimento e exceções.

Para simular os estados no ambiente local, use no console:

```js
fixflowDevPlans.setSubscription("ACTIVE_PRO", "pro")
fixflowDevPlans.setSubscription("ACTIVE_BUSINESS", "business")
fixflowDevPlans.setSubscription("CANCEL_AT_PERIOD_END", "pro", "2026-12-31T23:59:59.000Z")
fixflowDevPlans.setSubscription("PAYMENT_PENDING", "pro")
fixflowDevPlans.setSubscription("PAYMENT_FAILED", "pro")
fixflowDevPlans.setSubscription("EXPIRED", "pro")
fixflowDevPlans.reset()
```

Esses comandos alteram apenas o armazenamento local de desenvolvimento. Não
representam pagamento real, autorização ou proteção de produção. Em produção,
o backend deve validar o evento do Mercado Pago, persistir a assinatura e
calcular o retorno ao Free após o vencimento.

## Configuração necessária

Copie `.env.example` para `.env` e preencha o Access Token e o segredo de assinatura do webhook fornecidos pelo Mercado Pago. Nunca envie `.env` ao Git. Em desenvolvimento, `npm run dev:api` carrega esse arquivo automaticamente; em produção, injete as variáveis no ambiente do processo e use `npm run start:api`.

No painel do Mercado Pago, configure a URL pública de webhook como
`https://seu-dominio/api/webhooks/mercadopago`. O endpoint precisa ser acessível
pela internet para receber confirmações. Em produção, configure também as
credenciais PostgreSQL e a autenticação server-side real no lugar dos headers
de desenvolvimento.

## Proteção contra abuso

A API aplica um limite em memória de 60 requisições por minuto por IP, método e rota. Também rejeita corpos JSON maiores que 64 KB e retorna `429` com `Retry-After` quando o limite é excedido.

Esse limite é uma proteção básica para desenvolvimento e uma única instância. Em produção com múltiplas instâncias, o contador deve usar Redis ou outro armazenamento compartilhado, além de uma camada de WAF ou rate limit no proxy.

## Verificação de email e telefone

O cadastro atual ainda é local no frontend e não possui endpoints server-side de autenticação ou verificação. Para confirmar posse de email e telefone será necessário integrar provedores externos, por exemplo:

- email: Resend, Brevo ou Amazon SES;
- SMS: Twilio, Zenvia ou Vonage.

O fluxo recomendado é criar o usuário no servidor como não verificado, enviar um código de uso único com expiração curta, limitar o envio a 3 códigos por 15 minutos por destino e IP, limitar tentativas a 5 por código e invalidar o código após uso. Nunca registrar códigos ou credenciais nos logs.
