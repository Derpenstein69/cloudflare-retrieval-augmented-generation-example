export class SessionDO {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/save':
        const email = await request.text();
        await this.state.storage.put('email', email);
        return new Response(email);
      
      case '/get':
        const storedEmail = await this.state.storage.get('email');
        return new Response(storedEmail || '');
      
      case '/delete':
        await this.state.storage.delete('email');
        return new Response('OK');
      
      default:
        return new Response('Not Found', { status: 404 });
    }
  }
}