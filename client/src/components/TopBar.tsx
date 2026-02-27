import { useStore } from '../store/useStore';
import type { ToolMode, FieldType } from '../types';

const FIELD_TYPES: FieldType[] = ['full-green', 'full-white', 'half-green', 'half-white'];

export function TopBar() {
  const { mode, setMode, showGrid, toggleGrid, fieldType, setFieldType, toggleConcept, showConcept, undo, redo, resetAll, saveUndo } = useStore();

  const cycleField = () => {
    const idx = FIELD_TYPES.indexOf(fieldType);
    setFieldType(FIELD_TYPES[(idx + 1) % FIELD_TYPES.length]);
  };

  const handleExport = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    const name = useStore.getState().concept.name || 'training';
    link.download = `${name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleExportPDF = async () => {
    try {
      const data = useStore.getState().getExportData();
      const resp = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${data.concept.name || 'training'}.pdf`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Fallback to PNG if server not available
      handleExport();
    }
  };

  const handleReset = () => {
    if (confirm('Alles zurücksetzen?')) {
      saveUndo();
      resetAll();
    }
  };

  const modeBtn = (m: ToolMode, label: string) => (
    <button
      className={`topbar-btn ${mode === m ? 'active' : ''}`}
      onClick={() => setMode(m)}
    >{label}</button>
  );

  return (
    <div className="topbar">
      <h1>⚽ Trainingsplaner</h1>
      <div className="topbar-divider" />
      <div className="topbar-group">
        <button className="topbar-btn" onClick={undo} title="Rückgängig (Ctrl+Z)">↩</button>
        <button className="topbar-btn" onClick={redo} title="Wiederholen (Ctrl+Y)">↪</button>
      </div>
      <div className="topbar-divider" />
      <div className="topbar-group">
        {modeBtn('select', '🖱️ Auswahl')}
        {modeBtn('arrow', '→ Pfeil')}
        {modeBtn('dashed', '┅ Laufweg')}
        {modeBtn('zone', '▭ Zone')}
      </div>
      <div className="topbar-divider" />
      <div className="topbar-group">
        <button className="topbar-btn" onClick={cycleField}>🏟️ Spielfeld</button>
        <button className={`topbar-btn ${showGrid ? 'active' : ''}`} onClick={toggleGrid}>⊞ Raster</button>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-group">
        <button className={`topbar-btn ${showConcept ? 'active' : ''}`} onClick={toggleConcept}>📋 Konzeption</button>
        <button className="topbar-btn" onClick={handleExport}>🖼️ PNG</button>
        <button className="topbar-btn" onClick={handleExportPDF}>📄 PDF</button>
        <button className="topbar-btn" onClick={handleReset}>🗑️ Reset</button>
      </div>
    </div>
  );
}
