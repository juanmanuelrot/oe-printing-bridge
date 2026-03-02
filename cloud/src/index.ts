import { createServer } from './server.js';
import { env } from './env.js';

const JOB_SWEEP_INTERVAL_MS = 30_000;

async function main(): Promise<void> {
  console.log('Starting Printing Cloud...');

  const { app, jobRouter } = await createServer();

  // Periodic job sweep: retry pending jobs for online bridges
  const sweepTimer = setInterval(() => {
    void jobRouter.sweepPendingJobs();
  }, JOB_SWEEP_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    clearInterval(sweepTimer);
    await app.close();
    process.exit(0);
  };

  await app.listen({ port: env.port, host: '0.0.0.0' });
  console.log(`Printing Cloud listening on http://localhost:${env.port}`);

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
