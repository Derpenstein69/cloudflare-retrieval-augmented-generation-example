import type { User, Note, MemoryFolder, AppState } from './types';

// Custom error classes
class ApiError extends Error {
  constructor(
    public message: string,
    public code: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class NetworkError extends ApiError {
  constructor(message = 'Network request failed') {
    super(message, 'NETWORK_ERROR', 0);
  }
}

// Response types
type ApiResponse<T> = {
  data?: T;
  error?: string;
  status: number;
  headers?: Headers;
};

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  useCache?: boolean;
  validate?: (data: any) => boolean;
}

class ApiService {
  private static instance: ApiService;
  private baseUrl: string;
  private token: string | null;
  private abortControllers: Map<string, AbortController>;
  private cache: Map<string, {data: any; timestamp: number}>;

  private readonly DEFAULT_TIMEOUT = 5000;
  private readonly MAX_RETRIES = 3;
  private readonly CACHE_TTL = 300000; // 5 minutes

  private constructor() {
    this.baseUrl = '';
    this.token = null;
    this.abortControllers = new Map();
    this.cache = new Map();
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async fetchWithErrorHandling<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    try {
      // Check cache
      if (config.useCache) {
        const cached = this.getFromCache<T>(endpoint);
        if (cached) return cached;
      }

      const response = await this.executeRequest<T>(endpoint, config, controller, requestId);

      // Cache successful GET requests
      if (config.useCache && config.method === 'GET' && response.status === 200) {
        this.setCache(endpoint, response);
      }

      return response;
    } catch (error) {
      return this.handleError(error, endpoint, config);
    } finally {
      this.abortControllers.delete(requestId);
    }
  }

  private async executeRequest<T>(
    endpoint: string,
    config: RequestConfig,
    controller: AbortController,
    requestId: string,
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const timeout = config.timeout || this.DEFAULT_TIMEOUT;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...config,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
          ...config.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(
          'Request failed',
          `HTTP_${response.status}`,
          response.status,
          await response.json().catch(() => null)
        );
      }

      const data = await response.json();

      if (config.validate && !config.validate(data)) {
        throw new ApiError(
          'Response validation failed',
          'VALIDATION_ERROR',
          400,
          data
        );
      }

      return {
        data: data as T,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 'TIMEOUT', 408);
      }

      if (this.shouldRetry(error, retryCount, config)) {
        await this.delay(Math.pow(2, retryCount) * 1000);
        return this.executeRequest<T>(endpoint, config, controller, requestId, retryCount + 1);
      }

      throw error;
    }
  }

  private shouldRetry(error: any, retryCount: number, config: RequestConfig): boolean {
    const maxRetries = config.retries || this.MAX_RETRIES;
    return (
      retryCount < maxRetries &&
      (error instanceof NetworkError || error.status >= 500)
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getFromCache<T>(key: string): ApiResponse<T> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return { data: cached.data, status: 200 };
  }

  private setCache(key: string, response: ApiResponse<any>): void {
    this.cache.set(key, {
      data: response.data,
      timestamp: Date.now()
    });
  }

  private handleError(error: any, endpoint: string, config: RequestConfig): ApiResponse<never> {
    console.error(`API Error (${endpoint}):`, error);

    if (error instanceof ApiError) {
      return {
        error: error.message,
        status: error.status,
        data: error.data
      };
    }

    return {
      error: error.message || 'Unknown error occurred',
      status: 500
    };
  }

  // API methods remain the same but with enhanced config options
  async login(email: string, password: string): Promise<ApiResponse<{ token: string }>> {
    return this.fetchWithErrorHandling('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      timeout: 10000,
      retries: 2
    });
  }

  async signup(email: string, password: string): Promise<ApiResponse<{ token: string }>> {
    return this.fetchWithErrorHandling('/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.fetchWithErrorHandling('/logout', {
      method: 'POST',
    });
  }

  // Notes API
  async getNotes(): Promise<ApiResponse<Note[]>> {
    return this.fetchWithErrorHandling('/notes');
  }

  async createNote(text: string): Promise<ApiResponse<Note>> {
    return this.fetchWithErrorHandling('/notes', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async deleteNote(id: string): Promise<ApiResponse<void>> {
    return this.fetchWithErrorHandling(`/notes/${id}`, {
      method: 'DELETE',
    });
  }

  // Profile API
  async getProfile(): Promise<ApiResponse<User>> {
    return this.fetchWithErrorHandling('/profile');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.fetchWithErrorHandling('/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Settings API
  async updateSettings(data: {
    current_password?: string;
    new_password?: string;
    theme?: string;
  }): Promise<ApiResponse<void>> {
    return this.fetchWithErrorHandling('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Memory API
  async getMemoryFolders(): Promise<ApiResponse<MemoryFolder[]>> {
    return this.fetchWithErrorHandling('/memory');
  }

  async createMemoryFolder(name: string): Promise<ApiResponse<MemoryFolder>> {
    return this.fetchWithErrorHandling('/memory', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async updateMemoryFolder(id: string, data: Partial<MemoryFolder>): Promise<ApiResponse<MemoryFolder>> {
    return this.fetchWithErrorHandling(`/memory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMemoryFolder(id: string): Promise<ApiResponse<void>> {
    return this.fetchWithErrorHandling(`/memory/${id}`, {
      method: 'DELETE',
    });
  }

  async addToMemoryFolder(folderId: string, noteId: string): Promise<ApiResponse<void>> {
    return this.fetchWithErrorHandling(`/memory/${folderId}/notes/${noteId}`, {
      method: 'PUT',
    });
  }

  async removeFromMemoryFolder(folderId: string, noteId: string): Promise<ApiResponse<void>> {
    return this.fetchWithErrorHandling(`/memory/${folderId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const api = ApiService.getInstance();
