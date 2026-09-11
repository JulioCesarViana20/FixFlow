import { createServer } from "node:http";
import { env, requireProductionSecrets } from "./config/env.js";
import { Router } from "./http/router.js";
import { requireAuth } from "./middleware/auth.js";
import { createRequestGuard } from "./middleware/request-guard.js";
import { BillingRepository } from "./repositories/billing.repository.js";
import { InfinitePayService } from "./services/infinitepay.service.js";
import { PaymentService } from "./services/payment.service.js";
import { SubscriptionService } from "./services/subscription.service.js";
import { createBillingController } from "./controllers/billing.controller.js";
import { registerBillingRoutes } from "./routes/billing.routes.js";
import { LegalRepository } from "./repositories/legal.repository.js";
import { ConsentService } from "./services/consent.service.js";
import { AuthService } from "./services/auth.service.js";
import { createAuthController } from "./controllers/auth.controller.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { AccountService } from "./services/account.service.js";
import { createAccountController } from "./controllers/account.controller.js";
import { registerAccountRoutes } from "./routes/account.routes.js";

requireProductionSecrets();
const repository = new BillingRepository();
const subscriptionService = new SubscriptionService(repository);
const gateway = new InfinitePayService();
const paymentService = new PaymentService(repository, subscriptionService, gateway);
const controller = createBillingController(paymentService, repository, gateway, subscriptionService);
const router = new Router();
const requestGuard = createRequestGuard();
const legalRepository = new LegalRepository();
const consentService = new ConsentService(legalRepository);
const authService = new AuthService(legalRepository, consentService);
const authController = createAuthController(authService);
const accountService = new AccountService(legalRepository, repository, subscriptionService, gateway);
const accountController = createAccountController(accountService);

registerBillingRoutes(router, controller, (request, response, next) => {
  request.auth = requireAuth(request);
  return next();
});
registerAuthRoutes(router, authController);
registerAccountRoutes(router, accountController, (request, response, next) => {
  request.auth = requireAuth(request);
  return next();
});

const server = createServer((request, response) => requestGuard(request, response, () => router.handle(request, response)));
server.listen(env.port, () => console.log(`FixFlow billing API listening on ${env.port}`));
