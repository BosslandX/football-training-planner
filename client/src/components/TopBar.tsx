import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { ToolMode, FieldType } from '../types';
import { encodeGif } from '../utils/gifEncoder';

const FIELD_TYPES: FieldType[] = ['full-green', 'full-white', 'half-green', 'half-white'];

export function TopBar() {
  const { mode, setMode, showGrid, toggleGrid, fieldType, setFieldType, toggleConcept, showConcept, undo, redo, resetAll, saveUndo, playerStyle, togglePlayerStyle, playerScale, setPlayerScale, zoom, setZoom, mobileDrawer, setMobileDrawer, placementType, setConceptTab } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  // Close overflow when drawer state changes
  useEffect(() => { setOverflowOpen(false); }, [mobileDrawer]);

  // Close overflow on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (!overflowRef.current?.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

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
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const state = useStore.getState();
    const { animDuration } = state;
    const fps = 10;
    const totalFrames = Math.ceil(animDuration * fps);
    const w = canvas.width;
    const h = canvas.height;

    // Step through animation and capture frames
    const frames: ImageData[] = [];
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let i = 0; i <= totalFrames; i++) {
      const t = (i / totalFrames) * animDuration;
      state.setAnimTime(t);
      state.interpolateElements(t);
      // Force synchronous render by triggering store update
      await new Promise(r => requestAnimationFrame(() => { requestAnimationFrame(r); }));
      frames.push(ctx.getImageData(0, 0, w, h));
    }

    // Reset animation
    state.setAnimTime(0);
    state.interpolateElements(0);

    // Encode GIF client-side
    const gifBytes = encodeGif(w, h, frames, Math.round(1000 / fps));
    const blob = new Blob([gifBytes.buffer as ArrayBuffer], { type: 'image/gif' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${state.concept.name || 'training'}.gif`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
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

  const modeBtn = (m: ToolMode, label: string) => {
    const isActive = m === 'select'
      ? mode === 'select' && !placementType
      : mode === m;
    return (
      <button
        className={`topbar-btn ${isActive ? 'active' : ''}`}
        onClick={() => setMode(m)}
      >{label}</button>
    );
  };

  return (
    <div className="topbar">
      {/* Mobile: hamburger button */}
      <button
        className="topbar-btn mobile-only"
        onClick={() => setMobileDrawer(mobileDrawer === 'sidebar' ? null : 'sidebar')}
        title="Sidebar"
      >☰</button>

      <h1>⚽ Trainingsplaner</h1>
      <div className="topbar-divider desktop-only" />
      <div className="topbar-group desktop-only">
        <button className="topbar-btn" onClick={undo} title="Rückgängig (Ctrl+Z)">↩</button>
        <button className="topbar-btn" onClick={redo} title="Wiederholen (Ctrl+Y)">↪</button>
      </div>
      <div className="topbar-divider desktop-only" />
      <div className="topbar-group desktop-only">
        {modeBtn('select', '🖱️ Auswahl')}
        {modeBtn('arrow', '→ Schuss/Pass')}
        {modeBtn('dashed', '┅ Laufweg')}
        {modeBtn('curved', '↝ Dribbling')}
        {modeBtn('zone', '▭ Zone')}
      </div>
      <div className="topbar-divider desktop-only" />
      <div className="topbar-group desktop-only">
        <button className="topbar-btn" onClick={cycleField}>🏟️ Spielfeld</button>
        <button className={`topbar-btn ${showGrid ? 'active' : ''}`} onClick={toggleGrid}>⊞ Raster</button>
        <button className={`topbar-btn ${playerStyle === 'figure' ? 'active' : ''}`} onClick={togglePlayerStyle}>
          {playerStyle === 'figure' ? '👤 Figuren' : '⚪ Kreise'}
        </button>
        <button className={`topbar-btn ${playerScale === 1 ? 'active' : ''}`} onClick={() => setPlayerScale(1)} title="Spieler 100%">S</button>
        <button className={`topbar-btn ${playerScale === 2 ? 'active' : ''}`} onClick={() => setPlayerScale(2)} title="Spieler 125%">M</button>
        <button className={`topbar-btn ${playerScale === 3 ? 'active' : ''}`} onClick={() => setPlayerScale(3)} title="Spieler 150%">L</button>
      </div>
      <div className="topbar-divider desktop-only" />
      <div className="topbar-group desktop-only">
        <button className="topbar-btn" onClick={() => setZoom(zoom - 0.25)} disabled={zoom <= 0.5}>-</button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="topbar-btn" onClick={() => setZoom(zoom + 0.25)} disabled={zoom >= 2.0}>+</button>
      </div>
      <div className="topbar-spacer desktop-only" />
      <div className="topbar-group desktop-only">
        <button className={`topbar-btn ${showConcept ? 'active' : ''}`} onClick={() => { setConceptTab('properties'); toggleConcept(); }}>📋 Konzeption</button>
        <button className="topbar-btn" onClick={handleExport}>🖼️ PNG</button>
        <button className="topbar-btn" onClick={handleExportPDF}>📄 PDF</button>
        <button className="topbar-btn" onClick={handleExportGIF}>🎬 GIF</button>
        <button className="topbar-btn" onClick={handleExportVideo}>🎥 Video</button>
        <button className="topbar-btn" onClick={handleReset}>🗑️ Reset</button>
      </div>

      {/* Mobile: spacer + concept + overflow */}
      <div className="topbar-spacer mobile-only" />
      <button
        className={`topbar-btn mobile-only ${mobileDrawer === 'concept' ? 'active' : ''}`}
        onClick={() => setMobileDrawer(mobileDrawer === 'concept' ? null : 'concept')}
        title="Konzeption"
      >📋</button>

      <div className="mobile-overflow-wrapper mobile-only" ref={overflowRef}>
        <button
          className="topbar-btn"
          onClick={() => setOverflowOpen(!overflowOpen)}
          title="Mehr"
        >⋮</button>
        {overflowOpen && (
          <div className="mobile-overflow-menu" onClick={() => setOverflowOpen(false)}>
            <button onClick={undo}>↩ Rückgängig</button>
            <button onClick={redo}>↪ Wiederholen</button>
            <div className="overflow-separator" />
            <button onClick={cycleField}>🏟️ Spielfeld</button>
            <button onClick={toggleGrid}>{showGrid ? '⊞ Raster aus' : '⊞ Raster an'}</button>
            <button onClick={togglePlayerStyle}>{playerStyle === 'figure' ? '⚪ Kreise' : '👤 Figuren'}</button>
            <div className="overflow-separator" />
            <button onClick={() => setZoom(zoom - 0.25)} disabled={zoom <= 0.5}>- Zoom</button>
            <span className="overflow-zoom">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(zoom + 0.25)} disabled={zoom >= 2.0}>+ Zoom</button>
            <div className="overflow-separator" />
            <button onClick={handleExport}>🖼️ PNG</button>
            <button onClick={handleExportPDF}>📄 PDF</button>
            <button onClick={handleExportGIF}>🎬 GIF</button>
            <button onClick={handleExportVideo}>🎥 Video</button>
            <div className="overflow-separator" />
            <button onClick={handleReset}>🗑️ Reset</button>
          </div>
        )}
      </div>
    </div>
  );
}
