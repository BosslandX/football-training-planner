import puppeteer from 'puppeteer';

interface ExerciseData {
  elements: any[];
  drawings: any[];
  concept: {
    name: string;
    category: string;
    duration: number;
    players: number;
    fieldSize: string;
    description: string;
    coachingPoints: string[];
    variations: string[];
    phases: { id: number; name: string; description: string }[];
  };
  fieldType: string;
}

export async function generatePDF(exercises: ExerciseData[]): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });

    const html = buildMultiPageHtml(exercises);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for all canvases to render
    await page.waitForSelector('.field-canvas');
    await new Promise(r => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

function getCanvasDimensions(fieldType: string): { canvasWidth: number; canvasHeight: number } {
  const isLand = fieldType.includes('land');
  const isHalf = fieldType.includes('half');
  if (isLand && isHalf) return { canvasWidth: 510, canvasHeight: 680 };
  if (isLand) return { canvasWidth: 1020, canvasHeight: 680 };
  if (isHalf) return { canvasWidth: 680, canvasHeight: 510 };
  return { canvasWidth: 680, canvasHeight: 1020 };
}

function buildMultiPageHtml(exercises: ExerciseData[]): string {
  const exercisePages = exercises.map((ex, idx) => buildExercisePage(ex, idx)).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', sans-serif; color: #333; margin: 0; padding: 20px; }
    h1 { font-size: 24px; margin-bottom: 4px; color: #1a472a; }
    .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
    .meta span { margin-right: 20px; }
    .field-container { text-align: center; margin: 20px 0; }
    canvas { max-width: 100%; border: 1px solid #ddd; }
    h2 { font-size: 16px; color: #1a472a; border-bottom: 2px solid #2d8a4e; padding-bottom: 4px; margin-top: 24px; }
    .description { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
    ul { padding-left: 20px; }
    li { margin-bottom: 4px; font-size: 14px; }
    .phase { background: #f5f5f5; padding: 10px; margin-bottom: 8px; border-radius: 4px; border-left: 3px solid #2d8a4e; }
    .phase-num { font-size: 11px; font-weight: 700; color: #2d8a4e; text-transform: uppercase; }
    .phase-name { font-weight: 600; margin: 2px 0; }
    .phase-desc { font-size: 13px; color: #555; }
    .material-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .material-table td { padding: 4px 8px; border-bottom: 1px solid #eee; }
    .material-table td:last-child { text-align: right; font-weight: 600; }
    .exercise-page { break-before: page; }
    .exercise-page:first-child { break-before: auto; }
  </style>
</head>
<body>
  ${exercisePages}

  <script>
    // Render all canvases
    document.querySelectorAll('.field-canvas').forEach(canvas => {
      const ctx = canvas.getContext('2d');
      const elements = JSON.parse(canvas.dataset.elements || '[]');
      const drawings = JSON.parse(canvas.dataset.drawings || '[]');
      const fieldType = canvas.dataset.fieldtype || 'full-green';

      const w = canvas.width;
      const h = canvas.height;
      const isGreen = fieldType.includes('green');
      const isHalf = fieldType.includes('half');
      const isLand = fieldType.includes('land');

      // Grass
      if (isGreen) {
        if (isLand) {
          const stripeW = w / 16;
          for (let i = 0; i < 16; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#2d8a4e' : '#35a05a';
            ctx.fillRect(i * stripeW, 0, stripeW, h);
          }
        } else {
          const stripeH = h / 16;
          for (let i = 0; i < 16; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#2d8a4e' : '#35a05a';
            ctx.fillRect(0, i * stripeH, w, stripeH);
          }
        }
      } else {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, w, h);
      }

      const lineColor = isGreen ? '#fff' : '#333';
      ctx.strokeStyle = lineColor;
      ctx.fillStyle = lineColor;
      ctx.lineWidth = 2;

      ctx.strokeRect(0, 0, w, h);

      if (isLand) {
        // Landscape field
        if (!isHalf) {
          ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke();
        }
        const centerX = isHalf ? w : w/2;
        ctx.beginPath(); ctx.arc(centerX, h/2, 60, isHalf ? Math.PI/2 : 0, isHalf ? Math.PI*1.5 : Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(centerX, h/2, 3, 0, Math.PI*2); ctx.fill();
        // Penalty area left
        const penH2 = 108, penW2 = 264;
        ctx.strokeRect(0, (h-penW2)/2, penH2, penW2);
        ctx.strokeRect(0, (h-120)/2, 36, 120);
        ctx.beginPath(); ctx.arc(72, h/2, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(72, h/2, 60, -0.93, 0.93); ctx.stroke();
        if (!isHalf) {
          ctx.strokeRect(w-penH2, (h-penW2)/2, penH2, penW2);
          ctx.strokeRect(w-36, (h-120)/2, 36, 120);
          ctx.beginPath(); ctx.arc(w-72, h/2, 3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(w-72, h/2, 60, Math.PI-0.93, Math.PI+0.93); ctx.stroke();
        }
        // Corner arcs
        [[0,0,0,Math.PI/2],[w,0,Math.PI/2,Math.PI]].forEach(([cx,cy,sa,ea]) => {
          ctx.beginPath(); ctx.arc(cx,cy,8,sa,ea); ctx.stroke();
        });
        if (!isHalf) {
          [[0,h,-Math.PI/2,0],[w,h,Math.PI,Math.PI*1.5]].forEach(([cx,cy,sa,ea]) => {
            ctx.beginPath(); ctx.arc(cx,cy,8,sa,ea); ctx.stroke();
          });
        }
      } else {
        // Portrait field (original)
        if (!isHalf) {
          ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
        }
        const centerY = isHalf ? h : h / 2;
        ctx.beginPath();
        ctx.arc(w/2, centerY, 60, isHalf ? Math.PI : 0, isHalf ? 0 : Math.PI * 2);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(w/2, centerY, 3, 0, Math.PI*2); ctx.fill();
        const penW = 264, penH = 108;
        ctx.strokeRect((w-penW)/2, 0, penW, penH);
        ctx.strokeRect((w-120)/2, 0, 120, 36);
        ctx.beginPath(); ctx.arc(w/2, 72, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(w/2, 72, 60, 0.65, Math.PI-0.65); ctx.stroke();
        if (!isHalf) {
          ctx.strokeRect((w-penW)/2, h-penH, penW, penH);
          ctx.strokeRect((w-120)/2, h-36, 120, 36);
          ctx.beginPath(); ctx.arc(w/2, h-72, 3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(w/2, h-72, 60, Math.PI+0.65, -0.65); ctx.stroke();
        }
      }

      // Draw elements
      elements.forEach(el => {
        const x = el.x, y = el.y;
        switch(el.type) {
          case 'player-run': case 'player-stand': case 'player-pass': {
            ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI*2);
            ctx.fillStyle = el.color; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(el.number || '', x, y);
            break;
          }
          case 'goalkeeper': {
            ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI*2);
            ctx.fillStyle = el.color || '#f39c12'; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('TW', x, y);
            break;
          }
          case 'ball': {
            ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2);
            ctx.fillStyle = '#fff'; ctx.fill();
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
            break;
          }
          case 'cone': {
            ctx.beginPath(); ctx.moveTo(x, y-12); ctx.lineTo(x+8, y+4); ctx.lineTo(x-8, y+4); ctx.closePath();
            ctx.fillStyle = el.color || '#e67e22'; ctx.fill();
            break;
          }
          case 'goal-large': {
            const gw = 50, gh = 16;
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x-gw/2, y+gh/2); ctx.lineTo(x-gw/2, y-gh/2);
            ctx.lineTo(x+gw/2, y-gh/2); ctx.lineTo(x+gw/2, y+gh/2);
            ctx.stroke();
            break;
          }
          case 'goal-small': {
            const gw = 30, gh = 12;
            ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(x-gw/2, y+gh/2); ctx.lineTo(x-gw/2, y-gh/2);
            ctx.lineTo(x+gw/2, y-gh/2); ctx.lineTo(x+gw/2, y+gh/2);
            ctx.stroke();
            break;
          }
        }
        // Reset
        ctx.strokeStyle = lineColor;
        ctx.fillStyle = lineColor;
        ctx.lineWidth = 2;
      });

      // Draw drawings
      drawings.forEach(d => {
        ctx.strokeStyle = d.color || '#fff';
        ctx.fillStyle = d.color || '#fff';
        ctx.lineWidth = d.width || 2.5;
        if (d.type === 'arrow') {
          ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
          const a = Math.atan2(d.y2-d.y1, d.x2-d.x1);
          ctx.beginPath(); ctx.moveTo(d.x2, d.y2);
          ctx.lineTo(d.x2 - 12*Math.cos(a-.4), d.y2 - 12*Math.sin(a-.4));
          ctx.lineTo(d.x2 - 12*Math.cos(a+.4), d.y2 - 12*Math.sin(a+.4));
          ctx.closePath(); ctx.fill();
        } else if (d.type === 'dashed') {
          ctx.setLineDash([8,6]);
          ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
          ctx.setLineDash([]);
        } else if (d.type === 'zone') {
          ctx.fillStyle = (d.color || '#fff') + '22';
          ctx.setLineDash([6,4]); ctx.lineWidth = 2;
          const zx = Math.min(d.x1,d.x2), zy = Math.min(d.y1,d.y2);
          ctx.fillRect(zx, zy, Math.abs(d.x2-d.x1), Math.abs(d.y2-d.y1));
          ctx.strokeRect(zx, zy, Math.abs(d.x2-d.x1), Math.abs(d.y2-d.y1));
          ctx.setLineDash([]);
        }
      });
    });
  <\/script>
</body>
</html>`;
}

function buildExercisePage(data: ExerciseData, index: number): string {
  const { concept, elements, drawings, fieldType } = data;

  const coachingPointsHtml = concept.coachingPoints
    .filter(p => p.trim())
    .map(p => `<li>${escapeHtml(p)}</li>`)
    .join('');

  const variationsHtml = concept.variations
    .filter(v => v.trim())
    .map(v => `<li>${escapeHtml(v)}</li>`)
    .join('');

  const phasesHtml = concept.phases
    .map((p, i) => `
      <div class="phase">
        <div class="phase-num">Phase ${i + 1}</div>
        <div class="phase-name">${escapeHtml(p.name)}</div>
        <div class="phase-desc">${escapeHtml(p.description)}</div>
      </div>
    `)
    .join('');

  const { canvasWidth, canvasHeight } = getCanvasDimensions(fieldType || 'full-green');

  // Store data as data attributes for the shared script to read
  const elementsJson = escapeHtml(JSON.stringify(elements));
  const drawingsJson = escapeHtml(JSON.stringify(drawings || []));

  return `
  <div class="exercise-page">
    <h1>${escapeHtml(concept.name || `Übung ${index + 1}`)}</h1>
    <div class="meta">
      <span>📂 ${escapeHtml(concept.category)}</span>
      <span>⏱️ ${concept.duration} min</span>
      <span>👥 ${concept.players} Spieler</span>
      ${concept.fieldSize ? `<span>📐 ${escapeHtml(concept.fieldSize)}</span>` : ''}
    </div>

    <div class="field-container">
      <canvas class="field-canvas" width="${canvasWidth}" height="${canvasHeight}"
        data-elements="${elementsJson}"
        data-drawings="${drawingsJson}"
        data-fieldtype="${fieldType || 'full-green'}"></canvas>
    </div>

    ${concept.description ? `<h2>Beschreibung</h2><div class="description">${escapeHtml(concept.description)}</div>` : ''}

    ${coachingPointsHtml ? `<h2>Coaching-Punkte</h2><ul>${coachingPointsHtml}</ul>` : ''}

    ${variationsHtml ? `<h2>Variationen</h2><ul>${variationsHtml}</ul>` : ''}

    ${phasesHtml ? `<h2>Phasen / Ablauf</h2>${phasesHtml}` : ''}

    <h2>Material</h2>
    <table class="material-table">
      ${buildMaterialTable(elements)}
    </table>
  </div>`;
}

function buildMaterialTable(elements: any[]): string {
  const counts: Record<string, number> = {};
  const nameMap: Record<string, string> = {
    'player-run': 'Spieler', 'player-stand': 'Spieler', 'player-pass': 'Spieler',
    'goalkeeper': 'Torwart', 'trainer': 'Trainer', 'dummy': 'Dummy',
    'ball': 'Ball', 'cone': 'Hütchen', 'pole': 'Stange', 'ladder': 'Leiter',
    'flag': 'Flagge', 'ring': 'Ring',
    'goal-large': 'Großtor', 'goal-small': 'Minitor', 'goal-cone': 'Hütchentor',
  };
  elements.forEach((el: any) => {
    const name = nameMap[el.type] || el.type;
    counts[name] = (counts[name] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => `<tr><td>${name}</td><td>${count}×</td></tr>`)
    .join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
