import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BridgeProvider } from '@ordereat-uy/printer-bridge-react';
import { App } from './App.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BridgeProvider url="http://localhost:9120">
      <App />
    </BridgeProvider>
  </StrictMode>,
);
