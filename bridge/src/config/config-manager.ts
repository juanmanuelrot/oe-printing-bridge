import fs from 'node:fs/promises';
import path from 'node:path';
import envPaths from 'env-paths';
import type { BridgeConfig, PrinterConfig } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';

const paths = envPaths('printer-bridge', { suffix: '' });

export class ConfigManager {
  private config: BridgeConfig;
  private configPath: string;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor(config: BridgeConfig, configPath: string) {
    this.config = config;
    this.configPath = configPath;
  }

  static async create(configDir?: string): Promise<ConfigManager> {
    const dir = configDir ?? paths.config;
    const configPath = path.join(dir, 'config.json');

    await fs.mkdir(dir, { recursive: true });

    let config: BridgeConfig;
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(raw) as BridgeConfig;
    } catch {
      config = structuredClone(DEFAULT_CONFIG);
    }

    return new ConfigManager(config, configPath);
  }

  getPrinters(): PrinterConfig[] {
    return this.config.printers;
  }

  getPrinter(id: string): PrinterConfig | undefined {
    return this.config.printers.find((p) => p.id === id);
  }

  getSettings(): BridgeConfig['settings'] {
    return this.config.settings;
  }

  addPrinter(printer: PrinterConfig): PrinterConfig {
    const existing = this.config.printers.findIndex((p) => p.id === printer.id);
    if (existing >= 0) {
      this.config.printers[existing] = printer;
    } else {
      this.config.printers.push(printer);
    }
    this.scheduleSave();
    return printer;
  }

  updatePrinter(id: string, updates: Partial<Omit<PrinterConfig, 'id'>>): PrinterConfig | undefined {
    const printer = this.config.printers.find((p) => p.id === id);
    if (!printer) return undefined;
    Object.assign(printer, updates);
    this.scheduleSave();
    return printer;
  }

  removePrinter(id: string): boolean {
    const index = this.config.printers.findIndex((p) => p.id === id);
    if (index < 0) return false;
    this.config.printers.splice(index, 1);
    this.scheduleSave();
    return true;
  }

  private scheduleSave(): void {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      void this.saveToDisk();
    }, 300);
  }

  async saveToDisk(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    const tmpPath = this.configPath + '.tmp';
    const data = JSON.stringify(this.config, null, 2);
    await fs.writeFile(tmpPath, data, 'utf-8');
    await fs.rename(tmpPath, this.configPath);
  }

  async destroy(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
      await this.saveToDisk();
    }
  }
}
