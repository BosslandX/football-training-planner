import { useRef, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { FieldType } from '../types';
import { encodeGif } from '../utils/gifEncoder';
import { t, useLocale } from '../i18n';

const FIELD_TYPES: FieldType[] = [
  'full-green', 'full-white', 'half-green', 'half-white',
  'full-green-land', 'full-white-land', 'half-green-land', 'half-white-land',
];


export function TopBar() {
  useLocale(s => s.locale);
  const { showGrid, toggleGrid, fieldType, setFieldType, toggleConcept, showConcept, undo, redo, resetAll, saveUndo, playerStyle, togglePlayerStyle, playerScale, setPlayerScale, zoom, setZoom, mobileDrawer, setMobileDrawer, setConceptTab } = useStore();
  const toggleLang = useLocale(s => s.toggleLocale);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

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
    if (hasContent && !confirm(t('topbar.confirmReplace'))) {
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
        alert(t('topbar.importFailed', { error: err.error || t('topbar.importFailedUnknown') }));
        return;
      }
      const data = await resp.json();
      useStore.getState().importTrainingPlan(data);
    } catch {
      alert(t('topbar.importFailedServer'));
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
    // Clear selection for clean export
    const prevSelectedId = useStore.getState().selectedId;
    useStore.setState({ selectedId: null });
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const link = document.createElement('a');
    const name = useStore.getState().concept.name || 'training';
    link.download = `${name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    useStore.setState({ selectedId: prevSelectedId });
  };

  const handleExportPDF = async () => {
    try {
      const exercises = useStore.getState().getAllExportData();
      const resp = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercises }),
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const firstName = exercises[0]?.concept.name || 'training';
        link.download = `${firstName}.pdf`;
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
    if (exportStatus) return; // Already exporting
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const state = useStore.getState();
    const { animDuration } = state;
    const fps = 15;
    const totalFrames = Math.ceil(animDuration * fps);
    const w = canvas.width;
    const h = canvas.height;

    const frames: ImageData[] = [];
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setExportStatus(t('topbar.capturingFrames'));

    // Save state and clear selection/keyframe markers for clean export
    const prevSelectedId = state.selectedId;
    const prevAnimPlaying = state.animPlaying;
    useStore.setState({ selectedId: null, animPlaying: true });

    // Wait for clean render without selection artifacts
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    for (let i = 0; i <= totalFrames; i++) {
      const time = (i / totalFrames) * animDuration;
      useStore.getState().setAnimTime(time);
      useStore.getState().interpolateElements(time);
      // Wait for React re-render + canvas paint
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      frames.push(ctx.getImageData(0, 0, w, h));
      setExportStatus(t('topbar.capturingFramesProgress', { current: i + 1, total: totalFrames + 1 }));
    }

    // Restore state
    useStore.setState({
      animTime: 0,
      animPlaying: prevAnimPlaying,
      selectedId: prevSelectedId,
    });
    useStore.getState().interpolateElements(0);

    setExportStatus(t('topbar.encodingGif'));
    // Yield to UI so the status text renders before heavy computation
    await new Promise<void>(r => setTimeout(r, 50));

    const gifBytes = encodeGif(w, h, frames, Math.round(1000 / fps));
    const blob = new Blob([gifBytes.buffer as ArrayBuffer], { type: 'image/gif' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${state.concept.name || 'training'}.gif`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setExportStatus(null);
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
    if (confirm(t('topbar.confirmReset'))) {
      saveUndo();
      resetAll();
    }
  };

  return (
    <div className="topbar">
      {exportStatus && <div className="export-overlay">{exportStatus}</div>}
      {/* Mobile: hamburger button */}
      <button
        className="topbar-btn mobile-only"
        onClick={() => setMobileDrawer(mobileDrawer === 'sidebar' ? null : 'sidebar')}
        title={t('topbar.sidebar')}
      >☰</button>

      <h1>⚽ {t('app.title')}</h1>
      <div className="topbar-divider desktop-only" />
      <div className="topbar-group desktop-only">
        <button className="topbar-btn" onClick={undo} title={t('topbar.undo')}>↩</button>
        <button className="topbar-btn" onClick={redo} title={t('topbar.redo')}>↪</button>
      </div>
      <div className="topbar-divider desktop-only" />
      <div className="topbar-group desktop-only">
        <button className="topbar-btn" onClick={cycleField}>🏟️ {t('topbar.field')}</button>
        <button className={`topbar-btn ${showGrid ? 'active' : ''}`} onClick={toggleGrid}>⊞ {t('topbar.grid')}</button>
        <button className={`topbar-btn ${playerStyle === 'figure' ? 'active' : ''}`} onClick={togglePlayerStyle}>
          {playerStyle === 'figure' ? `👤 ${t('topbar.figures')}` : `⚪ ${t('topbar.circles')}`}
        </button>
        <button className={`topbar-btn ${playerScale === 1 ? 'active' : ''}`} onClick={() => setPlayerScale(1)} title={t('topbar.playerSize100')}>S</button>
        <button className={`topbar-btn ${playerScale === 2 ? 'active' : ''}`} onClick={() => setPlayerScale(2)} title={t('topbar.playerSize125')}>M</button>
        <button className={`topbar-btn ${playerScale === 3 ? 'active' : ''}`} onClick={() => setPlayerScale(3)} title={t('topbar.playerSize150')}>L</button>
      </div>
      <div className="topbar-divider desktop-only" />
      <div className="topbar-group desktop-only">
        <button className="topbar-btn" onClick={() => setZoom(zoom - 0.25)} disabled={zoom <= 0.5}>-</button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="topbar-btn" onClick={() => setZoom(zoom + 0.25)} disabled={zoom >= 2.0}>+</button>
      </div>
      <div className="topbar-spacer desktop-only" />
      <div className="topbar-group desktop-only">
        <button className={`topbar-btn ${showConcept ? 'active' : ''}`} onClick={() => { setConceptTab('properties'); toggleConcept(); }}>📋 {t('topbar.concept')}</button>
        <a className="topbar-btn" href="/docs/quickstart.html" target="_blank" rel="noopener">📖 {t('topbar.quickstart')}</a>
        <a className="topbar-btn" href="/docs/guide.html" target="_blank" rel="noopener">📚 {t('topbar.guide')}</a>
        <button className="topbar-btn" onClick={handleExport}>🖼️ PNG</button>
        <button className="topbar-btn" onClick={handleExportPDF}>📄 PDF</button>
        <button className="topbar-btn" onClick={handleExportGIF}>🎬 GIF</button>
        <button className="topbar-btn" onClick={handleExportVideo}>🎥 Video</button>
        <button className="topbar-btn" onClick={handleReset}>🗑️ {t('topbar.reset')}</button>
        <button className="topbar-btn" onClick={toggleLang}>🌐 {t('topbar.langSwitch')}</button>
      </div>

      {/* Mobile: spacer + concept + overflow */}
      <div className="topbar-spacer mobile-only" />
      <button
        className={`topbar-btn mobile-only ${mobileDrawer === 'concept' ? 'active' : ''}`}
        onClick={() => setMobileDrawer(mobileDrawer === 'concept' ? null : 'concept')}
        title={t('topbar.concept')}
      >📋</button>

      <div className="mobile-overflow-wrapper mobile-only" ref={overflowRef}>
        <button
          className="topbar-btn"
          onClick={() => setOverflowOpen(!overflowOpen)}
          title={t('topbar.more')}
        >⋮</button>
        {overflowOpen && (
          <div className="mobile-overflow-menu" onClick={() => setOverflowOpen(false)}>
            <button onClick={undo}>↩ {t('topbar.undo')}</button>
            <button onClick={redo}>↪ {t('topbar.redo')}</button>
            <div className="overflow-separator" />
            <button onClick={cycleField}>🏟️ {t('topbar.field')}</button>
            <button onClick={toggleGrid}>{showGrid ? `⊞ ${t('topbar.gridOff')}` : `⊞ ${t('topbar.gridOn')}`}</button>
            <button onClick={togglePlayerStyle}>{playerStyle === 'figure' ? `⚪ ${t('topbar.circles')}` : `👤 ${t('topbar.figures')}`}</button>
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
            <button onClick={handleReset}>🗑️ {t('topbar.reset')}</button>
            <button onClick={toggleLang}>🌐 {t('topbar.langSwitch')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
