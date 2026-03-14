import { t } from '../i18n';

export type ElementType =
  | 'player-run' | 'player-stand' | 'player-pass'
  | 'goalkeeper' | 'trainer' | 'dummy'
  | 'ball' | 'cone' | 'pole' | 'ladder' | 'flag' | 'ring'
  | 'goal-large' | 'goal-small' | 'goal-cone';

export type DrawingType = 'arrow' | 'dashed' | 'curved' | 'zone' | 'text';

export type ToolMode = 'select' | DrawingType;

export type FieldType =
  | 'full-green' | 'full-white' | 'half-green' | 'half-white'
  | 'full-green-land' | 'full-white-land' | 'half-green-land' | 'half-white-land';

export interface Keyframe {
  t: number;
  x: number;
  y: number;
  rotation: number;
}

export interface FieldElement {
  id: number;
  type: ElementType;
  x: number;
  y: number;
  color: string;
  rotation: number;
  number: string;
  label: string;
  keyframes: Keyframe[];
  startTime: number;
  endTime: number;
  scale?: 1 | 2 | 3;
}

export interface Drawing {
  id: number;
  type: DrawingType;
  color: string;
  width: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points?: { x: number; y: number }[];
  text?: string;
  label?: string;
  startTime?: number;
  endTime?: number;
}

export interface Phase {
  id: number;
  name: string;
  description: string;
}

export interface ConceptData {
  name: string;
  category: string;
  duration: number;
  players: number;
  fieldSize: string;
  description: string;
  coachingPoints: string[];
  variations: string[];
  phases: Phase[];
}

// ---- Element type names (i18n) ----

const ELEMENT_TYPE_KEYS: Record<ElementType, string> = {
  'player-run': 'elementTypes.playerRun',
  'player-stand': 'elementTypes.playerStand',
  'player-pass': 'elementTypes.playerPass',
  'goalkeeper': 'elementTypes.goalkeeper',
  'trainer': 'elementTypes.trainer',
  'dummy': 'elementTypes.dummy',
  'ball': 'elementTypes.ball',
  'cone': 'elementTypes.cone',
  'pole': 'elementTypes.pole',
  'ladder': 'elementTypes.ladder',
  'flag': 'elementTypes.flag',
  'ring': 'elementTypes.ring',
  'goal-large': 'elementTypes.goalLarge',
  'goal-small': 'elementTypes.goalSmall',
  'goal-cone': 'elementTypes.goalCone',
};

export function getElementTypeName(type: ElementType): string {
  return t(ELEMENT_TYPE_KEYS[type]);
}

// ---- Team colors (i18n) ----

export const TEAM_COLORS: { nameKey: string; value: string }[] = [
  { nameKey: 'colors.blue', value: '#3498db' },
  { nameKey: 'colors.red', value: '#e74c3c' },
  { nameKey: 'colors.yellow', value: '#f1c40f' },
  { nameKey: 'colors.green', value: '#2ecc71' },
  { nameKey: 'colors.orange', value: '#e67e22' },
  { nameKey: 'colors.purple', value: '#9b59b6' },
  { nameKey: 'colors.white', value: '#ecf0f1' },
  { nameKey: 'colors.black', value: '#2c3e50' },
];

export const DRAW_COLORS = [
  '#ffffff', '#f1c40f', '#e74c3c', '#3498db', '#2ecc71',
];

export interface Exercise {
  concept: ConceptData;
  elements: FieldElement[];
  drawings: Drawing[];
  fieldType: FieldType;
}

export interface ExerciseImportData {
  concept: ConceptData;
  elements: Omit<FieldElement, 'id'>[];
  fieldType: string;
}

export interface ImportResult {
  exercises: ExerciseImportData[];
}

// ---- Categories (i18n) ----

export const CATEGORY_KEYS = [
  'categories.warmup', 'categories.technique', 'categories.tactics', 'categories.gameForm',
  'categories.shooting', 'categories.fitness', 'categories.cooldown',
];

/** Map legacy German category strings to i18n keys */
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'Aufwärmen': 'categories.warmup',
  'Technik': 'categories.technique',
  'Taktik': 'categories.tactics',
  'Spielform': 'categories.gameForm',
  'Torschuss': 'categories.shooting',
  'Kondition': 'categories.fitness',
  'Auslaufen': 'categories.cooldown',
};

/** Convert a possibly-legacy category string to an i18n key */
export function normalizeCategoryKey(raw: string): string {
  if (CATEGORY_KEYS.includes(raw)) return raw;
  return LEGACY_CATEGORY_MAP[raw] ?? raw;
}
