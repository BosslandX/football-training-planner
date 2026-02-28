import puppeteer from 'puppeteer';

interface VideoExportData {
  elements: any[];
  drawings: any[];
  fieldType: string;
  animDuration: number;
  fps: number;
}

export async function generateAnimationFrames(data: VideoExportData): Promise<Buffer> {
  const { elements, drawings, fieldType, animDuration, fps } = data;
  const totalFrames = Math.ceil(animDuration * fps);
  const frameDelay = 1000 / fps;
  const isHalf = fieldType.includes('half');
  const fieldH = isHalf ? 510 : 1020;
  const canvasW = 680;
  const canvasH = fieldH;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: canvasW + 40, height: canvasH + 40 });

    // Build HTML with animation renderer and GIF encoder
    const html = buildAnimationHtml(elements, drawings, fieldType, animDuration, fps, canvasW, canvasH);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for GIF generation
    await page.waitForFunction('window.__gifDone === true', { timeout: 60000 });

    // Get the generated GIF as base64
    const gifBase64 = await page.evaluate(() => (window as any).__gifData);
    return Buffer.from(gifBase64, 'base64');
  } finally {
    await browser.close();
  }
}

function buildAnimationHtml(
  elements: any[], drawings: any[], fieldType: string,
  animDuration: number, fps: number,
  canvasW: number, canvasH: number
): string {
  const isGreen = fieldType.includes('green');
  const isHalf = fieldType.includes('half');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script>
  // Minimal GIF encoder (LZW-based)
  // Simplified GIF89a encoder for animation frames
  class GIFEncoder {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.frames = [];
      this.delay = 100;
    }

    setDelay(ms) { this.delay = ms; }

    addFrame(canvas) {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, this.width, this.height);
      // Quantize to 256 colors
      const { palette, indexed } = this.quantize(imageData.data);
      this.frames.push({ palette, indexed, delay: this.delay });
    }

    quantize(pixels) {
      // Simple median-cut quantization to 256 colors
      const colorMap = new Map();
      const palette = [];
      const indexed = new Uint8Array(this.width * this.height);

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i] >> 4;
        const g = pixels[i+1] >> 4;
        const b = pixels[i+2] >> 4;
        const key = (r << 8) | (g << 4) | b;

        if (!colorMap.has(key) && palette.length < 256) {
          colorMap.set(key, palette.length);
          palette.push([pixels[i], pixels[i+1], pixels[i+2]]);
        }
      }

      // Fill to 256 if needed
      while (palette.length < 256) palette.push([0, 0, 0]);

      // Map pixels to palette indices (nearest color)
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i] >> 4;
        const g = pixels[i+1] >> 4;
        const b = pixels[i+2] >> 4;
        const key = (r << 8) | (g << 4) | b;
        indexed[i/4] = colorMap.get(key) || 0;
      }

      return { palette, indexed };
    }

    finish() {
      // Build GIF binary
      const bytes = [];

      // Header
      this.writeString(bytes, 'GIF89a');

      // Logical Screen Descriptor
      this.writeShort(bytes, this.width);
      this.writeShort(bytes, this.height);
      bytes.push(0xF7); // GCT flag, 256 colors
      bytes.push(0);    // BG color
      bytes.push(0);    // Pixel aspect ratio

      // Global Color Table from first frame
      if (this.frames.length > 0) {
        const palette = this.frames[0].palette;
        for (let i = 0; i < 256; i++) {
          bytes.push(palette[i][0], palette[i][1], palette[i][2]);
        }
      }

      // Application Extension for looping
      bytes.push(0x21, 0xFF, 0x0B);
      this.writeString(bytes, 'NETSCAPE2.0');
      bytes.push(0x03, 0x01);
      this.writeShort(bytes, 0); // Loop forever
      bytes.push(0x00);

      // Frames
      for (const frame of this.frames) {
        // Graphic Control Extension
        bytes.push(0x21, 0xF9, 0x04);
        bytes.push(0x00); // Disposal
        this.writeShort(bytes, Math.round(frame.delay / 10)); // Delay in 1/100th sec
        bytes.push(0x00); // Transparent color
        bytes.push(0x00);

        // Image Descriptor
        bytes.push(0x2C);
        this.writeShort(bytes, 0); // x
        this.writeShort(bytes, 0); // y
        this.writeShort(bytes, this.width);
        this.writeShort(bytes, this.height);
        bytes.push(0x00); // No local color table

        // LZW compressed data
        const minCodeSize = 8;
        bytes.push(minCodeSize);
        const compressed = this.lzwEncode(frame.indexed, minCodeSize);
        // Write in sub-blocks
        let offset = 0;
        while (offset < compressed.length) {
          const blockSize = Math.min(255, compressed.length - offset);
          bytes.push(blockSize);
          for (let i = 0; i < blockSize; i++) {
            bytes.push(compressed[offset + i]);
          }
          offset += blockSize;
        }
        bytes.push(0x00); // Block terminator
      }

      // Trailer
      bytes.push(0x3B);

      return new Uint8Array(bytes);
    }

    lzwEncode(indexed, minCodeSize) {
      const clearCode = 1 << minCodeSize;
      const eoiCode = clearCode + 1;
      let codeSize = minCodeSize + 1;
      let nextCode = eoiCode + 1;
      const codeTable = new Map();

      // Initialize code table
      for (let i = 0; i < clearCode; i++) {
        codeTable.set(String(i), i);
      }

      const output = [];
      let buffer = 0;
      let bufferLen = 0;

      const emit = (code) => {
        buffer |= (code << bufferLen);
        bufferLen += codeSize;
        while (bufferLen >= 8) {
          output.push(buffer & 0xFF);
          buffer >>= 8;
          bufferLen -= 8;
        }
      };

      emit(clearCode);
      let current = String(indexed[0]);

      for (let i = 1; i < indexed.length; i++) {
        const next = String(indexed[i]);
        const combined = current + ',' + next;

        if (codeTable.has(combined)) {
          current = combined;
        } else {
          emit(codeTable.get(current));
          if (nextCode < 4096) {
            codeTable.set(combined, nextCode++);
            if (nextCode > (1 << codeSize) && codeSize < 12) {
              codeSize++;
            }
          } else {
            emit(clearCode);
            codeTable.clear();
            for (let j = 0; j < clearCode; j++) {
              codeTable.set(String(j), j);
            }
            nextCode = eoiCode + 1;
            codeSize = minCodeSize + 1;
          }
          current = next;
        }
      }

      emit(codeTable.get(current) || 0);
      emit(eoiCode);

      if (bufferLen > 0) {
        output.push(buffer & 0xFF);
      }

      return output;
    }

    writeString(bytes, str) {
      for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
    }

    writeShort(bytes, val) {
      bytes.push(val & 0xFF, (val >> 8) & 0xFF);
    }
  }
  <\/script>
</head>
<body>
  <canvas id="canvas" width="${canvasW}" height="${canvasH}"></canvas>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const elements = ${JSON.stringify(elements)};
    const drawings = ${JSON.stringify(drawings)};
    const animDuration = ${animDuration};
    const fps = ${fps};
    const isGreen = ${isGreen};
    const isHalf = ${isHalf};
    const w = ${canvasW}, h = ${canvasH};

    function interpolate(el, t) {
      if (!el.keyframes || el.keyframes.length < 2) return { x: el.x, y: el.y };
      const first = el.keyframes[0];
      const last = el.keyframes[el.keyframes.length - 1];
      if (t <= first.t) return { x: first.x, y: first.y };
      if (t >= last.t) return { x: last.x, y: last.y };
      for (let i = 0; i < el.keyframes.length - 1; i++) {
        const k1 = el.keyframes[i], k2 = el.keyframes[i+1];
        if (t >= k1.t && t <= k2.t) {
          const p = (t - k1.t) / (k2.t - k1.t);
          const s = p * p * (3 - 2 * p);
          return { x: k1.x + (k2.x - k1.x) * s, y: k1.y + (k2.y - k1.y) * s };
        }
      }
      return { x: el.x, y: el.y };
    }

    function drawField() {
      if (isGreen) {
        const sh = h / 16;
        for (let i = 0; i < 16; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#2d8a4e' : '#35a05a';
          ctx.fillRect(0, i * sh, w, sh);
        }
      } else {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, w, h);
      }
      const lc = isGreen ? '#fff' : '#333';
      ctx.strokeStyle = lc; ctx.fillStyle = lc; ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, w, h);
      if (!isHalf) { ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke(); }
      const cy = isHalf ? h : h/2;
      ctx.beginPath(); ctx.arc(w/2, cy, 60, isHalf ? Math.PI : 0, isHalf ? 0 : Math.PI*2); ctx.stroke();
      ctx.strokeRect((w-264)/2, 0, 264, 108);
      ctx.strokeRect((w-120)/2, 0, 120, 36);
      if (!isHalf) {
        ctx.strokeRect((w-264)/2, h-108, 264, 108);
        ctx.strokeRect((w-120)/2, h-36, 120, 36);
      }
    }

    function drawEl(el, pos) {
      const x = pos.x, y = pos.y;
      switch(el.type) {
        case 'player-run': case 'player-stand': case 'player-pass':
          ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI*2);
          ctx.fillStyle = el.color; ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(el.number || '', x, y);
          break;
        case 'goalkeeper':
          ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI*2);
          ctx.fillStyle = el.color || '#f39c12'; ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('TW', x, y);
          break;
        case 'ball':
          ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
          break;
        case 'cone':
          ctx.beginPath(); ctx.moveTo(x, y-12); ctx.lineTo(x+8, y+4); ctx.lineTo(x-8, y+4); ctx.closePath();
          ctx.fillStyle = el.color || '#e67e22'; ctx.fill();
          break;
        case 'goal-large':
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x-25, y+8); ctx.lineTo(x-25, y-8);
          ctx.lineTo(x+25, y-8); ctx.lineTo(x+25, y+8); ctx.stroke();
          break;
        case 'goal-small':
          ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(x-15, y+6); ctx.lineTo(x-15, y-6);
          ctx.lineTo(x+15, y-6); ctx.lineTo(x+15, y+6); ctx.stroke();
          break;
      }
    }

    function drawDrawings() {
      drawings.forEach(d => {
        ctx.strokeStyle = d.color || '#fff';
        ctx.fillStyle = d.color || '#fff';
        ctx.lineWidth = d.width || 2.5;
        if (d.type === 'arrow') {
          ctx.beginPath(); ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2); ctx.stroke();
          const a = Math.atan2(d.y2-d.y1, d.x2-d.x1);
          ctx.beginPath(); ctx.moveTo(d.x2, d.y2);
          ctx.lineTo(d.x2-12*Math.cos(a-.4), d.y2-12*Math.sin(a-.4));
          ctx.lineTo(d.x2-12*Math.cos(a+.4), d.y2-12*Math.sin(a+.4));
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
    }

    function renderFrame(t) {
      ctx.clearRect(0, 0, w, h);
      drawField();
      drawDrawings();
      elements.forEach(el => {
        const st = el.startTime != null ? el.startTime : 0;
        const et = el.endTime != null ? el.endTime : -1;
        if (t < st) return;
        if (et >= 0 && t > et) return;
        const pos = interpolate(el, t);
        drawEl(el, pos);
      });
    }

    // Generate GIF
    async function generateGif() {
      const encoder = new GIFEncoder(w, h);
      encoder.setDelay(Math.round(1000 / fps));

      const totalFrames = Math.ceil(animDuration * fps);
      for (let i = 0; i <= totalFrames; i++) {
        const t = (i / totalFrames) * animDuration;
        renderFrame(t);
        encoder.addFrame(canvas);
      }

      const gifData = encoder.finish();
      // Convert to base64
      let binary = '';
      for (let i = 0; i < gifData.length; i++) {
        binary += String.fromCharCode(gifData[i]);
      }
      window.__gifData = btoa(binary);
      window.__gifDone = true;
    }

    generateGif();
  <\/script>
</body>
</html>`;
}
