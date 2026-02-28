import { usePrinters } from '@ordereat-uy/printer-bridge-react';

const statusColors: Record<string, string> = {
  idle: '#22c55e',
  printing: '#3b82f6',
  error: '#ef4444',
  offline: '#9ca3af',
  missing: '#f59e0b',
  unknown: '#9ca3af',
};

export function PrinterList() {
  const { available, configured, isLoading, error, refresh, removePrinter } = usePrinters();

  if (isLoading && available.length === 0) {
    return <p style={{ color: '#666' }}>Loading printers...</p>;
  }

  if (error) {
    return <p style={{ color: '#ef4444' }}>Error: {error}</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Discovered ({available.length})</h3>
        <button onClick={() => void refresh()} style={smallBtnStyle}>
          Refresh
        </button>
      </div>

      {available.length === 0 ? (
        <p style={{ color: '#666', fontSize: 14 }}>No printers found. Make sure printers are installed in Windows.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={thStyle}>Printer Name</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Configured As</th>
            </tr>
          </thead>
          <tbody>
            {available.map((p) => (
              <tr key={p.name} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={tdStyle}>
                  {p.name} {p.isDefault && <span style={{ color: '#666', fontSize: 12 }}>(default)</span>}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    color: statusColors[p.status] ?? '#999',
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: statusColors[p.status] ?? '#999',
                    }} />
                    {p.status}
                  </span>
                </td>
                <td style={tdStyle}>
                  {p.configured ? (
                    <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>
                      {p.configuredAs}
                    </code>
                  ) : (
                    <span style={{ color: '#999' }}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {configured.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 20, marginBottom: 8 }}>
            Configured ({configured.length})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={thStyle}>Key</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Windows Printer</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {configured.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={tdStyle}>
                    <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>{p.id}</code>
                  </td>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>{p.address}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      color: statusColors[p.status ?? 'unknown'] ?? '#999',
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: statusColors[p.status ?? 'unknown'] ?? '#999',
                      }} />
                      {p.status ?? 'unknown'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => void removePrinter(p.id)}
                      style={{ ...smallBtnStyle, color: '#ef4444', background: '#fef2f2' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '8px 8px 8px 0', fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '8px 8px 8px 0' };
const smallBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #ddd',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};
