import { useState, useEffect, useCallback } from 'react';
import { useBridgeContext } from '../context.js';
export function usePrint() {
    const { client, subscribe } = useBridgeContext();
    const [lastJob, setLastJob] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // Listen for job events
    useEffect(() => {
        const unsubscribe = subscribe((event) => {
            switch (event.type) {
                case 'job:queued':
                    setJobs((prev) => [event.job, ...prev].slice(0, 20));
                    setLastJob(event.job);
                    break;
                case 'job:started':
                    setJobs((prev) => prev.map((j) => j.id === event.jobId ? { ...j, status: 'printing' } : j));
                    setLastJob((prev) => prev?.id === event.jobId ? { ...prev, status: 'printing' } : prev);
                    break;
                case 'job:completed':
                    setJobs((prev) => prev.map((j) => j.id === event.jobId
                        ? { ...j, status: 'completed', completedAt: new Date().toISOString() }
                        : j));
                    setLastJob((prev) => prev?.id === event.jobId
                        ? { ...prev, status: 'completed', completedAt: new Date().toISOString() }
                        : prev);
                    setIsLoading(false);
                    break;
                case 'job:failed':
                    setJobs((prev) => prev.map((j) => j.id === event.jobId
                        ? { ...j, status: 'failed', error: event.error, completedAt: new Date().toISOString() }
                        : j));
                    setLastJob((prev) => prev?.id === event.jobId
                        ? { ...prev, status: 'failed', error: event.error, completedAt: new Date().toISOString() }
                        : prev);
                    setError(event.error);
                    setIsLoading(false);
                    break;
            }
        });
        return unsubscribe;
    }, [subscribe]);
    const print = useCallback(async (printerKey, data) => {
        setIsLoading(true);
        setError(null);
        try {
            return await client.print(printerKey, data);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            setIsLoading(false);
            throw err;
        }
    }, [client]);
    return {
        print,
        lastJob,
        jobs,
        isLoading,
        error,
    };
}
//# sourceMappingURL=use-print.js.map