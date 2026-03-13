import { useStore } from '../store/useStore';
import type { ToolMode } from '../types';

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

  return (
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
  );
}
