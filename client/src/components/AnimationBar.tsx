import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export function AnimationBar() {
  const { animTime, animDuration, animSpeed, animPlaying, setAnimTime, setAnimDuration, setAnimSpeed, setAnimPlaying, interpolateElements, elements } = useStore();
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number | null>(null);
  const origPositionsRef = useRef<Map<number, { x: number; y: number; rotation: number }>>(new Map());

  const savePositions = () => {
    const map = new Map<number, { x: number; y: number; rotation: number }>();
    useStore.getState().elements.forEach(el => {
      map.set(el.id, { x: el.x, y: el.y, rotation: el.rotation });
    });
    origPositionsRef.current = map;
  };

  const restorePositions = () => {
    const s = useStore.getState();
    origPositionsRef.current.forEach((pos, id) => {
      s.updateElement(id, pos);
    });
  };

  useEffect(() => {
    if (!animPlaying) return;

    const loop = (ts: number) => {
      if (!useStore.getState().animPlaying) return;
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = ((ts - lastTsRef.current) / 1000) * useStore.getState().animSpeed;
      lastTsRef.current = ts;

      const newTime = useStore.getState().animTime + dt;
      const dur = useStore.getState().animDuration;

      if (newTime >= dur) {
        setAnimTime(dur);
        interpolateElements(dur);
        setAnimPlaying(false);
        lastTsRef.current = null;
        return;
      }

      setAnimTime(newTime);
      interpolateElements(newTime);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [animPlaying, setAnimTime, interpolateElements, setAnimPlaying]);

  // Keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === ' ') {
        e.preventDefault();
        if (useStore.getState().animPlaying) {
          setAnimPlaying(false);
        } else {
          play();
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const s = useStore.getState();
        if (s.selectedId) {
          s.saveUndo();
          s.removeElement(s.selectedId);
        }
      }
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); useStore.getState().undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); useStore.getState().redo(); }
      if (e.key === 'Escape') {
        useStore.getState().setMode('select');
        useStore.getState().setSelected(null);
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        const s = useStore.getState();
        if (s.selectedId) { s.saveUndo(); s.duplicateElement(s.selectedId); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setAnimPlaying]);

  const play = () => {
    const s = useStore.getState();
    if (s.animTime >= s.animDuration) setAnimTime(0);
    savePositions();
    lastTsRef.current = null;
    setAnimPlaying(true);
  };

  const stop = () => {
    setAnimPlaying(false);
    lastTsRef.current = null;
  };

  const rewind = () => {
    stop();
    setAnimTime(0);
    restorePositions();
    // Move to keyframe 0 positions
    useStore.getState().elements.forEach(el => {
      if (el.keyframes.length > 0) {
        useStore.getState().updateElement(el.id, {
          x: el.keyframes[0].x,
          y: el.keyframes[0].y,
          rotation: el.keyframes[0].rotation,
        });
      }
    });
  };

  const step = (dt: number) => {
    stop();
    const s = useStore.getState();
    const newT = Math.max(0, Math.min(s.animDuration, s.animTime + dt));
    setAnimTime(newT);
    interpolateElements(newT);
  };

  const seekTimeline = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = (e.clientX - rect.left) / rect.width;
    const t = p * animDuration;
    setAnimTime(t);
    interpolateElements(t);
  };

  const progress = (animTime / animDuration) * 100;

  // Collect all keyframe markers
  const markers: { t: number; elId: number }[] = [];
  elements.forEach(el => {
    el.keyframes.forEach(kf => markers.push({ t: kf.t, elId: el.id }));
  });

  return (
    <div className="anim-bar">
      <button className="anim-btn" onClick={rewind} title="Zurück">⏮</button>
      <button className="anim-btn" onClick={() => animPlaying ? stop() : play()} title={animPlaying ? 'Pause' : 'Abspielen'}>
        {animPlaying ? '⏸' : '▶'}
      </button>
      <button className="anim-btn" onClick={() => { stop(); rewind(); }} title="Stop">⏹</button>
      <button className="anim-btn" onClick={() => step(-0.25)} title="Schritt zurück">⏪</button>
      <button className="anim-btn" onClick={() => step(0.25)} title="Schritt vor">⏩</button>

      <div className="timeline-container" onClick={seekTimeline}>
        <div className="timeline-progress" style={{ width: `${progress}%` }} />
        {markers.map((m, i) => (
          <div
            key={i}
            className="timeline-marker"
            style={{
              left: `${(m.t / animDuration) * 100}%`,
              background: m.elId === useStore.getState().selectedId ? '#e94560' : '#666',
            }}
          />
        ))}
        <div className="timeline-playhead" style={{ left: `${progress}%` }} />
      </div>

      <div className="anim-time">{animTime.toFixed(1)}s / {animDuration.toFixed(1)}s</div>

      <div>
        <span className="anim-label">Dauer </span>
        <input
          type="number"
          className="anim-input"
          value={animDuration}
          min={1}
          max={60}
          step={0.5}
          onChange={e => setAnimDuration(parseFloat(e.target.value) || 5)}
        />
        <span className="anim-label"> s</span>
      </div>

      <div>
        <span className="anim-label">Speed </span>
        <select
          className="anim-input"
          style={{ width: 60 }}
          value={animSpeed}
          onChange={e => setAnimSpeed(parseFloat(e.target.value))}
        >
          <option value={0.25}>0.25x</option>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
        </select>
      </div>
    </div>
  );
}
