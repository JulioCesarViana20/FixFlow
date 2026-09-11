export function createAuthController(authService) {
  return {
    async register(request) {
      const body = await request.json();
      return authService.register({ ...body, request });
    },
  };
}
