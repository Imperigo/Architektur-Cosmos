import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@kosmo/ui/aura.css';
import './zod-jitless'; // muss vor ./App bleiben — siehe Kommentar dort (CSP/Zod-eval-Probe)
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
