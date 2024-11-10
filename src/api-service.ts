import type { User, Note, MemoryFolder, AppState } from './types';

type ApiResponse<T> = {
  data?: T;
  error?: string;
  status: number;
};

class ApiService {
  private static instance: ApiService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = '';
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async fetchWithErrorHandling<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json();
      return {
        data: data as T,
        status: response.status,
      };
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return {
        error: error.message,
        status: 500,
      };
    }
  }

  // Auth API
  async login(email: string, password: string): Promise<ApiResponse<{ token: string }>> {
    return this.fetchWithErrorHandling('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
