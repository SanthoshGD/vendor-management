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

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.stylesphere.nexus/v1';

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

  static async chatAssistant(message: string, contextVendorId?: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, contextVendorId }),
      });
      return await res.json();
    } catch {
      return null;
    }
  }
}
