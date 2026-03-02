export interface CloudPrintClientOptions {
  url: string;
  apiKey: string;
}

export interface CloudPrintJob {
  id: string;
  printerId: string;
  groupId: string;
  status: string;
  error?: string | null;
  createdAt: string;
  sentAt?: string | null;
  completedAt?: string | null;
}

export interface CloudPrintResponse {
  jobId: string;
  status: string;
}

export interface CloudPrinter {
  id: string;
  bridgeId: string;
  localPrinterId: string;
  name: string;
  address: string;
  status: string;
  createdAt: string;
}

export class CloudPrintClient {
  private url: string;
  private apiKey: string;

  constructor(options: CloudPrintClientOptions) {
    this.url = options.url.replace(/\/$/, '');
    this.apiKey = options.apiKey;
  }

  async print(params: { printerId: string; data: Uint8Array | ArrayBuffer }): Promise<CloudPrintResponse> {
    const bytes = params.data instanceof ArrayBuffer ? new Uint8Array(params.data) : params.data;
    const base64 = this.uint8ArrayToBase64(bytes);

    return this.fetch<CloudPrintResponse>('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerId: params.printerId, data: base64 }),
    });
  }

  async getJobs(params?: { groupId?: string; status?: string; limit?: number }): Promise<CloudPrintJob[]> {
    const searchParams = new URLSearchParams();
    if (params?.groupId) searchParams.set('groupId', params.groupId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const qs = searchParams.toString();
    return this.fetch<CloudPrintJob[]>(`/api/jobs${qs ? '?' + qs : ''}`);
  }

  async getJob(jobId: string): Promise<CloudPrintJob> {
    return this.fetch<CloudPrintJob>(`/api/jobs/${encodeURIComponent(jobId)}`);
  }

  async getPrinters(params?: { groupId?: string }): Promise<CloudPrinter[]> {
    const searchParams = new URLSearchParams();
    if (params?.groupId) searchParams.set('groupId', params.groupId);

    const qs = searchParams.toString();
    return this.fetch<CloudPrinter[]>(`/api/printers${qs ? '?' + qs : ''}`);
  }

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.url}${path}`;
    const response = await globalThis.fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (response.status === 204) return undefined as unknown as T;

    if (!response.ok) {
      const body = await response.text();
      let message: string;
      try {
        const json = JSON.parse(body) as { error?: string };
        message = json.error ?? `HTTP ${response.status}`;
      } catch {
        message = body || `HTTP ${response.status}`;
      }
      throw new Error(message);
    }

    return response.json() as Promise<T>;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
