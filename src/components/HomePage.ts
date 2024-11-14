// components/HomePage.ts

import { Context } from 'hono';
import { Logger } from './shared';

interface HomePageOptions {
  title?: string;
  showAuth?: boolean;
  customFeatures?: string[];
}

export class HomePage {
  private readonly template: string;
  private readonly logger: Logger;

  constructor(private readonly options: HomePageOptions = {}) {
    this.logger = new Logger('HomePage');
    this.template = this.createTemplate();
  }

  private createTemplate(): string {
    const {
      title = 'Welcome to RusstCorp AI',
      showAuth = true,
      customFeatures = [
        'Secure note-taking with advanced search capabilities',
        'Organize your memories into folders',
        'Share notes and collaborate with others',
        'AI-powered insights and recommendations'
      ]
    } = this.options;

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-Content-Type-Options" content="nosniff">
          <title>${this.escapeHtml(title)}</title>
          <link rel="stylesheet" href="/styles/main.css">
        </head>
        <body>
          <div class="home-container">
            <h1>${this.escapeHtml(title)}</h1>
            <p>Your AI-powered assistant for managing notes and memories.</p>

            ${showAuth ? this.renderAuthButtons() : ''}

            <div class="home-description">
              <h2>Features</h2>
              <ul>
                ${customFeatures.map(feature =>
                  `<li>${this.escapeHtml(feature)}</li>`
                ).join('')}
              </ul>
            </div>

            <div id="error-container" class="error-container" style="display: none;"></div>
          </div>

          ${this.renderScript()}
        </body>
      </html>
    `;
  }

  private renderAuthButtons(): string {
    return `
      <div class="home-links">
        <a href="/login" class="button" data-testid="login-button">Login</a>
        <a href="/signup" class="button" data-testid="signup-button">Sign Up</a>
      </div>
    `;
  }

  private renderScript(): string {
    return `
      <script>
        class HomePageManager {
          constructor() {
            this.errorContainer = document.getElementById('error-container');
            this.init();
          }

          init() {
            try {
              this.attachEventListeners();
              this.checkAuthStatus();
              console.log('Home page initialized successfully');
            } catch (error) {
              this.handleError('Failed to initialize home page', error);
            }
          }

          attachEventListeners() {
            document.addEventListener('click', (e) => {
              const target = e.target as HTMLElement;
              if (target.matches('.button')) {
                this.handleButtonClick(e, target);
              }
            });

            window.addEventListener('error', (e) => {
              this.handleError('Runtime error occurred', e.error);
            });
          }

          async checkAuthStatus() {
            try {
              const response = await fetch('/api/auth/status');
              const data = await response.json();

              if (data.authenticated) {
                window.location.href = '/dashboard';
              }
            } catch (error) {
              this.handleError('Failed to check auth status', error);
            }
          }

          handleButtonClick(e: Event, target: HTMLElement) {
            try {
              // Add any click handling logic here
              console.log('Button clicked:', target.getAttribute('href'));
            } catch (error) {
              this.handleError('Error handling button click', error);
              e.preventDefault();
            }
          }

          handleError(message: string, error: Error) {
            console.error(message, error);

            if (this.errorContainer) {
              this.errorContainer.textContent = 'An error occurred. Please try again later.';
              this.errorContainer.style.display = 'block';
            }

            // Could add error reporting service here
            this.reportError(message, error);
          }

          async reportError(message: string, error: Error) {
            try {
              await fetch('/api/log/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message,
                  error: error.message,
                  stack: error.stack,
                  timestamp: new Date().toISOString()
                })
              });
            } catch (reportError) {
              console.error('Failed to report error:', reportError);
            }
          }
        }

        // Initialize when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
          new HomePageManager();
        });
      </script>
    `;
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  public async render(c: Context): Promise<Response> {
    try {
      // Add security headers
      c.header('X-Content-Type-Options', 'nosniff');
      c.header('X-Frame-Options', 'DENY');
      c.header('X-XSS-Protection', '1; mode=block');
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

      return c.html(this.template);
    } catch (error) {
      this.logger.error('Failed to render home page', error);
      return c.html('Internal Server Error', 500);
    }
  }
}

// Usage in routes.ts
publicRoutes.get('/', async (c) => {
  const homePage = new HomePage({
    title: 'Welcome to RusstCorp AI',
    showAuth: true
  });
  return homePage.render(c);
});
