import type { FieldElement, Drawing, FieldType } from '../types';

const HIGHLIGHT = '#e94560';

interface RenderConfig {
  scale: number;
  offsetX: number;
  offsetY: number;
  fieldW: number;
  fieldH: number;
  fieldType: FieldType;
  showGrid: boolean;
  selectedId: number | null;
  animPlaying: boolean;
  playerStyle: 'circle' | 'figure';
}

export function drawField(ctx: CanvasRenderingContext2D, cfg: RenderConfig) {
  const { scale: s, offsetX: ox, offsetY: oy, fieldW, fieldH, fieldType, showGrid } = cfg;
  const w = fieldW * s;
  const h = fieldH * s;
  const isGreen = fieldType.includes('green');
  const isHalf = fieldType.includes('half');

  // Background
  ctx.fillStyle = '#1a472a';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Grass stripes or white
  if (isGreen) {
    const stripeH = h / 16;
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#2d8a4e' : '#35a05a';
      ctx.fillRect(ox, oy + i * stripeH, w, stripeH);
    }
  } else {
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(ox, oy, w, h);
  }

  const lineColor = isGreen ? '#fff' : '#333';
  ctx.strokeStyle = lineColor;
  ctx.fillStyle = lineColor;
  ctx.lineWidth = 2 * s;

  // Outer boundary
  ctx.strokeRect(ox, oy, w, h);

  // Half line
  if (!isHalf) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + h / 2);
    ctx.lineTo(ox + w, oy + h / 2);
    ctx.stroke();
  }

  // Center circle
  const centerY = isHalf ? oy + h : oy + h / 2;
  ctx.beginPath();
  ctx.arc(ox + w / 2, centerY, 60 * s, isHalf ? Math.PI : 0, isHalf ? 0 : Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(ox + w / 2, centerY, 3 * s, 0, Math.PI * 2);
  ctx.fill();

  // Penalty area top
  const penW = 264 * s, penH = 108 * s;
  const penX = ox + (w - penW) / 2;
  ctx.strokeRect(penX, oy, penW, penH);

  // Goal area top
  const goalW = 120 * s, goalH = 36 * s;
  const goalX = ox + (w - goalW) / 2;
  ctx.strokeRect(goalX, oy, goalW, goalH);

  // Penalty dot + arc top
  ctx.beginPath();
  ctx.arc(ox + w / 2, oy + 72 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ox + w / 2, oy + 72 * s, 60 * s, 0.65, Math.PI - 0.65);
  ctx.stroke();

  if (!isHalf) {
    ctx.strokeRect(penX, oy + h - penH, penW, penH);
    ctx.strokeRect(goalX, oy + h - goalH, goalW, goalH);
    ctx.beginPath();
    ctx.arc(ox + w / 2, oy + h - 72 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ox + w / 2, oy + h - 72 * s, 60 * s, Math.PI + 0.65, -0.65);
    ctx.stroke();
  }

  // Corner arcs
  const cr = 8 * s;
  [[ox, oy, 0, Math.PI / 2], [ox + w, oy, Math.PI / 2, Math.PI]].forEach(([cx, cy, sa, ea]) => {
    ctx.beginPath();
    ctx.arc(cx as number, cy as number, cr, sa as number, ea as number);
    ctx.stroke();
  });
  if (!isHalf) {
    [[ox, oy + h, -Math.PI / 2, 0], [ox + w, oy + h, Math.PI, Math.PI * 1.5]].forEach(([cx, cy, sa, ea]) => {
      ctx.beginPath();
      ctx.arc(cx as number, cy as number, cr, sa as number, ea as number);
      ctx.stroke();
    });
  }

  // Grid
  if (showGrid) {
    ctx.strokeStyle = isGreen ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.1)';
    ctx.lineWidth = 1;
    const gridSize = 34 * s;
    for (let x = ox + gridSize; x < ox + w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + h); ctx.stroke();
    }
    for (let y = oy + gridSize; y < oy + h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + w, y); ctx.stroke();
    }
  }
}

function drawPlayerFigure(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  el: FieldElement, s: number, selected: boolean
) {
  const color = el.color || '#3498db';
  const isTrainer = el.type === 'trainer';
  const isGK = el.type === 'goalkeeper';
  const shirtColor = isTrainer ? '#2c3e50' : color;
  const shortsColor = isTrainer ? '#1a252f' : '#fff';
  const headR = 6 * s;
  const bodyH = 16 * s;
  const bodyW = 14 * s;
  const legH = 12 * s;
  const armL = 10 * s;

  // Head
  ctx.beginPath();
  ctx.arc(x, y - bodyH / 2 - headR, headR, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c6a0';
  ctx.fill();
  ctx.strokeStyle = '#c9956b';
  ctx.lineWidth = 1 * s;
  ctx.stroke();

  // Shirt (torso)
  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.moveTo(x - bodyW / 2, y - bodyH / 2 + 2 * s);
  ctx.lineTo(x + bodyW / 2, y - bodyH / 2 + 2 * s);
  ctx.lineTo(x + bodyW / 2 - 1 * s, y + bodyH / 4);
  ctx.lineTo(x - bodyW / 2 + 1 * s, y + bodyH / 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Shorts
  ctx.fillStyle = shortsColor;
  ctx.beginPath();
  ctx.moveTo(x - bodyW / 2 + 1 * s, y + bodyH / 4);
  ctx.lineTo(x + bodyW / 2 - 1 * s, y + bodyH / 4);
  ctx.lineTo(x + bodyW / 2 - 2 * s, y + bodyH / 4 + 8 * s);
  ctx.lineTo(x + 1 * s, y + bodyH / 4 + 7 * s);
  ctx.lineTo(x - 1 * s, y + bodyH / 4 + 7 * s);
  ctx.lineTo(x - bodyW / 2 + 2 * s, y + bodyH / 4 + 8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.15)';
  ctx.stroke();

  // Legs
  ctx.strokeStyle = '#f5c6a0';
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';

  if (el.type === 'player-run') {
    // Running pose: legs spread
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y + bodyH / 4 + 6 * s);
    ctx.lineTo(x - 6 * s, y + bodyH / 4 + 6 * s + legH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 2 * s, y + bodyH / 4 + 6 * s);
    ctx.lineTo(x + 6 * s, y + bodyH / 4 + 6 * s + legH);
    ctx.stroke();
  } else if (el.type === 'player-pass') {
    // Kicking pose: one leg forward
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y + bodyH / 4 + 6 * s);
    ctx.lineTo(x - 3 * s, y + bodyH / 4 + 6 * s + legH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 2 * s, y + bodyH / 4 + 6 * s);
    ctx.lineTo(x + 10 * s, y + bodyH / 4 + 2 * s + legH);
    ctx.stroke();
  } else {
    // Standing
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y + bodyH / 4 + 6 * s);
    ctx.lineTo(x - 3 * s, y + bodyH / 4 + 6 * s + legH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 2 * s, y + bodyH / 4 + 6 * s);
    ctx.lineTo(x + 3 * s, y + bodyH / 4 + 6 * s + legH);
    ctx.stroke();
  }

  // Arms
  ctx.strokeStyle = '#f5c6a0';
  ctx.lineWidth = 2.5 * s;

  if (isGK) {
    // GK: arms wide
    ctx.beginPath();
    ctx.moveTo(x - bodyW / 2, y - bodyH / 4);
    ctx.lineTo(x - bodyW / 2 - armL, y - bodyH / 2 - 2 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + bodyW / 2, y - bodyH / 4);
    ctx.lineTo(x + bodyW / 2 + armL, y - bodyH / 2 - 2 * s);
    ctx.stroke();
    // Gloves
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.arc(x - bodyW / 2 - armL, y - bodyH / 2 - 2 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + bodyW / 2 + armL, y - bodyH / 2 - 2 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (el.type === 'player-run') {
    // Running arms
    ctx.beginPath();
    ctx.moveTo(x - bodyW / 2, y - bodyH / 4);
    ctx.lineTo(x - bodyW / 2 - armL * 0.6, y + 2 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + bodyW / 2, y - bodyH / 4);
    ctx.lineTo(x + bodyW / 2 + armL * 0.6, y - bodyH / 2);
    ctx.stroke();
  } else {
    // Relaxed arms
    ctx.beginPath();
    ctx.moveTo(x - bodyW / 2, y - bodyH / 4);
    ctx.lineTo(x - bodyW / 2 - armL * 0.3, y + 4 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + bodyW / 2, y - bodyH / 4);
    ctx.lineTo(x + bodyW / 2 + armL * 0.3, y + 4 * s);
    ctx.stroke();
  }

  // Number on shirt
  const numText = isGK ? (el.number || 'TW') : isTrainer ? 'TR' : (el.number || '');
  if (numText) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${8 * s}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(numText, x, y - bodyH / 8 + 2 * s);
  }

  // Label below
  if (el.label) {
    ctx.fillStyle = '#fff';
    ctx.font = `${9 * s}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(el.label, x, y + bodyH / 4 + 6 * s + legH + 10 * s);
  }

  // Selection highlight
  if (selected) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    const top = y - bodyH / 2 - headR * 2 - 2 * s;
    const bot = y + bodyH / 4 + 6 * s + legH + 2 * s;
    const left = isGK ? x - bodyW / 2 - armL - 4 * s : x - bodyW / 2 - armL * 0.5 - 2 * s;
    const right = isGK ? x + bodyW / 2 + armL + 4 * s : x + bodyW / 2 + armL * 0.5 + 2 * s;
    ctx.strokeRect(left, top, right - left, bot - top);
    ctx.setLineDash([]);
  }
}

export function drawElement(ctx: CanvasRenderingContext2D, el: FieldElement, cfg: RenderConfig) {
  const { scale: s, offsetX, offsetY, selectedId, animPlaying } = cfg;
  const x = offsetX + el.x * s;
  const y = offsetY + el.y * s;
  const selected = el.id === selectedId;

  ctx.save();
  if (el.rotation) {
    ctx.translate(x, y);
    ctx.rotate(el.rotation * Math.PI / 180);
    ctx.translate(-x, -y);
  }

  switch (el.type) {
    case 'player-run':
    case 'player-stand':
    case 'player-pass': {
      if (cfg.playerStyle === 'figure') {
        drawPlayerFigure(ctx, x, y, el, s, selected);
      } else {
        const r = 16 * s;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = el.color;
        ctx.fill();
        ctx.strokeStyle = selected ? '#fff' : 'rgba(0,0,0,.4)';
        ctx.lineWidth = selected ? 3 : 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${12 * s}px Segoe UI, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.number || '', x, y);
        if (el.label) {
          ctx.font = `${9 * s}px Segoe UI, sans-serif`;
          ctx.fillText(el.label, x, y + r + 10 * s);
        }
        if (el.type === 'player-run') {
          ctx.beginPath();
          ctx.moveTo(x + r * 0.7, y - r * 0.3);
          ctx.lineTo(x + r * 1.1, y);
          ctx.lineTo(x + r * 0.7, y + r * 0.3);
          ctx.fillStyle = el.color;
          ctx.fill();
        }
      }
      break;
    }
    case 'goalkeeper': {
      if (cfg.playerStyle === 'figure') {
        drawPlayerFigure(ctx, x, y, el, s, selected);
      } else {
        const r = 16 * s;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = el.color || '#f39c12';
        ctx.fill();
        ctx.strokeStyle = selected ? '#fff' : 'rgba(0,0,0,.4)';
        ctx.lineWidth = selected ? 3 : 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${11 * s}px Segoe UI, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TW', x, y);
      }
      break;
    }
    case 'trainer': {
      if (cfg.playerStyle === 'figure') {
        drawPlayerFigure(ctx, x, y, el, s, selected);
      } else {
        const r = 16 * s;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#2c3e50';
        ctx.fill();
        ctx.strokeStyle = selected ? '#fff' : 'rgba(255,255,255,.3)';
        ctx.lineWidth = selected ? 3 : 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${10 * s}px Segoe UI, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TR', x, y);
      }
      break;
    }
    case 'dummy': {
      const r = 12 * s;
      const h = 36 * s;
      ctx.fillStyle = '#e67e22';
      ctx.beginPath();
      ctx.ellipse(x, y - h / 4, r * 0.7, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 3 * s, y - h / 4, 6 * s, h / 2);
      ctx.beginPath();
      ctx.arc(x, y - h / 4 - r, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - r, y - h / 2 - r, r * 2, h + r);
      }
      break;
    }
    case 'ball': {
      const r = 10 * s;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = HIGHLIGHT;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'cone': {
      const sz = 12 * s;
      ctx.beginPath();
      ctx.moveTo(x, y - sz);
      ctx.lineTo(x + sz * 0.7, y + sz * 0.3);
      ctx.lineTo(x - sz * 0.7, y + sz * 0.3);
      ctx.closePath();
      ctx.fillStyle = el.color || '#e67e22';
      ctx.fill();
      ctx.strokeStyle = selected ? '#fff' : 'rgba(0,0,0,.3)';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.stroke();
      break;
    }
    case 'pole': {
      const h = 30 * s;
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(x, y + h);
      ctx.stroke();
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(x, y - h, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 6 * s, y - h - 6 * s, 12 * s, 2 * h + 12 * s);
      }
      break;
    }
    case 'ladder': {
      const lw = 20 * s, lh = 50 * s;
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(x - lw / 2, y - lh / 2);
      ctx.lineTo(x - lw / 2, y + lh / 2);
      ctx.moveTo(x + lw / 2, y - lh / 2);
      ctx.lineTo(x + lw / 2, y + lh / 2);
      ctx.stroke();
      ctx.lineWidth = 2 * s;
      for (let i = 0; i < 6; i++) {
        const ry = y - lh / 2 + (i + 0.5) * lh / 6;
        ctx.beginPath();
        ctx.moveTo(x - lw / 2, ry);
        ctx.lineTo(x + lw / 2, ry);
        ctx.stroke();
      }
      if (selected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - lw / 2 - 4, y - lh / 2 - 4, lw + 8, lh + 8);
      }
      break;
    }
    case 'flag': {
      const fh = 30 * s;
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(x, y + fh / 2);
      ctx.lineTo(x, y - fh / 2);
      ctx.stroke();
      ctx.fillStyle = el.color || '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(x, y - fh / 2);
      ctx.lineTo(x + 14 * s, y - fh / 2 + 6 * s);
      ctx.lineTo(x, y - fh / 2 + 12 * s);
      ctx.closePath();
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 4, y - fh / 2 - 4, 20 * s, fh + 8);
      }
      break;
    }
    case 'ring': {
      const r = 14 * s;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = el.color || '#e67e22';
      ctx.lineWidth = 3 * s;
      ctx.stroke();
      if (selected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'goal-large': {
      const gw = 50 * s, gh = 16 * s;
      ctx.fillStyle = 'rgba(255,255,255,.1)';
      ctx.fillRect(x - gw / 2, y - gh / 2, gw, gh);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(x - gw / 2, y + gh / 2);
      ctx.lineTo(x - gw / 2, y - gh / 2);
      ctx.lineTo(x + gw / 2, y - gh / 2);
      ctx.lineTo(x + gw / 2, y + gh / 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const lx = x - gw / 2 + i * gw / 5;
        ctx.beginPath(); ctx.moveTo(lx, y - gh / 2); ctx.lineTo(lx, y + gh / 2); ctx.stroke();
      }
      if (selected) {
        ctx.strokeStyle = HIGHLIGHT;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - gw / 2 - 4, y - gh / 2 - 4, gw + 8, gh + 8);
      }
      break;
    }
    case 'goal-small': {
      const gw = 30 * s, gh = 12 * s;
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.moveTo(x - gw / 2, y + gh / 2);
      ctx.lineTo(x - gw / 2, y - gh / 2);
      ctx.lineTo(x + gw / 2, y - gh / 2);
      ctx.lineTo(x + gw / 2, y + gh / 2);
      ctx.stroke();
      if (selected) {
        ctx.strokeStyle = HIGHLIGHT;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - gw / 2 - 4, y - gh / 2 - 4, gw + 8, gh + 8);
      }
      break;
    }
    case 'goal-cone': {
      const dist = 20 * s;
      [x - dist, x + dist].forEach(cx => {
        ctx.beginPath();
        ctx.moveTo(cx, y - 10 * s);
        ctx.lineTo(cx + 7 * s, y + 4 * s);
        ctx.lineTo(cx - 7 * s, y + 4 * s);
        ctx.closePath();
        ctx.fillStyle = '#e67e22';
        ctx.fill();
      });
      if (selected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - dist - 10 * s, y - 14 * s, dist * 2 + 20 * s, 22 * s);
      }
      break;
    }
  }

  // Keyframe path preview (only when not playing)
  if (el.keyframes && el.keyframes.length > 1 && !animPlaying) {
    ctx.setLineDash([4 * s, 4 * s]);
    ctx.strokeStyle = 'rgba(233,69,96,.5)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(offsetX + el.keyframes[0].x * s, offsetY + el.keyframes[0].y * s);
    for (let i = 1; i < el.keyframes.length; i++) {
      ctx.lineTo(offsetX + el.keyframes[i].x * s, offsetY + el.keyframes[i].y * s);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    el.keyframes.forEach((kf, i) => {
      ctx.beginPath();
      ctx.arc(offsetX + kf.x * s, offsetY + kf.y * s, 4 * s, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#2ecc71' : HIGHLIGHT;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `${8 * s}px Segoe UI, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(kf.t.toFixed(1) + 's', offsetX + kf.x * s, offsetY + kf.y * s - 8 * s);
    });
  }

  ctx.restore();
}

export function drawDrawing(ctx: CanvasRenderingContext2D, d: Drawing, cfg: RenderConfig) {
  const { scale: s, offsetX: ox, offsetY: oy } = cfg;
  ctx.save();
  ctx.strokeStyle = d.color || '#fff';
  ctx.fillStyle = d.color || '#fff';
  ctx.lineWidth = (d.width || 2.5) * s;

  switch (d.type) {
    case 'arrow': {
      ctx.beginPath();
      ctx.moveTo(ox + d.x1 * s, oy + d.y1 * s);
      ctx.lineTo(ox + d.x2 * s, oy + d.y2 * s);
      ctx.stroke();
      const angle = Math.atan2(d.y2 - d.y1, d.x2 - d.x1);
      const hl = 12 * s;
      ctx.beginPath();
      ctx.moveTo(ox + d.x2 * s, oy + d.y2 * s);
      ctx.lineTo(ox + d.x2 * s - hl * Math.cos(angle - 0.4), oy + d.y2 * s - hl * Math.sin(angle - 0.4));
      ctx.lineTo(ox + d.x2 * s - hl * Math.cos(angle + 0.4), oy + d.y2 * s - hl * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'dashed': {
      ctx.setLineDash([8 * s, 6 * s]);
      ctx.beginPath();
      ctx.moveTo(ox + d.x1 * s, oy + d.y1 * s);
      ctx.lineTo(ox + d.x2 * s, oy + d.y2 * s);
      ctx.stroke();
      ctx.setLineDash([]);
      const angle2 = Math.atan2(d.y2 - d.y1, d.x2 - d.x1);
      const hl2 = 10 * s;
      ctx.beginPath();
      ctx.moveTo(ox + d.x2 * s, oy + d.y2 * s);
      ctx.lineTo(ox + d.x2 * s - hl2 * Math.cos(angle2 - 0.4), oy + d.y2 * s - hl2 * Math.sin(angle2 - 0.4));
      ctx.lineTo(ox + d.x2 * s - hl2 * Math.cos(angle2 + 0.4), oy + d.y2 * s - hl2 * Math.sin(angle2 + 0.4));
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'curved': {
      if (d.points && d.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(ox + d.points[0].x * s, oy + d.points[0].y * s);
        for (let i = 1; i < d.points.length - 1; i++) {
          const xc = (d.points[i].x + d.points[i + 1].x) / 2;
          const yc = (d.points[i].y + d.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(ox + d.points[i].x * s, oy + d.points[i].y * s, ox + xc * s, oy + yc * s);
        }
        const last = d.points[d.points.length - 1];
        const prev = d.points.length > 2 ? d.points[d.points.length - 2] : d.points[0];
        ctx.quadraticCurveTo(ox + prev.x * s, oy + prev.y * s, ox + last.x * s, oy + last.y * s);
        ctx.stroke();
        const a = Math.atan2(last.y - prev.y, last.x - prev.x);
        const hl = 12 * s;
        ctx.beginPath();
        ctx.moveTo(ox + last.x * s, oy + last.y * s);
        ctx.lineTo(ox + last.x * s - hl * Math.cos(a - 0.4), oy + last.y * s - hl * Math.sin(a - 0.4));
        ctx.lineTo(ox + last.x * s - hl * Math.cos(a + 0.4), oy + last.y * s - hl * Math.sin(a + 0.4));
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'zone': {
      ctx.fillStyle = (d.color || '#fff') + '22';
      ctx.strokeStyle = d.color || '#fff';
      ctx.setLineDash([6 * s, 4 * s]);
      ctx.lineWidth = 2 * s;
      const zx = Math.min(d.x1, d.x2), zy = Math.min(d.y1, d.y2);
      const zw = Math.abs(d.x2 - d.x1), zh = Math.abs(d.y2 - d.y1);
      ctx.fillRect(ox + zx * s, oy + zy * s, zw * s, zh * s);
      ctx.strokeRect(ox + zx * s, oy + zy * s, zw * s, zh * s);
      ctx.setLineDash([]);
      break;
    }
    case 'text': {
      ctx.font = `bold ${14 * s}px Segoe UI, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(d.text || '', ox + d.x1 * s, oy + d.y1 * s);
      break;
    }
  }

  // Draw label (number) on arrow/dashed/curved
  if (d.label && (d.type === 'arrow' || d.type === 'dashed' || d.type === 'curved')) {
    let lx: number, ly: number;
    if (d.type === 'curved' && d.points && d.points.length >= 2) {
      const mid = d.points[Math.floor(d.points.length / 2)];
      lx = ox + mid.x * s;
      ly = oy + mid.y * s;
    } else {
      lx = ox + ((d.x1 + d.x2) / 2) * s;
      ly = oy + ((d.y1 + d.y2) / 2) * s;
    }
    const r = 12 * s;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${12 * s}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.label, lx, ly);
  }

  ctx.restore();
}

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx, projY = ay + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

export function hitTestDrawing(drawings: Drawing[], fx: number, fy: number): Drawing | null {
  const threshold = 15;
  for (let i = drawings.length - 1; i >= 0; i--) {
    const d = drawings[i];
    if (d.type === 'arrow' || d.type === 'dashed') {
      if (pointToSegmentDist(fx, fy, d.x1, d.y1, d.x2, d.y2) < threshold) return d;
    } else if (d.type === 'curved' && d.points && d.points.length >= 2) {
      for (let j = 0; j < d.points.length - 1; j++) {
        if (pointToSegmentDist(fx, fy, d.points[j].x, d.points[j].y, d.points[j + 1].x, d.points[j + 1].y) < threshold) return d;
      }
    }
  }
  return null;
}

export function hitTestElement(elements: FieldElement[], fx: number, fy: number): FieldElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    const dx = fx - el.x, dy = fy - el.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitR = el.type.includes('goal') ? 30 : el.type === 'ladder' ? 28 : 20;
    if (dist < hitR) return el;
  }
  return null;
}
