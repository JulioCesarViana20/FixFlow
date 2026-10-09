export function createWorkspaceController(service) {
  return {
    read: (request) => service.read(request.auth),
    write: async (request) => {
      const body = await request.json();
      return service.write(request.auth, body.data, body.version ?? null);
    },
  };
}
