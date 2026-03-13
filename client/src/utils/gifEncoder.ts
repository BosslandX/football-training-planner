/**
 * GIF89a encoder with median-cut quantization and Floyd-Steinberg dithering.
 * Produces much better quality than naive 4-bit color reduction.
 */

export function encodeGif(
  width: number,
  height: number,
  frames: ImageData[],
  delayMs: number
): Uint8Array {
  const bytes: number[] = [];

  // Build global palette from first frame using median-cut
  const palette = buildPalette(frames[0].data);

  // Header
  writeStr(bytes, 'GIF89a');

  // Logical Screen Descriptor
  writeShort(bytes, width);
  writeShort(bytes, height);
  bytes.push(0xF7); // GCT flag, 256 colors (8 bits)
  bytes.push(0);    // BG color index
  bytes.push(0);    // Pixel aspect ratio

  // Global Color Table (256 * 3 bytes)
  for (let i = 0; i < 256; i++) {
    bytes.push(palette[i][0], palette[i][1], palette[i][2]);
  }

  // Application Extension (NETSCAPE2.0 for looping)
  bytes.push(0x21, 0xFF, 0x0B);
  writeStr(bytes, 'NETSCAPE2.0');
  bytes.push(0x03, 0x01);
  writeShort(bytes, 0); // Loop forever
  bytes.push(0x00);

  const delayCentisec = Math.round(delayMs / 10);

  // Shared nearest-color cache across frames (same palette)
  const nearestCache = new Map<number, number>();

  for (const frame of frames) {
    // Quantize each frame against the SAME global palette with dithering
    const indexed = ditherFrame(frame.data, width, height, palette, nearestCache);

    // Graphic Control Extension
    bytes.push(0x21, 0xF9, 0x04);
    bytes.push(0x00); // Disposal method: none
    writeShort(bytes, delayCentisec);
    bytes.push(0x00); // No transparent color
    bytes.push(0x00); // Block terminator

    // Image Descriptor
    bytes.push(0x2C);
    writeShort(bytes, 0); // x
    writeShort(bytes, 0); // y
    writeShort(bytes, width);
    writeShort(bytes, height);
    bytes.push(0x00); // No local color table (use global)

    // LZW compressed data
    const minCodeSize = 8;
    bytes.push(minCodeSize);
    const compressed = lzwEncode(indexed, minCodeSize);

    // Write in sub-blocks (max 255 bytes each)
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

  bytes.push(0x3B); // Trailer
  return new Uint8Array(bytes);
}

// ---------- Median-Cut Palette Generation ----------

interface ColorEntry {
  r: number;
  g: number;
  b: number;
  count: number;
}

interface ColorBox {
  colors: ColorEntry[];
  rMin: number; rMax: number;
  gMin: number; gMax: number;
  bMin: number; bMax: number;
}

/** Build optimal 256-color palette using median-cut */
function buildPalette(pixels: Uint8ClampedArray): [number, number, number][] {
  // Group similar colors (6 bits per channel for dedup: max 262144 groups)
  const groups = new Map<number, ColorEntry>();

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);

    const existing = groups.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count++;
    } else {
      groups.set(key, { r, g, b, count: 1 });
    }
  }

  // Average the accumulated colors
  const colors: ColorEntry[] = [];
  for (const c of groups.values()) {
    colors.push({
      r: Math.round(c.r / c.count),
      g: Math.round(c.g / c.count),
      b: Math.round(c.b / c.count),
      count: c.count,
    });
  }

  // If few enough unique colors, use them directly
  if (colors.length <= 256) {
    const palette: [number, number, number][] = colors.map(c => [c.r, c.g, c.b]);
    while (palette.length < 256) palette.push([0, 0, 0]);
    return palette;
  }

  // Median-cut: repeatedly split the largest box
  const boxes: ColorBox[] = [makeBox(colors)];

  while (boxes.length < 256) {
    // Find box with widest color range
    let bestIdx = -1;
    let bestRange = -1;

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.colors.length < 2) continue;
      const range = Math.max(
        box.rMax - box.rMin,
        box.gMax - box.gMin,
        box.bMax - box.bMin
      );
      if (range > bestRange) {
        bestRange = range;
        bestIdx = i;
      }
    }

    if (bestIdx === -1 || bestRange <= 0) break;

    const box = boxes[bestIdx];
    const rRange = box.rMax - box.rMin;
    const gRange = box.gMax - box.gMin;
    const bRange = box.bMax - box.bMin;

    // Sort along widest channel
    if (rRange >= gRange && rRange >= bRange) {
      box.colors.sort((a, b) => a.r - b.r);
    } else if (gRange >= bRange) {
      box.colors.sort((a, b) => a.g - b.g);
    } else {
      box.colors.sort((a, b) => a.b - b.b);
    }

    // Split at weighted median (by pixel count)
    let totalCount = 0;
    for (const c of box.colors) totalCount += c.count;
    let cumCount = 0;
    let splitIdx = 1;
    for (let i = 0; i < box.colors.length; i++) {
      cumCount += box.colors[i].count;
      if (cumCount >= totalCount / 2) {
        splitIdx = Math.max(1, Math.min(box.colors.length - 1, i + 1));
        break;
      }
    }

    boxes[bestIdx] = makeBox(box.colors.slice(0, splitIdx));
    boxes.push(makeBox(box.colors.slice(splitIdx)));
  }

  // Each box's weighted centroid becomes a palette color
  const palette: [number, number, number][] = boxes.map(box => {
    let rSum = 0, gSum = 0, bSum = 0, total = 0;
    for (const c of box.colors) {
      rSum += c.r * c.count;
      gSum += c.g * c.count;
      bSum += c.b * c.count;
      total += c.count;
    }
    return [
      Math.round(rSum / total),
      Math.round(gSum / total),
      Math.round(bSum / total),
    ] as [number, number, number];
  });

  while (palette.length < 256) palette.push([0, 0, 0]);
  return palette;
}

function makeBox(colors: ColorEntry[]): ColorBox {
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  for (const c of colors) {
    if (c.r < rMin) rMin = c.r;
    if (c.r > rMax) rMax = c.r;
    if (c.g < gMin) gMin = c.g;
    if (c.g > gMax) gMax = c.g;
    if (c.b < bMin) bMin = c.b;
    if (c.b > bMax) bMax = c.b;
  }
  return { colors, rMin, rMax, gMin, gMax, bMin, bMax };
}

// ---------- Nearest Color Lookup ----------

/** Find nearest palette color using perceptual distance with cache */
function findNearest(
  r: number, g: number, b: number,
  palette: [number, number, number][],
  cache: Map<number, number>
): number {
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  const key = (r << 16) | (g << 8) | b;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let bestDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < 256; i++) {
    const dr = r - palette[i][0];
    const dg = g - palette[i][1];
    const db = b - palette[i][2];
    // Perceptual weighting (green most important for human vision)
    const dist = dr * dr * 2 + dg * dg * 4 + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
      if (dist === 0) break;
    }
  }

  cache.set(key, bestIdx);
  return bestIdx;
}

// ---------- Floyd-Steinberg Dithering ----------

/** Map frame pixels to palette indices with Floyd-Steinberg error diffusion */
function ditherFrame(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  palette: [number, number, number][],
  cache: Map<number, number>
): Uint8Array {
  const size = width * height;
  // Float buffers for error accumulation
  const rBuf = new Float32Array(size);
  const gBuf = new Float32Array(size);
  const bBuf = new Float32Array(size);

  for (let i = 0; i < size; i++) {
    rBuf[i] = pixels[i * 4];
    gBuf[i] = pixels[i * 4 + 1];
    bBuf[i] = pixels[i * 4 + 2];
  }

  const indexed = new Uint8Array(size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // Clamp to valid range
      const cr = Math.round(Math.max(0, Math.min(255, rBuf[idx])));
      const cg = Math.round(Math.max(0, Math.min(255, gBuf[idx])));
      const cb = Math.round(Math.max(0, Math.min(255, bBuf[idx])));

      const palIdx = findNearest(cr, cg, cb, palette, cache);
      indexed[idx] = palIdx;

      // Quantization error
      const er = cr - palette[palIdx][0];
      const eg = cg - palette[palIdx][1];
      const eb = cb - palette[palIdx][2];

      // Distribute error to neighbors (Floyd-Steinberg pattern)
      //        * 7/16
      // 3/16 5/16 1/16
      if (x + 1 < width) {
        const ni = idx + 1;
        rBuf[ni] += er * 7 / 16;
        gBuf[ni] += eg * 7 / 16;
        bBuf[ni] += eb * 7 / 16;
      }
      if (y + 1 < height) {
        if (x > 0) {
          const ni = idx + width - 1;
          rBuf[ni] += er * 3 / 16;
          gBuf[ni] += eg * 3 / 16;
          bBuf[ni] += eb * 3 / 16;
        }
        const ni = idx + width;
        rBuf[ni] += er * 5 / 16;
        gBuf[ni] += eg * 5 / 16;
        bBuf[ni] += eb * 5 / 16;
        if (x + 1 < width) {
          const ni2 = idx + width + 1;
          rBuf[ni2] += er / 16;
          gBuf[ni2] += eg / 16;
          bBuf[ni2] += eb / 16;
        }
      }
    }
  }

  return indexed;
}

// ---------- LZW Compression ----------

function lzwEncode(indexed: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const codeTable = new Map<string, number>();

  for (let i = 0; i < clearCode; i++) {
    codeTable.set(String(i), i);
  }

  const output: number[] = [];
  let buffer = 0;
  let bufferLen = 0;

  const emit = (code: number) => {
    buffer |= code << bufferLen;
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
      emit(codeTable.get(current)!);
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

  emit(codeTable.get(current) ?? 0);
  emit(eoiCode);

  if (bufferLen > 0) {
    output.push(buffer & 0xFF);
  }

  return output;
}

// ---------- Helpers ----------

function writeStr(bytes: number[], str: string) {
  for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
}

function writeShort(bytes: number[], val: number) {
  bytes.push(val & 0xFF, (val >> 8) & 0xFF);
}
