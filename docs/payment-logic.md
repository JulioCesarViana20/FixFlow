# Lógica de pagamento do FixFlow

Este arquivo explica como a parte de pagamentos funciona no FixFlow, mas também mostra a **sintaxe** usada no código para você ler os arquivos com mais clareza.

Os arquivos principais são:

- [server/controllers/billing.controller.js](../server/controllers/billing.controller.js)
- [server/services/payment.service.js](../server/services/payment.service.js)
- [server/services/subscription.service.js](../server/services/subscription.service.js)
- [server/repositories/billing.repository.js](../server/repositories/billing.repository.js)
- [server/routes/billing.routes.js](../server/routes/billing.routes.js)
- [server/index.js](../server/index.js)

## Visão geral

O fluxo é assim:

1. O frontend pede um checkout para um plano.
2. O controller recebe a requisição HTTP.
3. O service valida o plano, cria o pagamento e pede a URL ao gateway.
4. O gateway (serviço externo de pagamento) devolve uma URL de checkout.
5. O webhook (requisição HTTP automática que o provedor envia para avisar um evento) confirma o pagamento.
6. O backend ativa a assinatura do workspace.

## 1. Rotas

As rotas ligam a URL ao controller.

```js
export function registerBillingRoutes(router, controller, auth) {
  router.get("/api/billing/plans", controller.plans);
  router.post("/api/billing/checkout", auth, controller.checkout);
  router.get("/api/billing/subscription", auth, controller.subscription);
  router.get("/api/billing/payments", auth, controller.payments);
  router.post("/api/billing/cancel", auth, controller.cancel);
  router.post("/api/webhooks/infinitepay", controller.webhook);
}
```

### Como ler isso

- `export function ...` significa que a função pode ser importada em outro arquivo.
- `router.post(...)` registra uma rota do tipo `POST`.
- `auth` é um middleware (função intermediária que roda antes do controller) nas rotas protegidas.
- `controller.webhook` não usa `auth` porque o provedor externo precisa chamar essa rota.

## 2. Controller

O controller (camada que recebe a requisição e chama o service) não decide regra de negócio. Ele só organiza entrada e saída.

```js
export function createBillingController(paymentService, repository, gateway, subscriptionService) {
  return {
    async checkout(request) {
      const body = await request.json();
      return paymentService.startCheckout({ ...request.auth, planCode: body.planId });
    },
```

### Sintaxe importante

- `createBillingController(...)` é uma factory (função que cria e devolve um objeto pronto).
- `return { ... }` devolve um objeto com métodos.
- `async checkout(request)` quer dizer que a função trabalha com `await`.
- `const body = await request.json();` lê o corpo JSON da requisição.
- `...request.auth` é spread (sintaxe que copia propriedades de um objeto para outro).
- `planCode: body.planId` renomeia o valor na hora de montar o objeto.

O detalhe importante é este: o frontend manda `planId`, mas o service usa `planCode`.

## 3. Start checkout

Aqui fica a criação do pagamento pendente.

```js
async startCheckout({ workspaceId, userId, planCode }) {
  const plan = this.subscriptionService.getPlan(planCode);
  if (plan.code === "free") throw new Error("FREE_PLAN_DOES_NOT_REQUIRE_CHECKOUT");
```

### Sintaxe importante

- `async startCheckout(...)` permite usar `await` dentro da função.
- `{ workspaceId, userId, planCode }` é destructuring (extração de campos do objeto).
- `this.subscriptionService` acessa uma dependência guardada na classe.
- `throw new Error(...)` interrompe a execução com erro.

### O que essa parte faz

- busca o plano pelo código;
- bloqueia checkout para o plano Free;
- evita criar cobrança se o workspace já está no mesmo plano ativo.

## 4. Pagamento pendente

```js
const orderNsu = `fixflow_${crypto.randomUUID()}`;
const payment = this.repository.savePayment({
  id: crypto.randomUUID(), workspaceId, userId, planId: plan.id,
  gateway: "infinitepay", orderNsu, amountCents: plan.priceCents,
  status: "pending", createdAt: new Date().toISOString(),
});
```

### Sintaxe importante

- crase `` `...` `` é template literal (string com interpolação);
- `${...}` injeta um valor dentro da string;
- `crypto.randomUUID()` gera um identificador único;
- `new Date().toISOString()` cria uma data em texto padrão;
- o objeto passado para `savePayment(...)` usa propriedades curtas, como `workspaceId`, que equivalem a `workspaceId: workspaceId`.

### O que acontece aqui

- o sistema cria um `orderNsu` único;
- grava o pagamento como `pending`;
- guarda o valor oficial do plano no backend;
- evita depender do valor enviado pelo frontend.

## 5. Gateway

O gateway (provedor externo de pagamento) é chamado depois que o pagamento pendente já existe.

```js
const checkout = await this.gateway.createCheckout({ orderNsu, amountCents: plan.priceCents, planCode: plan.code });
payment.checkoutUrl = checkout.url;
```

### Sintaxe importante

- `await` espera a resposta da API externa;
- `checkout.url` lê a propriedade `url` do objeto retornado;
- `payment.checkoutUrl = ...` altera o objeto já salvo.

### O que isso significa

O backend não confia em redirecionamento do cliente para ativar assinatura. Ele só salva a URL e espera a confirmação oficial.

## 6. Webhook

Webhook (requisição HTTP automática enviada pelo provedor quando algo acontece) é o ponto que confirma o pagamento.

```js
async webhook(request) {
  const payload = await request.json();
  return paymentService.verifyAndHandleWebhook(payload, gateway.verifyWebhook(request, payload));
}
```

### Sintaxe importante

- `payload` é o corpo bruto do evento;
- `gateway.verifyWebhook(...)` devolve `true` ou `false`;
- `verifyAndHandleWebhook(payload, verified)` recebe os dados do evento e um booleano de validação.

### O que o webhook faz

- valida se o evento veio de uma origem confiável;
- confere se o pagamento existe;
- compara o valor pago com o valor salvo;
- marca o evento como processado;
- ativa a assinatura quando o status é `approved`.

## 7. Handle webhook

```js
handleWebhook(payload) {
  const { eventId, eventType, orderNsu, transactionNsu, status, amountCents } = payload;
  if (!eventId || !eventType || !orderNsu) throw new Error("INVALID_WEBHOOK");
```

### Sintaxe importante

- `const { ... } = payload` é destructuring de objeto;
- `!eventId` significa “não existe valor”;
- `||` significa “ou” lógico;
- `throw new Error(...)` interrompe o fluxo se faltar dado essencial.

### Continuação da lógica

```js
const existing = this.repository.findEvent("infinitepay", eventId);
if (existing?.processed) return { duplicate: true };
```

- `existing?.processed` usa optional chaining (acesso seguro quando o valor pode ser `null` ou `undefined`);
- se o evento já foi processado, o sistema não roda tudo de novo.

Depois:

```js
const payment = this.repository.findPaymentByOrder(orderNsu);
if (!payment) throw new Error("PAYMENT_NOT_FOUND");
if (Number(amountCents) !== payment.amountCents) throw new Error("PAYMENT_AMOUNT_MISMATCH");
```

- `Number(amountCents)` converte o valor para número;
- `!==` compara sem fazer conversão automática;
- isso impede fraude de valor.

Se o pagamento estiver aprovado:

```js
this.subscriptionService.activateFromPayment(payment, plan);
```

Isso chama o service de assinatura para ativar o workspace.

## 8. Subscription service

```js
activateFromPayment(payment, plan) {
  const start = new Date();
  const current = this.repository.findSubscription(payment.workspaceId);
  const base = current?.currentPeriodEnd && new Date(current.currentPeriodEnd) > start ? new Date(current.currentPeriodEnd) : start;
```

### Sintaxe importante

- `current?.currentPeriodEnd` acessa o campo só se `current` existir;
- `&&` exige que a primeira condição seja verdadeira;
- `? ... : ...` é operador ternário (escolha entre dois valores).

### O que essa parte faz

- calcula de onde o novo ciclo vai começar;
- se já existe assinatura ativa, renova a partir do fim atual;
- se não existe, começa agora.

Depois:

```js
if (plan.interval === "month") end.setMonth(end.getMonth() + 1);
if (plan.interval === "year") end.setFullYear(end.getFullYear() + 1);
```

Isso ajusta o fim do período conforme o intervalo do plano.

E no final:

```js
payment.status = "approved";
payment.paidAt = new Date().toISOString();
```

O pagamento fica aprovado e recebe data de confirmação.

## 9. Repositório em memória

```js
this.payments = new Map();
this.webhookEvents = new Map();
```

### Sintaxe importante

- `new Map()` cria uma coleção de pares chave/valor;
- `set(...)` grava um item;
- `get(...)` busca um item;
- `delete(...)` remove um item.

### O que esse repositório faz

Ele guarda dados temporários enquanto o backend roda. Em produção, isso seria trocado por PostgreSQL, que é o que o schema SQL prepara.

## 10. Como ler o fluxo inteiro

Quando você ver isto:

```js
router.post("/api/webhooks/infinitepay", controller.webhook);
```

significa:

- `router.post(...)`: registra a rota;
- `controller.webhook`: aponta para a função que vai tratar a chamada;
- `webhook (requisição automática do provedor)`: chega ao backend sem ação manual do usuário.

Quando você ver isto:

```js
return paymentService.startCheckout({ ...request.auth, planCode: body.planId });
```

significa:

- pega o usuário autenticado em `request.auth`;
- copia os campos dele com `...`;
- injeta `planCode` com o valor enviado pelo frontend;
- chama o service responsável pela regra de negócio.

## Resumo

O sistema de pagamento do FixFlow segue esta regra:

- controller recebe e organiza a requisição;
- service aplica a regra de negócio;
- repository guarda o estado;
- gateway (serviço externo de pagamento) cria o checkout;
- webhook (requisição automática de confirmação) aprova o pagamento;
- subscription service ativa ou renova o acesso.

Se você quiser, o próximo passo pode ser criar outro `.md` só com as sintaxes do JavaScript usadas aqui, tipo `async/await`, destructuring, spread, `Map`, `?.`, `?:` e `throw new Error(...)`.