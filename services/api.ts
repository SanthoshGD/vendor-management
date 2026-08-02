/**
 * Service Layer Abstraction for StyleSphere Nexus Backend Alignment
 * 
 * Maps frontend UI actions and page requests to future FastAPI + Supabase backend API endpoints:
 * - GET /dashboard
 * - GET /vendors
 * - GET /vendors/{id}
 * - GET /vendors/{id}/documents
 * - GET /vendors/{id}/products
 * - GET /reviews/pending
 * - GET /activity
 * - GET /analytics
 * - POST /assistant/chat
 * - POST /vendors/{id}/approve
 * - POST /vendors/{id}/reject
 * - POST /vendors/{id}/request-changes
 */

export interface ApiDashboardResponse {
  metrics: {
    pendingVendors: number;
    inReview: number;
    approved: number;
    rejected: number;
  };
  pipeline: {
    weekly: Array<{ stage: string; count: number }>;
    monthly: Array<{ stage: string; count: number }>;
  };
  approvalRate: {
    region: string;
    percentage: number;
  };
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface AssistantChatRequest {
  message: string;
  vendor_id?: string | null;
  conversation_id?: string | null;
  stream?: boolean;
  history?: Array<{ role: string; content: string }>;
}

export interface AssistantChatResponse {
  success: boolean;
  data: {
    conversation_id: string;
    message: string;
    citations: Array<{
      collection: string;
      title?: string;
      vendor_id?: string;
      excerpt?: string;
      similarity?: number;
    }>;
    suggestions: string[];
    created_at: string;
  };
}

export class NexusApiService {
  static async getDashboard(): Promise<ApiDashboardResponse> {
    const res = await fetch(`${API_BASE_URL}/dashboard`);
    if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.statusText}`);
    const body = await res.json();
    return body.data || body;
  }

  static async getVendors(params?: { status?: string; risk?: string }) {
    const url = new URL(`${API_BASE_URL}/vendors`);
    if (params?.status) url.searchParams.append('status', params.status);
    if (params?.risk) url.searchParams.append('risk', params.risk);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Vendors fetch failed: ${res.statusText}`);
    return await res.json();
  }

  static async getVendorById(id: string) {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}`);
    if (!res.ok) throw new Error(`Vendor ${id} fetch failed: ${res.statusText}`);
    return await res.json();
  }

  static async getVendorDocuments(id: string) {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}/documents`);
    if (!res.ok) throw new Error(`Vendor ${id} documents fetch failed: ${res.statusText}`);
    return await res.json();
  }

  static async getVendorProducts(id: string) {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}/products`);
    if (!res.ok) throw new Error(`Vendor ${id} products fetch failed: ${res.statusText}`);
    return await res.json();
  }

  static async approveVendor(id: string, reason?: string) {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: reason || 'Approved following compliance verification' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Approve vendor failed (${res.status})`);
    }
    return await res.json();
  }

  static async rejectVendor(id: string, reason: string) {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Reject vendor failed (${res.status})`);
    }
    return await res.json();
  }

  static async requestVendorChanges(id: string, changes: string[], comment?: string) {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}/request-changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: comment || 'Please address required changes', changes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request changes failed (${res.status})`);
    }
    return await res.json();
  }

  static async chatAssistant(
    req: AssistantChatRequest
  ): Promise<AssistantChatResponse> {
    const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: false }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Assistant chat failed (${res.status})`);
    }
    return await res.json();
  }

  /**
   * Opens an SSE stream to `/api/v1/assistant/chat`.
   * Yields raw SSE data lines. Caller is responsible for closing the reader.
   */
  static async *chatAssistantStream(
    req: AssistantChatRequest
  ): AsyncGenerator<string> {
    const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, stream: true }),
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          yield line.slice(6); // strip "data: " prefix
        }
      }
    }
  }
}
