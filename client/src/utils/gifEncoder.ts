/**
 * Minimal GIF89a encoder for animation frames.
 * Encodes ImageData frames into an animated GIF.
 */
export function encodeGif(
  width: number,
  height: number,
  frames: ImageData[],
  delayMs: number
): Uint8Array {
  const bytes: number[] = [];

  // Header
  writeStr(bytes, 'GIF89a');

  // Logical Screen Descriptor
  writeShort(bytes, width);
  writeShort(bytes, height);
  bytes.push(0xF7); // GCT flag, 256 colors (8 bits)
  bytes.push(0);    // BG color
  bytes.push(0);    // Pixel aspect ratio

  // Build global palette from first frame
  const firstQuantized = quantize(frames[0].data, width, height);

  // Global Color Table
  for (let i = 0; i < 256; i++) {
    bytes.push(firstQuantized.palette[i][0], firstQuantized.palette[i][1], firstQuantized.palette[i][2]);
  }

  // Application Extension (NETSCAPE2.0 for looping)
  bytes.push(0x21, 0xFF, 0x0B);
  writeStr(bytes, 'NETSCAPE2.0');
  bytes.push(0x03, 0x01);
  writeShort(bytes, 0); // Loop forever
  bytes.push(0x00);

  const delayCentisec = Math.round(delayMs / 10);

  for (const frame of frames) {
    const q = quantize(frame.data, width, height);

    // Graphic Control Extension
    bytes.push(0x21, 0xF9, 0x04);
    bytes.push(0x00); // Disposal method
    writeShort(bytes, delayCentisec);
    bytes.push(0x00); // No transparent color
    bytes.push(0x00); // Block terminator

    // Image Descriptor
    bytes.push(0x2C);
    writeShort(bytes, 0); // x
    writeShort(bytes, 0); // y
    writeShort(bytes, width);
    writeShort(bytes, height);
    bytes.push(0x00); // No local color table

    // LZW compressed data
    const minCodeSize = 8;
    bytes.push(minCodeSize);
    const compressed = lzwEncode(q.indexed, minCodeSize);

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

  // Trailer
  bytes.push(0x3B);

  return new Uint8Array(bytes);
}

function quantize(pixels: Uint8ClampedArray, width: number, height: number) {
  const colorMap = new Map<number, number>();
  const palette: [number, number, number][] = [];
  const indexed = new Uint8Array(width * height);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] >> 4;
    const g = pixels[i + 1] >> 4;
    const b = pixels[i + 2] >> 4;
    const key = (r << 8) | (g << 4) | b;

    if (!colorMap.has(key) && palette.length < 256) {
      colorMap.set(key, palette.length);
      palette.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
    }
  }

  while (palette.length < 256) palette.push([0, 0, 0]);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] >> 4;
    const g = pixels[i + 1] >> 4;
    const b = pixels[i + 2] >> 4;
    const key = (r << 8) | (g << 4) | b;
    indexed[i / 4] = colorMap.get(key) ?? 0;
  }

  return { palette, indexed };
}

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

function writeStr(bytes: number[], str: string) {
  for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
}

function writeShort(bytes: number[], val: number) {
  bytes.push(val & 0xFF, (val >> 8) & 0xFF);
}
