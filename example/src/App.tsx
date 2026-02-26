import { useState } from 'react';
import { BridgeStatus } from './components/BridgeStatus.js';
import { PrinterList } from './components/PrinterList.js';
import { PrinterSetup } from './components/PrinterSetup.js';
import { TestPrint } from './components/TestPrint.js';

type Tab = 'status' | 'printers' | 'print';

export function App() {
  const [tab, setTab] = useState<Tab>('status');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1 style={{ marginBottom: 8 }}>Printer Bridge</h1>
      <BridgeStatus />

      <nav style={{ display: 'flex', gap: 4, marginTop: 20, marginBottom: 20 }}>
        {(['status', 'printers', 'print'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: tab === t ? '#0066cc' : '#ddd',
              color: tab === t ? '#fff' : '#333',
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t === 'status' ? 'Status' : t === 'printers' ? 'Printers' : 'Test Print'}
          </button>
        ))}
      </nav>

      {tab === 'status' && (
        <div style={cardStyle}>
          <h2>Bridge Status</h2>
          <p style={{ color: '#666', marginTop: 8 }}>
            The bridge is a lightweight local service that forwards ESC/POS data to your printers.
            It should be running on <code>localhost:9120</code>.
          </p>
        </div>
      )}

      {tab === 'printers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle}>
            <h2>Available Printers</h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
              Windows-installed printers discovered by the bridge
            </p>
            <PrinterList />
          </div>
          <div style={cardStyle}>
            <h2>Configure Printer</h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
              Select an available printer and assign it a key for your POS app
            </p>
            <PrinterSetup />
          </div>
        </div>
      )}

      {tab === 'print' && (
        <div style={cardStyle}>
          <h2>Test Print</h2>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
            Send a test ESC/POS receipt to a configured printer
          </p>
          <TestPrint />
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};
