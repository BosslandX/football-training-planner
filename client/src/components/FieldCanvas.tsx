import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { drawField, drawElement, drawDrawing, hitTestElement, hitTestDrawing } from '../utils/renderer';
import { preloadPlayerImages } from '../utils/playerImageCache';
import type { ElementType } from '../types';
import { TEAM_COLORS } from '../types';
import { ContextMenu } from './ContextMenu';

const FIELD_W = 680;
const FIELD_H_FULL = 1020;
const FIELD_H_HALF = 510;
const FIELD_PAD = 40;

export function FieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; offsetX: number; offsetY: number } | null>(null);
  const drawRef = useRef<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null; points: { x: number; y: number }[]; dragged: boolean; clickPlaced: boolean }>({
    start: null, end: null, points: [], dragged: false, clickPlaced: false,
  });
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const contextMenuRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

  const store = useStore();

  const getFieldH = useCallback(() => {
    return store.fieldType.includes('half') ? FIELD_H_HALF : FIELD_H_FULL;
  }, [store.fieldType]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ww = wrapper.clientWidth - 20;
    const wh = wrapper.clientHeight - 20;
    const fieldH = getFieldH();
    const fw = FIELD_W + FIELD_PAD * 2;
    const fh = fieldH + FIELD_PAD * 2;
    const zoom = useStore.getState().zoom;
    const baseScale = Math.min(ww / fw, wh / fh, 1.2);
    const scale = baseScale * zoom;
    canvas.width = fw * scale;
    canvas.height = fh * scale;
    scaleRef.current = scale;
    offsetRef.current = { x: FIELD_PAD * scale, y: FIELD_PAD * scale };

    // Vertically center canvas when smaller than wrapper
    const extraY = Math.max(0, (wrapper.clientHeight - canvas.height - 20) / 2);
    canvas.style.marginTop = extraY > 0 ? `${extraY}px` : '0';
  }, [getFieldH]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = useStore.getState();
    const fieldH = s.fieldType.includes('half') ? FIELD_H_HALF : FIELD_H_FULL;
    const cfg = {
      scale: scaleRef.current,
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
      fieldW: FIELD_W,
      fieldH,
      fieldType: s.fieldType,
      showGrid: s.showGrid,
      selectedId: s.selectedId,
      animPlaying: s.animPlaying,
      playerStyle: s.playerStyle,
      playerScale: s.playerScale,
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawField(ctx, cfg);
    s.drawings.forEach(d => drawDrawing(ctx, d, cfg));
    s.elements.forEach(el => {
      const st = el.startTime ?? 0;
      const et = el.endTime ?? -1;
      const before = s.animTime < st;
      const after = et >= 0 && s.animTime > et;
      if (s.animPlaying && (before || after)) return; // hide during playback
      if (!s.animPlaying && (before || after)) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        drawElement(ctx, el, cfg);
        ctx.restore();
        return;
      }
      drawElement(ctx, el, cfg);
    });

    // In-progress drawing
    const dr = drawRef.current;
    if (dr.start && dr.end) {
      ctx.save();
      ctx.strokeStyle = s.drawColor;
      ctx.fillStyle = s.drawColor;
      ctx.lineWidth = 2.5 * scaleRef.current;
      const ox = offsetRef.current.x;
      const oy = offsetRef.current.y;
      const sc = scaleRef.current;

      if (s.mode === 'zone') {
        ctx.fillStyle = s.drawColor + '22';
        ctx.setLineDash([6 * sc, 4 * sc]);
        const zx = Math.min(dr.start.x, dr.end.x);
        const zy = Math.min(dr.start.y, dr.end.y);
        const zw = Math.abs(dr.end.x - dr.start.x);
        const zh = Math.abs(dr.end.y - dr.start.y);
        ctx.fillRect(ox + zx * sc, oy + zy * sc, zw * sc, zh * sc);
        ctx.strokeRect(ox + zx * sc, oy + zy * sc, zw * sc, zh * sc);
        ctx.setLineDash([]);
      } else if (s.mode === 'curved') {
        // Live preview: wavy line from start to end
        const ddx = dr.end.x - dr.start.x, ddy = dr.end.y - dr.start.y;
        const totalLen = Math.sqrt(ddx * ddx + ddy * ddy);
        if (totalLen > 1) {
          const angle = Math.atan2(ddy, ddx);
          const nx = -Math.sin(angle), ny = Math.cos(angle);
          const steps = Math.max(60, Math.ceil(totalLen / 2));
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const dist = (i / steps) * totalLen;
            const t = dist / totalLen;
            const px = dr.start.x + ddx * t;
            const py = dr.start.y + ddy * t;
            const wave = Math.sin(dist * 0.35) * 6;
            const sx = ox + (px + nx * wave) * sc;
            const sy = oy + (py + ny * wave) * sc;
            if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }
      } else {
        if (s.mode === 'dashed') ctx.setLineDash([8 * sc, 6 * sc]);
        ctx.beginPath();
        ctx.moveTo(ox + dr.start.x * sc, oy + dr.start.y * sc);
        ctx.lineTo(ox + dr.end.x * sc, oy + dr.end.y * sc);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }, []);

  // Preload SVG player images on mount
  useEffect(() => {
    const colors = TEAM_COLORS.map(c => c.value);
    preloadPlayerImages(colors).then(() => render());
  }, [render]);

  // Resize & render on relevant state changes
  useEffect(() => {
    resize();
    render();
    const obs = new ResizeObserver(() => { resize(); render(); });
    if (wrapperRef.current) obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, [resize, render]);

  // Subscribe to store changes for re-render
  useEffect(() => {
    const unsub = useStore.subscribe(() => {
      render();
    });
    return unsub;
  }, [render]);

  // Resize on fieldType change
  useEffect(() => {
    resize();
    render();
  }, [store.fieldType, store.showConcept, store.zoom, resize, render]);

  const canvasToField = (cx: number, cy: number) => ({
    x: (cx - offsetRef.current.x) / scaleRef.current,
    y: (cy - offsetRef.current.y) / scaleRef.current,
  });

  const getCanvasPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return;
    const pos = getCanvasPos(e);
    const fp = canvasToField(pos.x, pos.y);
    const s = useStore.getState();

    // Reset draw state when not in a drawing mode (e.g. switched away from curved)
    if (!['arrow', 'dashed', 'zone', 'curved'].includes(s.mode)) {
      drawRef.current = { start: null, end: null, points: [], dragged: false, clickPlaced: false };
    }

    if (s.mode === 'select') {
      // Click-to-place: if a tool is selected, place element
      if (s.placementType) {
        s.saveUndo();
        const playerCount = s.elements.filter(el => el.type.startsWith('player')).length;
        s.addElement({
          type: s.placementType,
          x: fp.x,
          y: fp.y,
          color: s.selectedColor,
          rotation: 0,
          number: s.placementType.startsWith('player') ? String(playerCount + 1) : '',
          label: '',
          keyframes: [],
          startTime: s.animTime,
          endTime: -1,
          scale: s.playerScale,
        });
        return;
      }

      const hit = hitTestElement(s.elements, fp.x, fp.y);
      if (hit) {
        s.setSelected(hit.id);
        dragRef.current = { id: hit.id, offsetX: fp.x - hit.x, offsetY: fp.y - hit.y };
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      } else {
        s.setSelected(null);
      }
    } else if (['arrow', 'dashed', 'curved', 'zone'].includes(s.mode)) {
      if (drawRef.current.clickPlaced && drawRef.current.start) {
        // Second click → finalize drawing
        s.saveUndo();
        s.addDrawing({
          type: s.mode as 'arrow' | 'dashed' | 'curved' | 'zone',
          x1: drawRef.current.start.x,
          y1: drawRef.current.start.y,
          x2: fp.x,
          y2: fp.y,
          color: s.drawColor,
          width: 2.5,
        });
        drawRef.current = { start: null, end: null, points: [], dragged: false, clickPlaced: false };
      } else {
        drawRef.current = { start: fp, end: null, points: [], dragged: false, clickPlaced: false };
      }
    } else if (s.mode === 'text') {
      const text = prompt('Text eingeben:');
      if (text) {
        s.saveUndo();
        s.addDrawing({ type: 'text', x1: fp.x, y1: fp.y, x2: 0, y2: 0, color: s.drawColor, width: 2.5, text });
      }
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const fp = canvasToField(pos.x, pos.y);
    const s = useStore.getState();

    if (dragRef.current) {
      s.updateElement(dragRef.current.id, {
        x: fp.x - dragRef.current.offsetX,
        y: fp.y - dragRef.current.offsetY,
      });
    } else if (drawRef.current.start && ['arrow', 'dashed', 'curved', 'zone'].includes(s.mode)) {
      drawRef.current.end = fp;
      if (!drawRef.current.clickPlaced) {
        drawRef.current.dragged = true;
      }
      render();
    } else if (s.mode === 'select') {
      if (s.placementType) {
        if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
      } else {
        const hit = hitTestElement(s.elements, fp.x, fp.y);
        if (canvasRef.current) canvasRef.current.style.cursor = hit ? 'grab' : 'default';
      }
    }
  };

  const onMouseUp = () => {
    const s = useStore.getState();
    if (dragRef.current) {
      s.saveUndo();
      dragRef.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    }

    if (drawRef.current.start && ['arrow', 'dashed', 'curved', 'zone'].includes(s.mode)) {
      if (drawRef.current.dragged && drawRef.current.end) {
        // Drag complete → finalize drawing
        s.saveUndo();
        s.addDrawing({
          type: s.mode as 'arrow' | 'dashed' | 'curved' | 'zone',
          x1: drawRef.current.start.x,
          y1: drawRef.current.start.y,
          x2: drawRef.current.end.x,
          y2: drawRef.current.end.y,
          color: s.drawColor,
          width: 2.5,
        });
        drawRef.current = { start: null, end: null, points: [], dragged: false, clickPlaced: false };
      } else if (!drawRef.current.clickPlaced) {
        // Click without drag → keep start, wait for second click
        drawRef.current.clickPlaced = true;
      }
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const s = useStore.getState();

    // Double-click on player -> edit number
    if (s.mode === 'select') {
      const pos = getCanvasPos(e);
      const fp = canvasToField(pos.x, pos.y);
      const hit = hitTestElement(s.elements, fp.x, fp.y);
      if (hit && (hit.type.startsWith('player') || hit.type === 'goalkeeper')) {
        const newNum = prompt('Spielernummer:', hit.number || '');
        if (newNum !== null) {
          s.saveUndo();
          s.updateElement(hit.id, { number: newNum });
        }
        return;
      }

      // Double-click on drawing (arrow/dashed/curved) -> edit label
      const hitDraw = hitTestDrawing(s.drawings, fp.x, fp.y);
      if (hitDraw && (hitDraw.type === 'arrow' || hitDraw.type === 'dashed' || hitDraw.type === 'curved')) {
        const newLabel = prompt('Nummer:', hitDraw.label || '');
        if (newLabel !== null) {
          s.saveUndo();
          s.updateDrawing(hitDraw.id, { label: newLabel || undefined });
        }
        return;
      }
    }

  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    const fp = canvasToField(pos.x, pos.y);
    const s = useStore.getState();
    const hit = hitTestElement(s.elements, fp.x, fp.y);
    if (hit) {
      s.setSelected(hit.id);
      contextMenuRef.current = { x: e.clientX, y: e.clientY };
      render();
      // Force re-render for context menu
      useStore.setState({});
    }
  };

  // === Touch handlers for mobile ===
  const getTouchPos = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const touch = e.touches[0] || e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const onTouchStart = (e: React.TouchEvent) => {
    // Pinch-to-zoom: two fingers
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = {
        startDist: Math.sqrt(dx * dx + dy * dy),
        startZoom: useStore.getState().zoom,
      };
      return;
    }
    if (e.touches.length !== 1) return;
    pinchRef.current = null;
    e.preventDefault();
    const pos = getTouchPos(e);
    if (!pos) return;
    const fp = canvasToField(pos.x, pos.y);
    const s = useStore.getState();

    if (!['arrow', 'dashed', 'zone', 'curved'].includes(s.mode)) {
      drawRef.current = { start: null, end: null, points: [], dragged: false, clickPlaced: false };
    }

    if (s.mode === 'select') {
      if (s.placementType) {
        s.saveUndo();
        const playerCount = s.elements.filter(el => el.type.startsWith('player')).length;
        s.addElement({
          type: s.placementType,
          x: fp.x, y: fp.y,
          color: s.selectedColor, rotation: 0,
          number: s.placementType.startsWith('player') ? String(playerCount + 1) : '',
          label: '', keyframes: [],
          startTime: s.animTime, endTime: -1, scale: s.playerScale,
        });
        return;
      }
      // Larger hit radius for touch (1.8x)
      const hit = hitTestElement(s.elements, fp.x, fp.y, undefined, undefined, 1.8);
      if (hit) {
        s.setSelected(hit.id);
        dragRef.current = { id: hit.id, offsetX: fp.x - hit.x, offsetY: fp.y - hit.y };
      } else {
        s.setSelected(null);
      }
    } else if (['arrow', 'dashed', 'curved', 'zone'].includes(s.mode)) {
      if (drawRef.current.clickPlaced && drawRef.current.start) {
        // Second touch after first tap → finalize handled in onTouchEnd
        drawRef.current.end = fp;
      } else {
        drawRef.current = { start: fp, end: null, points: [], dragged: false, clickPlaced: false };
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    // Pinch-to-zoom
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / pinchRef.current.startDist;
      const newZoom = Math.round(pinchRef.current.startZoom * ratio * 4) / 4; // snap to 0.25
      useStore.getState().setZoom(newZoom);
      return;
    }
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const pos = getTouchPos(e);
    if (!pos) return;
    const fp = canvasToField(pos.x, pos.y);
    const s = useStore.getState();

    if (dragRef.current) {
      s.updateElement(dragRef.current.id, {
        x: fp.x - dragRef.current.offsetX,
        y: fp.y - dragRef.current.offsetY,
      });
    } else if (drawRef.current.start && ['arrow', 'dashed', 'curved', 'zone'].includes(s.mode)) {
      drawRef.current.end = fp;
      drawRef.current.dragged = true;
      render();
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (pinchRef.current) {
      pinchRef.current = null;
      return;
    }
    const s = useStore.getState();

    if (dragRef.current) {
      s.saveUndo();
      dragRef.current = null;
    }

    if (drawRef.current.start && ['arrow', 'dashed', 'curved', 'zone'].includes(s.mode)) {
      if (drawRef.current.dragged && drawRef.current.end) {
        // Drag complete → finalize drawing
        s.saveUndo();
        s.addDrawing({
          type: s.mode as 'arrow' | 'dashed' | 'curved' | 'zone',
          x1: drawRef.current.start.x, y1: drawRef.current.start.y,
          x2: drawRef.current.end.x, y2: drawRef.current.end.y,
          color: s.drawColor, width: 2.5,
        });
        drawRef.current = { start: null, end: null, points: [], dragged: false, clickPlaced: false };
      } else if (drawRef.current.clickPlaced && drawRef.current.end) {
        // Second tap → finalize
        const touch = e.changedTouches[0];
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const fp = canvasToField(touch.clientX - rect.left, touch.clientY - rect.top);
          s.saveUndo();
          s.addDrawing({
            type: s.mode as 'arrow' | 'dashed' | 'curved' | 'zone',
            x1: drawRef.current.start.x, y1: drawRef.current.start.y,
            x2: fp.x, y2: fp.y,
            color: s.drawColor, width: 2.5,
          });
        }
        drawRef.current = { start: null, end: null, points: [], dragged: false, clickPlaced: false };
      } else if (!drawRef.current.clickPlaced) {
        // First tap without drag → wait for second tap
        drawRef.current.clickPlaced = true;
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('elementType') as ElementType;
    if (!type) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const fp = canvasToField(cx, cy);

    const s = useStore.getState();
    s.saveUndo();
    const playerCount = s.elements.filter(el => el.type.startsWith('player')).length;
    s.addElement({
      type,
      x: fp.x,
      y: fp.y,
      color: s.selectedColor,
      rotation: 0,
      number: type.startsWith('player') ? String(playerCount + 1) : '',
      label: '',
      keyframes: [],
      startTime: s.animTime,
      endTime: -1,
      scale: s.playerScale,
    });
  };

  return (
    <div className="canvas-wrapper" ref={wrapperRef}>
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: 'none' }}
      />
      <ContextMenu />
    </div>
  );
}
