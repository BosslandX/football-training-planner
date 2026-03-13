import { useStore } from '../store/useStore';
import type { ToolMode } from '../types';
import { ELEMENT_TYPE_NAMES } from '../types';

const TOOLS: { mode: ToolMode; icon: string; label: string }[] = [
  { mode: 'select', icon: '🖱️', label: 'Auswahl' },
  { mode: 'arrow', icon: '→', label: 'Pass' },
  { mode: 'dashed', icon: '┅', label: 'Laufweg' },
  { mode: 'curved', icon: '↝', label: 'Dribbeln' },
  { mode: 'zone', icon: '▭', label: 'Zone' },
];

export function MobileNav() {
  const mode = useStore(s => s.mode);
  const setMode = useStore(s => s.setMode);
  const placementType = useStore(s => s.placementType);
  const setPlacementType = useStore(s => s.setPlacementType);
  const mobileDrawer = useStore(s => s.mobileDrawer);
  const setMobileDrawer = useStore(s => s.setMobileDrawer);
  const selectedId = useStore(s => s.selectedId);
  const elements = useStore(s => s.elements);
  const zoom = useStore(s => s.zoom);
  const setZoom = useStore(s => s.setZoom);
  const setConceptTab = useStore(s => s.setConceptTab);
  const mobileRecording = useStore(s => s.mobileRecording);
  const setMobileRecording = useStore(s => s.setMobileRecording);
  const animTime = useStore(s => s.animTime);
  const animDuration = useStore(s => s.animDuration);

  const selectedEl = elements.find(e => e.id === selectedId);

  const handleProperties = () => {
    setConceptTab('properties');
    setMobileDrawer('concept');
  };

  const handleDelete = () => {
    if (!selectedId) return;
    useStore.getState().saveUndo();
    useStore.getState().removeElement(selectedId);
  };

  const handleDuplicate = () => {
    if (!selectedId) return;
    useStore.getState().saveUndo();
    useStore.getState().duplicateElement(selectedId);
  };

  // Start recording: save current position as "A" with current timeline as start
  const handleStartMovement = () => {
    if (!selectedEl) return;
    setMobileRecording({
      elementId: selectedEl.id,
      startX: selectedEl.x,
      startY: selectedEl.y,
      startRotation: selectedEl.rotation,
      startTime: animTime,
      endTime: animDuration,
    });
  };

  // Finish recording: create keyframes at startTime (A) and endTime (B)
  const handleFinishMovement = () => {
    if (!mobileRecording) return;
    const s = useStore.getState();
    const el = s.elements.find(e => e.id === mobileRecording.elementId);
    if (!el) { setMobileRecording(null); return; }

    s.saveUndo();
    // Add keyframe A at startTime (original position)
    s.addKeyframe(el.id, {
      t: mobileRecording.startTime,
      x: mobileRecording.startX,
      y: mobileRecording.startY,
      rotation: mobileRecording.startRotation,
    });
    // Add keyframe B at endTime (current position)
    s.addKeyframe(el.id, {
      t: mobileRecording.endTime,
      x: el.x,
      y: el.y,
      rotation: el.rotation,
    });
    setMobileRecording(null);
  };

  const handleCancelMovement = () => {
    if (!mobileRecording) return;
    const s = useStore.getState();
    s.updateElement(mobileRecording.elementId, {
      x: mobileRecording.startX,
      y: mobileRecording.startY,
      rotation: mobileRecording.startRotation,
    });
    setMobileRecording(null);
  };

  const updateEndTime = (val: string) => {
    if (!mobileRecording) return;
    const t = parseFloat(val);
    if (!isNaN(t) && t > mobileRecording.startTime) {
      setMobileRecording({ ...mobileRecording, endTime: t });
    }
  };

  return (
    <>
      {/* Recording mode */}
      {mobileRecording && (
        <div className="mobile-selection-bar recording">
          <div className="selection-info">
            Ziehe das Element zur Zielposition
          </div>
          <div className="recording-times">
            <span>Von {mobileRecording.startTime.toFixed(1)}s</span>
            <span> bis </span>
            <input
              type="number"
              className="recording-time-input"
              value={mobileRecording.endTime}
              step={0.5}
              min={mobileRecording.startTime + 0.5}
              max={60}
              onChange={e => updateEndTime(e.target.value)}
            />
            <span>s</span>
          </div>
          <div className="selection-actions">
            <button className="selection-btn" onClick={handleCancelMovement}>
              <span>✕</span><span>Abbrechen</span>
            </button>
            <button className="selection-btn confirm" onClick={handleFinishMovement}>
              <span>✓</span><span>Fertig</span>
            </button>
          </div>
        </div>
      )}

      {/* Selection action bar */}
      {selectedEl && !mobileRecording && (
        <div className="mobile-selection-bar">
          <div className="selection-info">
            {ELEMENT_TYPE_NAMES[selectedEl.type] || selectedEl.type}
          </div>
          <div className="selection-actions">
            <button className="selection-btn" onClick={handleProperties} title="Eigenschaften">
              <span>⚙️</span><span>Eigensch.</span>
            </button>
            <button className="selection-btn" onClick={handleStartMovement} title="Bewegung aufnehmen">
              <span>🏃</span><span>Bewegung</span>
            </button>
            <button className="selection-btn" onClick={handleDuplicate} title="Duplizieren">
              <span>📋</span><span>Kopieren</span>
            </button>
            <button className="selection-btn danger" onClick={handleDelete} title="Löschen">
              <span>🗑️</span><span>Löschen</span>
            </button>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="mobile-zoom" style={(selectedEl || mobileRecording) ? { bottom: 126 } : undefined}>
        <button onClick={() => setZoom(zoom - 0.25)} disabled={zoom <= 0.5}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(zoom + 0.25)} disabled={zoom >= 2.0}>+</button>
      </div>

      {/* Bottom navigation */}
      <div className="bottom-nav">
        {TOOLS.map(t => {
          const isActive = t.mode === 'select'
            ? mode === 'select' && !placementType
            : mode === t.mode;
          return (
            <button
              key={t.mode}
              className={`bottom-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => {
                setMode(t.mode);
                if (t.mode !== 'select') setPlacementType(null);
                if (mobileDrawer) setMobileDrawer(null);
              }}
              title={t.label}
            >
              <span className="bottom-nav-icon">{t.icon}</span>
              <span className="bottom-nav-label">{t.label}</span>
            </button>
          );
        })}
        <button
          className={`bottom-nav-btn ${mobileDrawer === 'sidebar' ? 'active' : ''}`}
          onClick={() => setMobileDrawer(mobileDrawer === 'sidebar' ? null : 'sidebar')}
          title="Elemente"
        >
          <span className="bottom-nav-icon">📦</span>
          <span className="bottom-nav-label">Elemente</span>
        </button>
      </div>
    </>
  );
}
