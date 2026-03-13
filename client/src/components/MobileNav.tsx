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
  const mobileDrawer = useStore(s => s.mobileDrawer);
  const setMobileDrawer = useStore(s => s.setMobileDrawer);
  const selectedId = useStore(s => s.selectedId);
  const elements = useStore(s => s.elements);
  const zoom = useStore(s => s.zoom);
  const setZoom = useStore(s => s.setZoom);
  const setConceptTab = useStore(s => s.setConceptTab);

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

  const handleKeyframe = () => {
    if (!selectedId) return;
    const s = useStore.getState();
    const el = s.elements.find(e => e.id === selectedId);
    if (el) {
      s.saveUndo();
      s.addKeyframe(selectedId, { t: s.animTime, x: el.x, y: el.y, rotation: el.rotation });
    }
  };

  return (
    <>
      {/* Selection action bar — shown when element is selected */}
      {selectedEl && (
        <div className="mobile-selection-bar">
          <div className="selection-info">
            {ELEMENT_TYPE_NAMES[selectedEl.type] || selectedEl.type}
          </div>
          <div className="selection-actions">
            <button className="selection-btn" onClick={handleProperties} title="Eigenschaften">
              <span>⚙️</span><span>Eigensch.</span>
            </button>
            <button className="selection-btn" onClick={handleKeyframe} title="Keyframe">
              <span>◆</span><span>Keyframe</span>
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

      {/* Zoom controls — floating, moves up when selection bar visible */}
      <div className="mobile-zoom" style={selectedEl ? { bottom: 126 } : undefined}>
        <button onClick={() => setZoom(zoom - 0.25)} disabled={zoom <= 0.5}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(zoom + 0.25)} disabled={zoom >= 2.0}>+</button>
      </div>

      {/* Bottom navigation */}
      <div className="bottom-nav">
        {TOOLS.map(t => (
          <button
            key={t.mode}
            className={`bottom-nav-btn ${mode === t.mode ? 'active' : ''}`}
            onClick={() => { setMode(t.mode); if (mobileDrawer) setMobileDrawer(null); }}
            title={t.label}
          >
            <span className="bottom-nav-icon">{t.icon}</span>
            <span className="bottom-nav-label">{t.label}</span>
          </button>
        ))}
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
