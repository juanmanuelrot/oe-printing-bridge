// ── Bridge -> Cloud messages ────────────────────────────────────────────

export interface BridgeAuthMessage {
  type: 'auth';
  token: string;
}

export interface PrintersReportMessage {
  type: 'printers:report';
  printers: Array<{
    localPrinterId: string;
    name: string;
    address: string;
    status: string;
  }>;
}

export interface PrinterStatusMessage {
  type: 'printer:status';
  localPrinterId: string;
  status: string;
}

export interface JobReceivedMessage {
  type: 'job:received';
  jobId: string;
}

export interface JobStartedMessage {
  type: 'job:started';
  jobId: string;
}

export interface JobCompletedMessage {
  type: 'job:completed';
  jobId: string;
}

export interface JobFailedMessage {
  type: 'job:failed';
  jobId: string;
  error: string;
}

export interface PongMessage {
  type: 'pong';
}

export type BridgeToCloudMessage =
  | BridgeAuthMessage
  | PrintersReportMessage
  | PrinterStatusMessage
  | JobReceivedMessage
  | JobStartedMessage
  | JobCompletedMessage
  | JobFailedMessage
  | PongMessage;

// ── Cloud -> Bridge messages ────────────────────────────────────────────

export interface AuthOkMessage {
  type: 'auth:ok';
  bridgeId: string;
}

export interface AuthErrorMessage {
  type: 'auth:error';
  error: string;
}

export interface PrintJobMessage {
  type: 'print:job';
  jobId: string;
  printerId: string;
  data: string;
}

export interface PingMessage {
  type: 'ping';
}

export type CloudToBridgeMessage =
  | AuthOkMessage
  | AuthErrorMessage
  | PrintJobMessage
  | PingMessage;
