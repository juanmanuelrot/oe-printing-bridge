import { useState } from 'react';
import { usePrinters } from '@ordereat-uy/printer-bridge-react';

export function PrinterSetup() {
  const { available, addPrinter } = usePrinters();
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [printerId, setPrinterId] = useState('');
  const [printerName, setPrinterName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const unconfigured = available.filter((p) => !p.configured);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrinter || !printerId) return;

    setSaving(true);
    setMessage(null);

    try {
      await addPrinter({
        id: printerId.trim().toLowerCase().replace(/\s+/g, '-'),
        name: printerName.trim() || selectedPrinter,
        address: selectedPrinter,
        enabled: true,
      });
      setMessage({ type: 'success', text: `Printer "${printerId}" configured successfully!` });
      setSelectedPrinter('');
      setPrinterId('');
      setPrinterName('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to configure printer',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={labelStyle}>
        <span>Windows Printer</span>
        <select
          value={selectedPrinter}
          onChange={(e) => setSelectedPrinter(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select a printer...</option>
          {unconfigured.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} ({p.status})
            </option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        <span>Printer Key <span style={{ color: '#999', fontWeight: 400 }}>(used in code: print("receipt", ...))</span></span>
        <input
          type="text"
          value={printerId}
          onChange={(e) => setPrinterId(e.target.value)}
          placeholder='e.g. "receipt", "kitchen", "bar"'
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        <span>Display Name <span style={{ color: '#999', fontWeight: 400 }}>(optional)</span></span>
        <input
          type="text"
          value={printerName}
          onChange={(e) => setPrinterName(e.target.value)}
          placeholder="e.g. Front Counter Printer"
          style={inputStyle}
        />
      </label>

      <button
        type="submit"
        disabled={!selectedPrinter || !printerId || saving}
        style={{
          padding: '10px 20px',
          border: 'none',
          borderRadius: 6,
          background: !selectedPrinter || !printerId ? '#ccc' : '#0066cc',
          color: '#fff',
          cursor: !selectedPrinter || !printerId ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        {saving ? 'Saving...' : 'Configure Printer'}
      </button>

      {message && (
        <p style={{
          padding: '8px 12px',
          borderRadius: 6,
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          fontSize: 14,
        }}>
          {message.text}
        </p>
      )}
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 14,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 400,
};
