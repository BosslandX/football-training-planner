export type ElementType =
  | 'player-run' | 'player-stand' | 'player-pass'
  | 'goalkeeper' | 'trainer' | 'dummy'
  | 'ball' | 'cone' | 'pole' | 'ladder' | 'flag' | 'ring'
  | 'goal-large' | 'goal-small' | 'goal-cone';

export type DrawingType = 'arrow' | 'dashed' | 'curved' | 'zone' | 'text';

export type ToolMode = 'select' | DrawingType;

export type FieldType = 'full-green' | 'full-white' | 'half-green' | 'half-white';

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

export const ELEMENT_TYPE_NAMES: Record<ElementType, string> = {
  'player-run': 'Spieler (Laufen)',
  'player-stand': 'Spieler (Stehen)',
  'player-pass': 'Spieler (Passen)',
  'goalkeeper': 'Torwart',
  'trainer': 'Trainer',
  'dummy': 'Dummy',
  'ball': 'Ball',
  'cone': 'Hütchen',
  'pole': 'Stange',
  'ladder': 'Leiter',
  'flag': 'Flagge',
  'ring': 'Ring',
  'goal-large': 'Großtor',
  'goal-small': 'Minitor',
  'goal-cone': 'Hütchentor',
};

export const TEAM_COLORS = [
  { name: 'Blau', value: '#3498db' },
  { name: 'Rot', value: '#e74c3c' },
  { name: 'Gelb', value: '#f1c40f' },
  { name: 'Grün', value: '#2ecc71' },
  { name: 'Orange', value: '#e67e22' },
  { name: 'Lila', value: '#9b59b6' },
  { name: 'Weiß', value: '#ecf0f1' },
  { name: 'Schwarz', value: '#2c3e50' },
];

export const DRAW_COLORS = [
  '#ffffff', '#f1c40f', '#e74c3c', '#3498db', '#2ecc71',
];

export const CATEGORIES = [
  'Aufwärmen', 'Technik', 'Taktik', 'Spielform',
  'Torschuss', 'Kondition', 'Auslaufen',
];
