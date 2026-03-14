import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { t, useLocale } from '../i18n';

export function ContextMenu() {
  useLocale(s => s.locale);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const { selectedId, saveUndo, duplicateElement, removeElement, bringToFront, sendToBack, addKeyframe, clearKeyframes, elements, animTime } = useStore();

  useEffect(() => {
    const handleContext = (e: MouseEvent) => {
      // Check if right-click was on canvas
      if ((e.target as HTMLElement).tagName === 'CANVAS' && selectedId) {
        setPos({ x: e.clientX, y: e.clientY });
      }
    };
    const handleClick = () => setPos(null);
    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('click', handleClick);
    };
  }, [selectedId]);

  if (!pos || !selectedId) return null;

  const el = elements.find(e => e.id === selectedId);
  if (!el) return null;

  const action = (fn: () => void) => {
    fn();
    setPos(null);
  };

  return (
    <div className="context-menu" style={{ left: pos.x, top: pos.y }}>
      <div className="context-item" onClick={() => action(() => { saveUndo(); duplicateElement(selectedId); })}>
        📋 {t('context.duplicate')}
      </div>
      <div className="context-item" onClick={() => action(() => { saveUndo(); removeElement(selectedId); })}>
        🗑️ {t('context.delete')}
      </div>
      <div className="context-separator" />
      <div className="context-item" onClick={() => action(() => bringToFront(selectedId))}>
        ⬆ {t('context.bringToFront')}
      </div>
      <div className="context-item" onClick={() => action(() => sendToBack(selectedId))}>
        ⬇ {t('context.sendToBack')}
      </div>
      <div className="context-separator" />
      <div className="context-item" onClick={() => action(() => {
        saveUndo();
        addKeyframe(selectedId, { t: animTime, x: el.x, y: el.y, rotation: el.rotation });
      })}>
        🎬 {t('context.keyframeHere')}
      </div>
      <div className="context-item" onClick={() => action(() => clearKeyframes(selectedId))}>
        ❌ {t('context.clearKeyframes')}
      </div>
    </div>
  );
}
