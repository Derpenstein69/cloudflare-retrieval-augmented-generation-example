export class SessionDO {
  private state: DurableObjectState;
  private env: any;
  private email: string | null = null;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/save':
        const data = await request.text();
        this.email = data;
        await this.state.storage.put('email', data);
        return new Response('OK');
      
      case '/get':
        if (!this.email) {
          this.email = await this.state.storage.get('email');
        }
        return new Response(this.email || null);
      
      case '/delete':
        await this.state.storage.delete('email');
        this.email = null;
        return new Response('OK');
      
      default:
        return new Response('Not Found', { status: 404 });
    }
  }
}