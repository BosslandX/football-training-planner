import type { ElementType, ParseResult } from './training-plan-parser.js';

export interface PlacedElement {
  type: ElementType;
  x: number;
  y: number;
  color: string;
  rotation: number;
  number: string;
  label: string;
  keyframes: never[];
}

// Field dimensions (matching client canvas)
const FIELD_W = 800;
const FIELD_H = 600;
const CX = FIELD_W / 2;
const CY = FIELD_H / 2;
const MARGIN = 40;

const TEAM_BLUE = '#3498db';
const TEAM_RED = '#e74c3c';
const DEFAULT_COLOR = '#2c3e50';

function placePlayers(count: number): PlacedElement[] {
  const elements: PlacedElement[] = [];
  const half = Math.ceil(count / 2);
  const otherHalf = count - half;

  // Blue team - top half
  const blueRows = Math.ceil(half / 4);
  let blueIdx = 0;
  for (let row = 0; row < blueRows && blueIdx < half; row++) {
    const inRow = Math.min(4, half - blueIdx);
    const y = 120 + row * 70;
    const startX = CX - ((inRow - 1) * 100) / 2;
    for (let col = 0; col < inRow; col++) {
      blueIdx++;
      elements.push({
        type: 'player-stand',
        x: startX + col * 100,
        y,
        color: TEAM_BLUE,
        rotation: 0,
        number: String(blueIdx),
        label: '',
        keyframes: [],
      });
    }
  }

  // Red team - bottom half
  const redRows = Math.ceil(otherHalf / 4);
  let redIdx = 0;
  for (let row = 0; row < redRows && redIdx < otherHalf; row++) {
    const inRow = Math.min(4, otherHalf - redIdx);
    const y = FIELD_H - 120 - row * 70;
    const startX = CX - ((inRow - 1) * 100) / 2;
    for (let col = 0; col < inRow; col++) {
      redIdx++;
      elements.push({
        type: 'player-stand',
        x: startX + col * 100,
        y,
        color: TEAM_RED,
        rotation: 0,
        number: String(redIdx),
        label: '',
        keyframes: [],
      });
    }
  }

  return elements;
}

function placeLargeGoals(count: number): PlacedElement[] {
  const elements: PlacedElement[] = [];
  if (count >= 1) {
    // Top center
    elements.push({
      type: 'goal-large',
      x: CX,
      y: MARGIN,
      color: DEFAULT_COLOR,
      rotation: 0,
      number: '',
      label: '',
      keyframes: [],
    });
  }
  if (count >= 2) {
    // Bottom center
    elements.push({
      type: 'goal-large',
      x: CX,
      y: FIELD_H - MARGIN,
      color: DEFAULT_COLOR,
      rotation: 180,
      number: '',
      label: '',
      keyframes: [],
    });
  }
  return elements;
}

function placeSmallGoals(count: number): PlacedElement[] {
  const elements: PlacedElement[] = [];
  const positions = [
    { x: CX - 120, y: MARGIN + 10 },
    { x: CX + 120, y: MARGIN + 10 },
    { x: CX - 120, y: FIELD_H - MARGIN - 10 },
    { x: CX + 120, y: FIELD_H - MARGIN - 10 },
    { x: MARGIN + 10, y: CY },
    { x: FIELD_W - MARGIN - 10, y: CY },
  ];

  for (let i = 0; i < Math.min(count, positions.length); i++) {
    const rot = positions[i].y < CY ? 0 : positions[i].y > CY ? 180 : positions[i].x < CX ? 90 : 270;
    elements.push({
      type: 'goal-small',
      x: positions[i].x,
      y: positions[i].y,
      color: DEFAULT_COLOR,
      rotation: rot,
      number: '',
      label: '',
      keyframes: [],
    });
  }
  return elements;
}

function placeCones(count: number): PlacedElement[] {
  const elements: PlacedElement[] = [];

  if (count <= 4) {
    // Corner markers
    const corners = [
      { x: MARGIN + 60, y: MARGIN + 60 },
      { x: FIELD_W - MARGIN - 60, y: MARGIN + 60 },
      { x: MARGIN + 60, y: FIELD_H - MARGIN - 60 },
      { x: FIELD_W - MARGIN - 60, y: FIELD_H - MARGIN - 60 },
    ];
    for (let i = 0; i < Math.min(count, 4); i++) {
      elements.push({
        type: 'cone',
        x: corners[i].x,
        y: corners[i].y,
        color: '#f39c12',
        rotation: 0,
        number: '',
        label: '',
        keyframes: [],
      });
    }
  } else {
    // Distribute along perimeter
    const perimeter: { x: number; y: number }[] = [];
    const inset = 70;
    const steps = count;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      if (t < 0.25) {
        // Top edge
        const p = t / 0.25;
        perimeter.push({ x: inset + p * (FIELD_W - 2 * inset), y: inset });
      } else if (t < 0.5) {
        // Right edge
        const p = (t - 0.25) / 0.25;
        perimeter.push({ x: FIELD_W - inset, y: inset + p * (FIELD_H - 2 * inset) });
      } else if (t < 0.75) {
        // Bottom edge
        const p = (t - 0.5) / 0.25;
        perimeter.push({ x: FIELD_W - inset - p * (FIELD_W - 2 * inset), y: FIELD_H - inset });
      } else {
        // Left edge
        const p = (t - 0.75) / 0.25;
        perimeter.push({ x: inset, y: FIELD_H - inset - p * (FIELD_H - 2 * inset) });
      }
    }
    for (const pos of perimeter) {
      elements.push({
        type: 'cone',
        x: pos.x,
        y: pos.y,
        color: '#f39c12',
        rotation: 0,
        number: '',
        label: '',
        keyframes: [],
      });
    }
  }

  return elements;
}

function placeBalls(count: number): PlacedElement[] {
  const elements: PlacedElement[] = [];
  const radius = 40;

  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    elements.push({
      type: 'ball',
      x: CX + Math.cos(angle) * radius,
      y: CY + Math.sin(angle) * radius,
      color: DEFAULT_COLOR,
      rotation: 0,
      number: '',
      label: '',
      keyframes: [],
    });
  }
  return elements;
}

function placeGeneric(type: ElementType, count: number): PlacedElement[] {
  const elements: PlacedElement[] = [];
  // Place in a line near the center
  const startX = CX - ((count - 1) * 50) / 2;
  for (let i = 0; i < count; i++) {
    elements.push({
      type,
      x: startX + i * 50,
      y: CY,
      color: DEFAULT_COLOR,
      rotation: 0,
      number: '',
      label: '',
      keyframes: [],
    });
  }
  return elements;
}

export function placeElements(parseResult: ParseResult): { elements: PlacedElement[]; fieldType: string } {
  const { materialCounts, playerCount, hasLargeGoals } = parseResult;
  const elements: PlacedElement[] = [];

  // Determine field type
  const fieldType = (playerCount >= 14 || hasLargeGoals) ? 'full-green' : 'half-green';

  // Cap material counts to avoid overcrowding (use representative amounts)
  const cappedCounts: Record<string, number> = {};
  const CAPS: Record<string, number> = {
    'cone': 12,
    'ball': 6,
    'goal-small': 4,
    'goal-large': 2,
    'pole': 6,
    'ladder': 4,
    'dummy': 4,
  };
  for (const [type, count] of Object.entries(materialCounts)) {
    cappedCounts[type] = Math.min(count, CAPS[type] ?? count);
  }

  // Place players
  elements.push(...placePlayers(playerCount));

  // Place goals
  if (cappedCounts['goal-large']) {
    elements.push(...placeLargeGoals(cappedCounts['goal-large']));
  }
  if (cappedCounts['goal-small']) {
    elements.push(...placeSmallGoals(cappedCounts['goal-small']));
  }

  // Place cones
  if (cappedCounts['cone']) {
    elements.push(...placeCones(cappedCounts['cone']));
  }

  // Place balls
  if (cappedCounts['ball']) {
    elements.push(...placeBalls(cappedCounts['ball']));
  }

  // Place other equipment
  const handled: ElementType[] = ['goal-large', 'goal-small', 'cone', 'ball', 'player-stand', 'player-run', 'player-pass'];
  for (const [type, count] of Object.entries(cappedCounts)) {
    if (!handled.includes(type as ElementType) && count > 0) {
      elements.push(...placeGeneric(type as ElementType, count));
    }
  }

  return { elements, fieldType };
}
