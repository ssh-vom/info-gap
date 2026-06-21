import { useEffect, useRef, useState } from 'react';
import { Excalidraw, exportToSvg, serializeAsJSON } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

// React island bridged to the vanilla editor by window CustomEvents:
//   editor dispatches 'diagram:open'  -> this opens
//   this dispatches  'diagram:insert' -> editor inserts ![](/api/diagrams/<id>.svg)
export default function DiagramModal() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('diagram:open', onOpen);
    return () => window.removeEventListener('diagram:open', onOpen);
  }, []);

  async function insert() {
    const api = apiRef.current;
    if (!api) return;
    setSaving(true);
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();

      const svgEl = await exportToSvg({ elements, appState, files, exportPadding: 16 });
      const svg = new XMLSerializer().serializeToString(svgEl);
      const scene = serializeAsJSON(elements, appState, files, 'local');

      const res = await fetch('/api/diagrams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ svg, scene }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        alert(`Diagram save failed: ${error}`);
        return;
      }
      const { id } = await res.json();
      window.dispatchEvent(new CustomEvent('diagram:insert', { detail: { id } }));
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #ddd', gap: 12 }}>
        <strong style={{ fontSize: 14, color: '#111' }}>Draw a diagram</strong>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => setOpen(false)} style={btn('#eee', '#333')}>Cancel</button>
          <button type="button" onClick={insert} disabled={saving} style={btn('#7a1f2b', '#fff')}>
            {saving ? 'Saving…' : 'Insert'}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Excalidraw excalidrawAPI={(api: any) => (apiRef.current = api)} />
      </div>
    </div>
  );
}

const btn = (bg: string, fg: string): React.CSSProperties => ({
  background: bg,
  color: fg,
  border: 'none',
  borderRadius: 8,
  padding: '6px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
});
