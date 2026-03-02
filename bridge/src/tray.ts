import { createRequire } from 'node:module';
import type { PrinterWatcher } from './printers/watcher.js';
import type { ConfigManager } from './config/config-manager.js';
import type { ClickEvent, Conf, Menu, MenuItem, Action } from 'systray2';
import { openLogFile } from './logger.js';

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

// Proper 16x16 32-bit ICO files (solid colour, fully opaque)
const ICON_GREEN = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABexSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/XsUi/17FIv9exSL/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
const ICON_YELLOW = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIs+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/CLPq/wiz6v8Is+r/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
const ICON_RED = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//RETv/0RE7/9ERO//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

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
    private logPath: string,
    private onQuit: () => void,
  ) {
    this.port = port;
  }

  async start(): Promise<void> {
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
            title: 'Open Log',
            tooltip: this.logPath,
            enabled: true,
          },
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

    // Wait for the native tray binary to spawn before interacting
    await this.tray.ready();

    await this.tray.onClick((action: ClickEvent) => {
      if (action.item.title === 'Quit') {
        this.onQuit();
      } else if (action.item.title === 'Open Log') {
        openLogFile(this.logPath);
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
