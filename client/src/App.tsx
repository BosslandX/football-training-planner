import { useEffect, useRef, useCallback } from 'react';
import { useStore } from './store/useStore';
import { TopBar } from './components/TopBar';
import { ExerciseTabs } from './components/ExerciseTabs';
import { Sidebar } from './components/Sidebar';
import { FieldCanvas } from './components/FieldCanvas';
import { AnimationBar } from './components/AnimationBar';
import { ConceptPanel } from './components/ConceptPanel';
import { MobileNav } from './components/MobileNav';
import { CookieBanner } from './components/CookieBanner';
import { LegalOverlay } from './components/LegalOverlay';
import { t, useLocale } from './i18n';
import './styles.css';

export default function App() {
  useLocale(s => s.locale);
  const mobileDrawer = useStore(s => s.mobileDrawer);
  const setMobileDrawer = useStore(s => s.setMobileDrawer);
  const loadedRef = useRef(false);

  // Auto-load drill from URL param ?drillId=X
  useEffect(() => {
    if (loadedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const drillId = params.get('drillId');
    if (!drillId) return;
    loadedRef.current = true;

    fetch(`/api/drills/${drillId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        useStore.getState().importTrainingPlan(data);
      })
      .catch(err => {
        console.error('Failed to load drill:', err);
      });
  }, []);

  // Clear drawer state when resizing to desktop
  const stableSetMobileDrawer = useCallback(
    (d: 'sidebar' | 'concept' | null) => setMobileDrawer(d),
    [setMobileDrawer]
  );
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) stableSetMobileDrawer(null);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [stableSetMobileDrawer]);

  // Check if running in embedded mode (iframe)
  const params = new URLSearchParams(window.location.search);
  const embedded = params.get('embedded') === '1';

  return (
    <div className="app">
      {!embedded && <TopBar />}
      {!embedded && <ExerciseTabs />}
      <div className="main">
        {/* Drawer overlay (mobile only, shown via CSS) */}
        {mobileDrawer && (
          <div
            className="drawer-overlay"
            onClick={() => setMobileDrawer(null)}
          />
        )}

        <Sidebar />

        <div className="canvas-area">
          <FieldCanvas />
          <AnimationBar />
        </div>

        {!embedded && <ConceptPanel />}
      </div>

      {!embedded && <MobileNav />}

      {!embedded && (
        <footer className="app-footer">
          <button className="footer-link" onClick={() => {
            window.dispatchEvent(new CustomEvent('show-legal', { detail: 'impressum' }));
          }}>{t('app.impressum')}</button>
          <span className="footer-sep">|</span>
          <button className="footer-link" onClick={() => {
            window.dispatchEvent(new CustomEvent('show-legal', { detail: 'datenschutz' }));
          }}>{t('app.datenschutz')}</button>
        </footer>
      )}

      <CookieBanner />
      <LegalOverlay />
    </div>
  );
}
