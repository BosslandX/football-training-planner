import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { SessionBrowser } from './SessionBrowser';
import type { ToolMode, FieldType } from '../types';

const FIELD_TYPES: FieldType[] = ['full-green', 'full-white', 'half-green', 'half-white'];

export function TopBar() {
  const { mode, setMode, showGrid, toggleGrid, fieldType, setFieldType, toggleConcept, showConcept, undo, redo, resetAll, saveUndo, playerStyle, togglePlayerStyle, zoom, setZoom } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSessionBrowser, setShowSessionBrowser] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Confirm if current exercise has elements
    const state = useStore.getState();
    const hasContent = state.elements.length > 0 || state.exercises.length > 1;
    if (hasContent && !confirm('Alle aktuellen Übungen werden ersetzt. Fortfahren?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch('/api/import/training-plan', {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) {
        const err = await resp.json();
        alert(`Import fehlgeschlagen: ${err.error || 'Unbekannter Fehler'}`);
        return;
      }
      const data = await resp.json();
      useStore.getState().importTrainingPlan(data);
    } catch {
      alert('Import fehlgeschlagen: Server nicht erreichbar');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const handleExportGIF = async () => {
    try {
      const state = useStore.getState();
      const data = state.getExportData();
      const resp = await fetch('/api/export/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, animDuration: state.animDuration, fps: 15 }),
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${data.concept.name || 'training'}.gif`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        alert('GIF-Export fehlgeschlagen');
      }
    } catch {
      alert('GIF-Export fehlgeschlagen: Server nicht erreichbar');
    }
  };

  const handleExportVideo = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const state = useStore.getState();
    const stream = canvas.captureStream(30);
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${state.concept.name || 'training'}.webm`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    };

    // Reset animation and start recording
    state.setAnimTime(0);
    state.interpolateElements(0);
    recorder.start();
    state.setAnimPlaying(true);

    // Watch for animation to stop
    const unsub = useStore.subscribe((s) => {
      if (!s.animPlaying) {
        recorder.stop();
        unsub();
      }
    });
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
        {modeBtn('arrow', '→ Schuss/Pass')}
        {modeBtn('dashed', '┅ Laufweg')}
        {modeBtn('curved', '↝ Dribbling')}
        {modeBtn('zone', '▭ Zone')}
      </div>
      <div className="topbar-divider" />
      <div className="topbar-group">
        <button className="topbar-btn" onClick={cycleField}>🏟️ Spielfeld</button>
        <button className={`topbar-btn ${showGrid ? 'active' : ''}`} onClick={toggleGrid}>⊞ Raster</button>
        <button className={`topbar-btn ${playerStyle === 'figure' ? 'active' : ''}`} onClick={togglePlayerStyle}>
          {playerStyle === 'figure' ? '👤 Figuren' : '⚪ Kreise'}
        </button>
      </div>
      <div className="topbar-divider" />
      <div className="topbar-group">
        <button className="topbar-btn" onClick={() => setZoom(zoom - 0.25)} disabled={zoom <= 0.5}>-</button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="topbar-btn" onClick={() => setZoom(zoom + 0.25)} disabled={zoom >= 2.0}>+</button>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-group">
        <button className="topbar-btn" onClick={() => setShowSessionBrowser(true)}>📂 Sessions</button>
        <button className={`topbar-btn ${showConcept ? 'active' : ''}`} onClick={toggleConcept}>📋 Konzeption</button>
        <button className="topbar-btn" onClick={handleExport}>🖼️ PNG</button>
        <button className="topbar-btn" onClick={handleExportPDF}>📄 PDF</button>
        <button className="topbar-btn" onClick={handleExportGIF}>🎬 GIF</button>
        <button className="topbar-btn" onClick={handleExportVideo}>🎥 Video</button>
        <button className="topbar-btn" onClick={handleReset}>🗑️ Reset</button>
      </div>
      {showSessionBrowser && <SessionBrowser onClose={() => setShowSessionBrowser(false)} />}
    </div>
  );
}
