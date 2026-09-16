# Billing do FixFlow

## Desenvolvimento local

O cadastro e as ações protegidas usam a API em `http://localhost:3333`. Execute `npm run dev:api` em um terminal e `npm start` em outro.

## Catálogo atual

- **Free**: R$ 0/mês, até 20 contatos, 10 demandas e 20 recursos; recursos básicos.
- **Pro**: R$ 49,99/mês, fluxos e registros ilimitados, relatórios, IA, automações e personalização.
- **Business**: R$ 99,99/mês, tudo do Pro, mais equipe ilimitada, API e auditoria.

Os preços, limites e permissões são mantidos no catálogo do backend e replicados no catálogo visual do frontend. O backend é a autoridade final para permitir recursos e criações. Ao cancelar ou expirar uma assinatura, o workspace volta aos recursos do Free sem apagar dados excedentes.

## Estado atual

O projeto não possuía backend, banco ou contrato técnico da InfinitePay. Esta etapa cria a arquitetura de billing sem fingir uma integração de gateway que ainda não foi configurada.

- `server/database/schema.sql`: tabelas PostgreSQL e índices de unicidade.
- `server/repositories/billing.repository.js`: adaptador em memória apenas para desenvolvimento.
- `server/services/payment.service.js`: preço oficial, pedido, idempotência e confirmação.
- `server/services/subscription.service.js`: acesso, expiração, renovação e cancelamento.
- `server/services/infinitepay.service.js`: fronteira do gateway; falha de forma explícita até o contrato oficial ser configurado.

## Rotas

- `GET /api/billing/plans`: catálogo de planos sem preço vindo do frontend.
- `POST /api/billing/checkout`: protegido por autenticação de desenvolvimento; cria pagamento pendente e só delega ao gateway configurado.
- `GET /api/billing/subscription`: assinatura do workspace autenticado.
- `GET /api/billing/payments`: histórico sanitizado do workspace autenticado.
- `POST /api/billing/cancel`: cancela sem apagar dados.
- `POST /api/webhooks/infinitepay`: rejeita o evento até a verificação oficial estar implementada.

## Fluxo seguro

1. O cliente envia apenas `planId`.
2. O backend consulta o plano e o preço oficial.
3. Cria `order_nsu` único e pagamento pendente.
4. O gateway deve retornar uma URL de checkout através do adaptador oficial.
5. Redirect nunca ativa assinatura.
6. O webhook deve ser autenticado, validar pedido, valor e transação.
7. `webhook_events` impede reprocessamento.
8. Só então pagamento vira `approved` e assinatura `active`.

## Configuração necessária

Copie `.env.example` para `.env` e preencha os valores fornecidos pela InfinitePay e pela infraestrutura PostgreSQL. Nunca envie `.env` ao Git.

Ainda precisam ser configurados manualmente:

- acesso à API oficial da InfinitePay;
- URL e método oficiais de criação de checkout;
- mecanismo oficial de assinatura/autenticidade do webhook;
- URLs de retorno e webhook no painel do gateway;
- credenciais PostgreSQL e execução da migration;
- autenticação server-side real no lugar dos headers de desenvolvimento.

## Proteção contra abuso

A API aplica um limite em memória de 60 requisições por minuto por IP, método e rota. Também rejeita corpos JSON maiores que 64 KB e retorna `429` com `Retry-After` quando o limite é excedido.

Esse limite é uma proteção básica para desenvolvimento e uma única instância. Em produção com múltiplas instâncias, o contador deve usar Redis ou outro armazenamento compartilhado, além de uma camada de WAF ou rate limit no proxy.

## Verificação de email e telefone

O cadastro atual ainda é local no frontend e não possui endpoints server-side de autenticação ou verificação. Para confirmar posse de email e telefone será necessário integrar provedores externos, por exemplo:

- email: Resend, Brevo ou Amazon SES;
- SMS: Twilio, Zenvia ou Vonage.

O fluxo recomendado é criar o usuário no servidor como não verificado, enviar um código de uso único com expiração curta, limitar o envio a 3 códigos por 15 minutos por destino e IP, limitar tentativas a 5 por código e invalidar o código após uso. Nunca registrar códigos ou credenciais nos logs.
