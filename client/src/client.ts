import type {
  AvailablePrinter,
  BridgeClientOptions,
  BridgeConnectionStatus,
  BridgeStatusResponse,
  PrinterConfig,
  PrintJob,
  PrintResponse,
  WsEvent,
} from './types.js';

type EventHandler = (event: WsEvent) => void;

const DEFAULT_OPTIONS: Required<BridgeClientOptions> = {
  url: 'http://localhost:9120',
  wsUrl: 'ws://localhost:9120/ws',
  reconnectInterval: 3000,
  maxReconnectAttempts: Infinity,
};

export class PrintBridgeClient {
  private options: Required<BridgeClientOptions>;
  private ws: WebSocket | null = null;
  private handlers = new Set<EventHandler>();
  private typedHandlers = new Map<string, Set<EventHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private _status: BridgeConnectionStatus = 'disconnected';
  private _autoReconnect = true;

  constructor(options?: BridgeClientOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ── Connection Status ──────────────────────────────────────────────

  get status(): BridgeConnectionStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === 'connected';
  }

  // ── WebSocket Lifecycle ────────────────────────────────────────────

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this._autoReconnect = true;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.options.wsUrl);
    } catch {
      this.setStatus('error');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const wsEvent = JSON.parse(event.data as string) as WsEvent;
        this.dispatchEvent(wsEvent);
      } catch {
        // Ignore invalid messages
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this._autoReconnect) {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  disconnect(): void {
    this._autoReconnect = false;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  // ── Event Subscription ────────────────────────────────────────────

  /** Subscribe to all WebSocket events */
  on(handler: EventHandler): () => void;
  /** Subscribe to a specific event type */
  on(eventType: WsEvent['type'], handler: EventHandler): () => void;
  on(handlerOrType: EventHandler | WsEvent['type'], maybeHandler?: EventHandler): () => void {
    if (typeof handlerOrType === 'function') {
      this.handlers.add(handlerOrType);
      return () => { this.handlers.delete(handlerOrType); };
    }

    const type = handlerOrType;
    const handler = maybeHandler!;
    if (!this.typedHandlers.has(type)) {
      this.typedHandlers.set(type, new Set());
    }
    this.typedHandlers.get(type)!.add(handler);
    return () => { this.typedHandlers.get(type)?.delete(handler); };
  }

  off(handler: EventHandler): void;
  off(eventType: WsEvent['type'], handler: EventHandler): void;
  off(handlerOrType: EventHandler | WsEvent['type'], maybeHandler?: EventHandler): void {
    if (typeof handlerOrType === 'function') {
      this.handlers.delete(handlerOrType);
    } else {
      this.typedHandlers.get(handlerOrType)?.delete(maybeHandler!);
    }
  }

  // ── HTTP API ──────────────────────────────────────────────────────

  async getStatus(): Promise<BridgeStatusResponse> {
    return this.fetch<BridgeStatusResponse>('/api/status');
  }

  async getAvailablePrinters(): Promise<AvailablePrinter[]> {
    return this.fetch<AvailablePrinter[]>('/api/printers/available');
  }

  async getConfiguredPrinters(): Promise<PrinterConfig[]> {
    return this.fetch<PrinterConfig[]>('/api/printers/configured');
  }

  async getPrinters(): Promise<{ available: AvailablePrinter[]; configured: PrinterConfig[] }> {
    const [available, configured] = await Promise.all([
      this.getAvailablePrinters(),
      this.getConfiguredPrinters(),
    ]);
    return { available, configured };
  }

  async addPrinter(config: { id: string; name: string; address: string; enabled?: boolean }): Promise<PrinterConfig> {
    return this.fetch<PrinterConfig>('/api/printers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  }

  async updatePrinter(id: string, updates: Partial<Omit<PrinterConfig, 'id'>>): Promise<PrinterConfig> {
    return this.fetch<PrinterConfig>('/api/printers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
  }

  async removePrinter(id: string): Promise<void> {
    await this.fetch(`/api/printers/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async print(printerKey: string, data: Uint8Array | ArrayBuffer): Promise<PrintResponse> {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const base64 = this.uint8ArrayToBase64(bytes);

    return this.fetch<PrintResponse>('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerId: printerKey, data: base64 }),
    });
  }

  async getRecentJobs(limit = 20): Promise<PrintJob[]> {
    return this.fetch<PrintJob[]>(`/api/jobs/recent?limit=${limit}`);
  }

  // ── Private Helpers ───────────────────────────────────────────────

  private async fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.options.url}${path}`;
    const response = await globalThis.fetch(url, init);

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

  private setStatus(status: BridgeConnectionStatus): void {
    if (this._status === status) return;
    this._status = status;
  }

  private dispatchEvent(event: WsEvent): void {
    for (const handler of this.handlers) {
      try { handler(event); } catch { /* ignore handler errors */ }
    }
    const typed = this.typedHandlers.get(event.type);
    if (typed) {
      for (const handler of typed) {
        try { handler(event); } catch { /* ignore handler errors */ }
      }
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) return;

    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(1.5, this.reconnectAttempts),
      30000,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    // Browser-compatible base64 encoding
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
