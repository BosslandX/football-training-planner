import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

export function ContextMenu() {
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
        📋 Duplizieren
      </div>
      <div className="context-item" onClick={() => action(() => { saveUndo(); removeElement(selectedId); })}>
        🗑️ Löschen
      </div>
      <div className="context-separator" />
      <div className="context-item" onClick={() => action(() => bringToFront(selectedId))}>
        ⬆ Nach vorne
      </div>
      <div className="context-item" onClick={() => action(() => sendToBack(selectedId))}>
        ⬇ Nach hinten
      </div>
      <div className="context-separator" />
      <div className="context-item" onClick={() => action(() => {
        saveUndo();
        addKeyframe(selectedId, { t: animTime, x: el.x, y: el.y, rotation: el.rotation });
      })}>
        🎬 Keyframe hier
      </div>
      <div className="context-item" onClick={() => action(() => clearKeyframes(selectedId))}>
        ❌ Keyframes löschen
      </div>
    </div>
  );
}
