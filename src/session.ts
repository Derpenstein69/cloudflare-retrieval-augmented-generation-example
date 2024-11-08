export class SessionDO {
  private state: DurableObjectState;
  private env: any;
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    try {
      const url = new URL(request.url);
      
      switch (url.pathname) {
        case '/save':
          return await this.handleSave(request);
        case '/get':
          return await this.handleGet();
        case '/delete':
          return await this.handleDelete();
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Session error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  private async handleSave(request: Request): Promise<Response> {
    const email = await request.text();
    const timestamp = Date.now();
    await this.state.storage.put('email', email);
    await this.state.storage.put('timestamp', timestamp);
    return new Response(email);
  }

  private async handleGet(): Promise<Response> {
    const email = await this.state.storage.get('email');
    const timestamp = await this.state.storage.get('timestamp');
    
    if (!email || !timestamp || Date.now() - Number(timestamp) > SessionDO.SESSION_TIMEOUT) {
      await this.handleDelete();
      return new Response('', { status: 401 });
    }
    
    return new Response(email);
  }

  private async handleDelete(): Promise<Response> {
    await this.state.storage.delete('email');
    await this.state.storage.delete('timestamp');
    return new Response('OK');
  }

  static createSessionId(namespace: DurableObjectNamespace, sessionToken: string): DurableObjectId {
    // Use a consistent hash of the session token
    const encoder = new TextEncoder();
    const data = encoder.encode(sessionToken);
    return namespace.idFromName(sessionToken);
  }
}