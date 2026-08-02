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
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard`);
      if (!res.ok) throw new Error('API request failed');
      return await res.json();
    } catch {
      // Fallback response for dev/mock mode
      return {
        metrics: { pendingVendors: 4, inReview: 3, approved: 12, rejected: 2 },
        pipeline: {
          weekly: [
            { stage: 'Submitted', count: 18 },
            { stage: 'AI Extraction', count: 15 },
            { stage: 'AI Validation', count: 12 },
            { stage: 'Human Review', count: 7 },
            { stage: 'Approved', count: 5 },
            { stage: 'Rejected', count: 2 },
          ],
          monthly: [
            { stage: 'Submitted', count: 68 },
            { stage: 'AI Extraction', count: 62 },
            { stage: 'AI Validation', count: 54 },
            { stage: 'Human Review', count: 28 },
            { stage: 'Approved', count: 22 },
            { stage: 'Rejected', count: 6 },
          ],
        },
        approvalRate: { region: 'China', percentage: 93 },
      };
    }
  }

  static async getVendors(params?: { status?: string; risk?: string }) {
    try {
      const url = new URL(`${API_BASE_URL}/vendors`);
      if (params?.status) url.searchParams.append('status', params.status);
      if (params?.risk) url.searchParams.append('risk', params.risk);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('API request failed');
      return await res.json();
    } catch {
      return null;
    }
  }

  static async getVendorById(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/${id}`);
      if (!res.ok) throw new Error('API request failed');
      return await res.json();
    } catch {
      return null;
    }
  }

  static async getVendorDocuments(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/${id}/documents`);
      if (!res.ok) throw new Error('API request failed');
      return await res.json();
    } catch {
      return null;
    }
  }

  static async getVendorProducts(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/${id}/products`);
      if (!res.ok) throw new Error('API request failed');
      return await res.json();
    } catch {
      return null;
    }
  }

  static async approveVendor(id: string, reason?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  static async rejectVendor(id: string, reason: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  static async requestVendorChanges(id: string, changes: string[]) {
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/${id}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  static async chatAssistant(
    req: AssistantChatRequest
  ): Promise<AssistantChatResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...req, stream: false }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
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
