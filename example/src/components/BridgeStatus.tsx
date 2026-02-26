import { useBridge } from '@printer-bridge/react';

export function BridgeStatus() {
  const { status, isReady } = useBridge();

  const color = isReady ? '#22c55e' : status === 'connecting' ? '#f59e0b' : '#ef4444';
  const label = isReady ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      <span style={{ fontSize: 14, color: '#666' }}>
        Bridge: <strong>{label}</strong>
      </span>
    </div>
  );
}
