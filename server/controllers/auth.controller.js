export function createAuthController(authService) {
  return {
    async register(request) {
      const body = await request.json();
      return authService.register({ ...body, request });
    },
    async login(request) {
      return authService.login(await request.json());
    },
  };
}
