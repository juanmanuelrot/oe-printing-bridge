import { ConfigManager } from './config/config-manager.js';
import { PrintQueue } from './print/print-queue.js';
import { PrinterWatcher } from './printers/watcher.js';
import { createServer } from './server.js';
import { BridgeTray } from './tray.js';

const PORT = parseInt(process.env.BRIDGE_PORT ?? '9120', 10);
const ENABLE_TRAY = process.env.NO_TRAY !== '1';

async function main(): Promise<void> {
  console.log('Starting Printer Bridge...');

  // Initialize config
  const configManager = await ConfigManager.create();
  const settings = configManager.getSettings();

  // Initialize print queue
  const printQueue = new PrintQueue(
    configManager,
    settings.maxJobHistory,
    settings.jobRetryAttempts,
    settings.jobRetryDelayMs,
  );

  // Initialize printer watcher
  const printerWatcher = new PrinterWatcher(configManager);

  // Create HTTP + WS server
  const server = await createServer({ configManager, printQueue, printerWatcher });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    printerWatcher.stop();
    await configManager.destroy();
    await server.close();
    process.exit(0);
  };

  // Start system tray (optional, can be disabled for headless dev)
  let tray: BridgeTray | null = null;
  if (ENABLE_TRAY) {
    try {
      tray = new BridgeTray(PORT, printerWatcher, configManager, () => {
        void shutdown();
      });
      tray.start();
    } catch (err) {
      console.warn('System tray not available, running headless:', err);
    }
  }

  // Start server
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Printer Bridge listening on http://localhost:${PORT}`);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Is another instance running?`);
      if (tray) {
        tray.setStatus('error');
        // Give a moment for the tray to show before exiting
        await new Promise((r) => setTimeout(r, 3000));
        tray.kill();
      }
      process.exit(1);
    }
    throw err;
  }

  // Start printer watcher after server is ready
  printerWatcher.start();

  // Update tray status based on configured printers
  if (tray) {
    const printers = configManager.getPrinters();
    if (printers.length === 0) {
      tray.setStatus('warning');
    }
  }

  // Handle process signals
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    if (tray) tray.setStatus('error');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
