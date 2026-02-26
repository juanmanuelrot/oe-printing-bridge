const DEFAULT_OPTIONS = {
    url: 'http://localhost:9120',
    wsUrl: 'ws://localhost:9120/ws',
    reconnectInterval: 3000,
    maxReconnectAttempts: Infinity,
};
export class PrintBridgeClient {
    options;
    ws = null;
    handlers = new Set();
    typedHandlers = new Map();
    reconnectTimer = null;
    reconnectAttempts = 0;
    _status = 'disconnected';
    _autoReconnect = true;
    constructor(options) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    // ── Connection Status ──────────────────────────────────────────────
    get status() {
        return this._status;
    }
    get isConnected() {
        return this._status === 'connected';
    }
    // ── WebSocket Lifecycle ────────────────────────────────────────────
    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }
        this._autoReconnect = true;
        this.setStatus('connecting');
        try {
            this.ws = new WebSocket(this.options.wsUrl);
        }
        catch {
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
                const wsEvent = JSON.parse(event.data);
                this.dispatchEvent(wsEvent);
            }
            catch {
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
    disconnect() {
        this._autoReconnect = false;
        this.clearReconnectTimer();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.setStatus('disconnected');
    }
    on(handlerOrType, maybeHandler) {
        if (typeof handlerOrType === 'function') {
            this.handlers.add(handlerOrType);
            return () => { this.handlers.delete(handlerOrType); };
        }
        const type = handlerOrType;
        const handler = maybeHandler;
        if (!this.typedHandlers.has(type)) {
            this.typedHandlers.set(type, new Set());
        }
        this.typedHandlers.get(type).add(handler);
        return () => { this.typedHandlers.get(type)?.delete(handler); };
    }
    off(handlerOrType, maybeHandler) {
        if (typeof handlerOrType === 'function') {
            this.handlers.delete(handlerOrType);
        }
        else {
            this.typedHandlers.get(handlerOrType)?.delete(maybeHandler);
        }
    }
    // ── HTTP API ──────────────────────────────────────────────────────
    async getStatus() {
        return this.fetch('/api/status');
    }
    async getAvailablePrinters() {
        return this.fetch('/api/printers/available');
    }
    async getConfiguredPrinters() {
        return this.fetch('/api/printers/configured');
    }
    async getPrinters() {
        const [available, configured] = await Promise.all([
            this.getAvailablePrinters(),
            this.getConfiguredPrinters(),
        ]);
        return { available, configured };
    }
    async addPrinter(config) {
        return this.fetch('/api/printers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
    }
    async updatePrinter(id, updates) {
        return this.fetch('/api/printers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
        });
    }
    async removePrinter(id) {
        await this.fetch(`/api/printers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
    async print(printerKey, data) {
        const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
        const base64 = this.uint8ArrayToBase64(bytes);
        return this.fetch('/api/print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ printerId: printerKey, data: base64 }),
        });
    }
    async getRecentJobs(limit = 20) {
        return this.fetch(`/api/jobs/recent?limit=${limit}`);
    }
    // ── Private Helpers ───────────────────────────────────────────────
    async fetch(path, init) {
        const url = `${this.options.url}${path}`;
        const response = await globalThis.fetch(url, init);
        if (response.status === 204)
            return undefined;
        if (!response.ok) {
            const body = await response.text();
            let message;
            try {
                const json = JSON.parse(body);
                message = json.error ?? `HTTP ${response.status}`;
            }
            catch {
                message = body || `HTTP ${response.status}`;
            }
            throw new Error(message);
        }
        return response.json();
    }
    setStatus(status) {
        if (this._status === status)
            return;
        this._status = status;
    }
    dispatchEvent(event) {
        for (const handler of this.handlers) {
            try {
                handler(event);
            }
            catch { /* ignore handler errors */ }
        }
        const typed = this.typedHandlers.get(event.type);
        if (typed) {
            for (const handler of typed) {
                try {
                    handler(event);
                }
                catch { /* ignore handler errors */ }
            }
        }
    }
    scheduleReconnect() {
        this.clearReconnectTimer();
        if (this.reconnectAttempts >= this.options.maxReconnectAttempts)
            return;
        const delay = Math.min(this.options.reconnectInterval * Math.pow(1.5, this.reconnectAttempts), 30000);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    uint8ArrayToBase64(bytes) {
        // Browser-compatible base64 encoding
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}
//# sourceMappingURL=client.js.map