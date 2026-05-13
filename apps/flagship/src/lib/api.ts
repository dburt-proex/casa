export const api = {
  async resolveAuthToken() {
    const clerk = (window as any).Clerk;
    if (clerk?.session) {
      const clerkToken = await clerk.session.getToken();
      if (clerkToken) return clerkToken;
    }
    return localStorage.getItem('casa_token');
  },

  async post<T>(endpoint: string, payload: any): Promise<T> {
    const token = await this.resolveAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('casa_token');
        localStorage.removeItem('casa_user');
        window.location.reload();
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `API Error: ${res.statusText}`);
    }

    return res.json();
  },

  async get<T>(endpoint: string): Promise<T> {
    const token = await this.resolveAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api${endpoint}`, {
      headers
    });

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('casa_token');
        localStorage.removeItem('casa_user');
        window.location.reload();
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `API Error: ${res.statusText}`);
    }

    return res.json();
  }
};
