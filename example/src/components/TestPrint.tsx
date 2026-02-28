import { useState } from 'react';
import { usePrint, usePrinters, useBridge } from '@ordereat-uy/printer-bridge-react';
import { buildTestReceipt } from '../utils/test-receipt.js';

export function TestPrint() {
  const { isReady } = useBridge();
  const { configured } = usePrinters();
  const { print, lastJob, isLoading, error } = usePrint();
  const [selectedPrinter, setSelectedPrinter] = useState('');

  const handlePrint = async () => {
    if (!selectedPrinter) return;
    const receiptBytes = buildTestReceipt();
    await print(selectedPrinter, receiptBytes);
  };

  const enabledPrinters = configured.filter((p) => p.enabled);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={{ fontSize: 14, fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span>Printer</span>
        <select
          value={selectedPrinter}
          onChange={(e) => setSelectedPrinter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <option value="">Select a configured printer...</option>
          {enabledPrinters.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.id}) — {p.status ?? 'unknown'}
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={() => void handlePrint()}
        disabled={!selectedPrinter || !isReady || isLoading}
        style={{
          padding: '10px 20px',
          border: 'none',
          borderRadius: 6,
          background: !selectedPrinter || !isReady ? '#ccc' : '#22c55e',
          color: '#fff',
          cursor: !selectedPrinter || !isReady ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: 15,
        }}
      >
        {isLoading ? 'Printing...' : 'Send Test Receipt'}
      </button>

      {!isReady && (
        <p style={{ color: '#f59e0b', fontSize: 14 }}>
          Bridge is not connected. Make sure the bridge is running on localhost:9120.
        </p>
      )}

      {enabledPrinters.length === 0 && (
        <p style={{ color: '#666', fontSize: 14 }}>
          No configured printers. Go to the Printers tab to set one up.
        </p>
      )}

      {lastJob && (
        <div style={{
          padding: 12,
          borderRadius: 6,
          background: lastJob.status === 'completed' ? '#f0fdf4'
            : lastJob.status === 'failed' ? '#fef2f2'
            : '#f0f9ff',
          fontSize: 14,
        }}>
          <strong>Last Job:</strong> {lastJob.id}
          <br />
          <strong>Status:</strong>{' '}
          <span style={{
            color: lastJob.status === 'completed' ? '#166534'
              : lastJob.status === 'failed' ? '#991b1b'
              : '#0369a1',
          }}>
            {lastJob.status}
          </span>
          {lastJob.error && (
            <>
              <br />
              <strong>Error:</strong> <span style={{ color: '#991b1b' }}>{lastJob.error}</span>
            </>
          )}
        </div>
      )}

      {error && !lastJob?.error && (
        <p style={{ color: '#ef4444', fontSize: 14 }}>Error: {error}</p>
      )}
    </div>
  );
}
