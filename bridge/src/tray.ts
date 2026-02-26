import { createRequire } from 'node:module';
import type { PrinterWatcher } from './printers/watcher.js';
import type { ConfigManager } from './config/config-manager.js';
import type { ClickEvent, Conf, Menu, MenuItem, Action } from 'systray2';

// systray2 is CJS — use createRequire for clean interop
const require = createRequire(import.meta.url);

interface SysTrayClass {
  new (conf: Conf): SysTrayInstance;
  separator: MenuItem;
}

interface SysTrayInstance {
  onClick(listener: (action: ClickEvent) => void): Promise<SysTrayInstance>;
  sendAction(action: Action): Promise<SysTrayInstance>;
  kill(exitNode?: boolean): Promise<void>;
  ready(): Promise<void>;
}

const SysTray: SysTrayClass = require('systray2').default;

// Minimal 16x16 green/yellow/red .ico files as base64 placeholders
const ICON_GREEN = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgAD/gIAA/4CAAP+AgAD/gIAA/4CAAP+AgAD/gIAA/4CAAP+AgAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAP+A/wD/gP8A/4D/AP+A/wD/gP8A/4D/AP+A/wD/gIAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgAD/gP8A/4D/AP+A/wD/gP8A/4D/AP+A/wD/gP8A/4CAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
const ICON_YELLOW = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgAD/gIAA/4CAAP+AgAD/gIAA/4CAAP+AgAD/gIAA/4CAAP+AgAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAP/w8AD/8PAA//DwAP/w8AD/8PAA//DwAP/w8AD/gIAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgAD/8PAA//DwAP/w8AD/8PAA//DwAP/w8AD/8PAA/4CAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
const ICON_RED = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgAD/gIAA/4CAAP+AgAD/gIAA/4CAAP+AgAD/gIAA/4CAAP+AgAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAP/wAAD/8AAA//AAAP/wAAD/8AAA//AAAP/wAAD/gIAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgAD/8AAA//AAAP/wAAD/8AAA//AAAP/wAAD/8AAA/4CAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

const SEPARATOR = { title: '', tooltip: '', enabled: true };

export type TrayStatus = 'ok' | 'warning' | 'error';

export class BridgeTray {
  private tray: SysTrayInstance | null = null;
  private port: number;
  private currentStatus: TrayStatus = 'ok';

  constructor(
    port: number,
    private printerWatcher: PrinterWatcher,
    private configManager: ConfigManager,
    private onQuit: () => void,
  ) {
    this.port = port;
  }

  start(): void {
    this.tray = new SysTray({
      menu: {
        icon: this.getIcon(),
        title: '',
        tooltip: `Printer Bridge - localhost:${this.port}`,
        items: [
          {
            title: `Printer Bridge :${this.port}`,
            tooltip: 'Status',
            enabled: false,
          },
          SEPARATOR,
          {
            title: 'Quit',
            tooltip: 'Stop the bridge',
            enabled: true,
          },
        ],
      },
      debug: false,
      copyDir: true,
    });

    void this.tray.onClick((action: ClickEvent) => {
      if (action.item.title === 'Quit') {
        this.onQuit();
      }
    });

    // Update icon based on printer watcher events
    this.printerWatcher.on('printer:missing', () => {
      this.setStatus('warning');
    });
    this.printerWatcher.on('printer:status', () => {
      this.updateStatus();
    });
  }

  setStatus(status: TrayStatus): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    void this.tray?.sendAction({
      type: 'update-menu',
      menu: {
        icon: this.getIcon(),
        title: '',
        tooltip: this.getTooltip(),
        items: [],
      },
    });
  }

  private updateStatus(): void {
    const printers = this.printerWatcher.getConfiguredPrintersWithStatus();
    if (printers.length === 0) {
      this.setStatus('warning');
    } else if (printers.some((p) => p.status === 'missing' || p.status === 'error')) {
      this.setStatus('warning');
    } else {
      this.setStatus('ok');
    }
  }

  private getIcon(): string {
    switch (this.currentStatus) {
      case 'ok': return ICON_GREEN;
      case 'warning': return ICON_YELLOW;
      case 'error': return ICON_RED;
    }
  }

  private getTooltip(): string {
    switch (this.currentStatus) {
      case 'ok': return `Printer Bridge - Running on :${this.port}`;
      case 'warning': return `Printer Bridge - Warning (check printers)`;
      case 'error': return `Printer Bridge - Error`;
    }
  }

  kill(): void {
    void this.tray?.kill(false);
  }
}
