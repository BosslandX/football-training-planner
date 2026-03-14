import { useStore } from '../store/useStore';
import type { ToolMode } from '../types';
import { getElementTypeName } from '../types';
import { t, useLocale } from '../i18n';

const TOOLS: { mode: ToolMode; icon: string; labelKey: string }[] = [
  { mode: 'select', icon: '🖱️', labelKey: 'mobile.select' },
  { mode: 'arrow', icon: '→', labelKey: 'mobile.pass' },
  { mode: 'dashed', icon: '┅', labelKey: 'mobile.runPath' },
  { mode: 'curved', icon: '↝', labelKey: 'mobile.dribble' },
  { mode: 'zone', icon: '▭', labelKey: 'mobile.zone' },
];

export function MobileNav() {
  useLocale(s => s.locale);
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
    const time = parseFloat(val);
    if (!isNaN(time) && time > mobileRecording.startTime) {
      setMobileRecording({ ...mobileRecording, endTime: time });
    }
  };

  return (
    <>
      {/* Recording mode */}
      {mobileRecording && (
        <div className="mobile-selection-bar recording">
          <div className="selection-info">
            {t('mobile.dragToTarget')}
          </div>
          <div className="recording-times">
            <span>{t('mobile.from', { time: mobileRecording.startTime.toFixed(1) })}</span>
            <span> {t('mobile.to')} </span>
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
              <span>✕</span><span>{t('mobile.cancel')}</span>
            </button>
            <button className="selection-btn confirm" onClick={handleFinishMovement}>
              <span>✓</span><span>{t('mobile.done')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Selection action bar */}
      {selectedEl && !mobileRecording && (
        <div className="mobile-selection-bar">
          <div className="selection-info">
            {getElementTypeName(selectedEl.type)}
          </div>
          <div className="selection-actions">
            <button className="selection-btn" onClick={handleProperties} title={t('mobile.propertiesTitle')}>
              <span>⚙️</span><span>{t('mobile.props')}</span>
            </button>
            <button className="selection-btn" onClick={handleStartMovement} title={t('mobile.recordMovement')}>
              <span>🏃</span><span>{t('mobile.movement')}</span>
            </button>
            <button className="selection-btn" onClick={handleDuplicate} title={t('mobile.duplicateTitle')}>
              <span>📋</span><span>{t('mobile.copy')}</span>
            </button>
            <button className="selection-btn danger" onClick={handleDelete} title={t('mobile.deleteTitle')}>
              <span>🗑️</span><span>{t('mobile.delete')}</span>
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
        {TOOLS.map(tool => {
          const isActive = tool.mode === 'select'
            ? mode === 'select' && !placementType
            : mode === tool.mode;
          return (
            <button
              key={tool.mode}
              className={`bottom-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => {
                setMode(tool.mode);
                if (tool.mode !== 'select') setPlacementType(null);
                if (mobileDrawer) setMobileDrawer(null);
              }}
              title={t(tool.labelKey)}
            >
              <span className="bottom-nav-icon">{tool.icon}</span>
              <span className="bottom-nav-label">{t(tool.labelKey)}</span>
            </button>
          );
        })}
        <button
          className={`bottom-nav-btn ${mobileDrawer === 'sidebar' ? 'active' : ''}`}
          onClick={() => setMobileDrawer(mobileDrawer === 'sidebar' ? null : 'sidebar')}
          title={t('mobile.elements')}
        >
          <span className="bottom-nav-icon">📦</span>
          <span className="bottom-nav-label">{t('mobile.elements')}</span>
        </button>
      </div>
    </>
  );
}
