export function createAccountController(accountService) {
  return {
    subscription: (request) => accountService.subscription(request.auth),
    cancelSubscription: async (request) => accountService.cancelSubscription(request.auth),
    exportData: (request) => accountService.exportData(request.auth),
    deactivate: (request) => accountService.deactivate(request.auth),
    delete: async (request) => accountService.delete(request.auth, await request.json()),
  };
}
