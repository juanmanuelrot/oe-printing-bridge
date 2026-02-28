import { useState, useEffect, useCallback } from 'react';
import { useBridgeContext } from '../context.js';
import type { PrintJob, PrintResponse, WsEvent } from '@ordereat-uy/printer-bridge-client';

export interface UsePrintReturn {
  print: (printerKey: string, data: Uint8Array | ArrayBuffer) => Promise<PrintResponse>;
  lastJob: PrintJob | null;
  jobs: PrintJob[];
  isLoading: boolean;
  error: string | null;
}

export function usePrint(): UsePrintReturn {
  const { client, subscribe } = useBridgeContext();
  const [lastJob, setLastJob] = useState<PrintJob | null>(null);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for job events
  useEffect(() => {
    const unsubscribe = subscribe((event: WsEvent) => {
      switch (event.type) {
        case 'job:queued':
          setJobs((prev) => [event.job, ...prev].slice(0, 20));
          setLastJob(event.job);
          break;
        case 'job:started':
          setJobs((prev) =>
            prev.map((j) =>
              j.id === event.jobId ? { ...j, status: 'printing' as const } : j,
            ),
          );
          setLastJob((prev) =>
            prev?.id === event.jobId ? { ...prev, status: 'printing' } : prev,
          );
          break;
        case 'job:completed':
          setJobs((prev) =>
            prev.map((j) =>
              j.id === event.jobId
                ? { ...j, status: 'completed' as const, completedAt: new Date().toISOString() }
                : j,
            ),
          );
          setLastJob((prev) =>
            prev?.id === event.jobId
              ? { ...prev, status: 'completed', completedAt: new Date().toISOString() }
              : prev,
          );
          setIsLoading(false);
          break;
        case 'job:failed':
          setJobs((prev) =>
            prev.map((j) =>
              j.id === event.jobId
                ? { ...j, status: 'failed' as const, error: event.error, completedAt: new Date().toISOString() }
                : j,
            ),
          );
          setLastJob((prev) =>
            prev?.id === event.jobId
              ? { ...prev, status: 'failed', error: event.error, completedAt: new Date().toISOString() }
              : prev,
          );
          setError(event.error);
          setIsLoading(false);
          break;
      }
    });
    return unsubscribe;
  }, [subscribe]);

  const print = useCallback(
    async (printerKey: string, data: Uint8Array | ArrayBuffer) => {
      setIsLoading(true);
      setError(null);
      try {
        return await client.print(printerKey, data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [client],
  );

  return {
    print,
    lastJob,
    jobs,
    isLoading,
    error,
  };
}
