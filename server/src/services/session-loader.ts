/**
 * Loads training sessions from the fusball research DB and converts them
 * to the same ParseResult format used by the training-plan-parser, so
 * placeElements() can generate visual field layouts.
 */

import Database from 'better-sqlite3';
import path from 'path';
import type { ElementType, ParseResult, ConceptData } from './training-plan-parser.js';

const DB_PATH = path.resolve('C:/gamedev/fusball/research/fusball_training.db');

// Equipment code -> ElementType mapping
const EQUIPMENT_MAP: Record<string, ElementType> = {
  CONES: 'cone',
  CONES_TALL: 'cone',
  MARKER_DISCS: 'cone',
  MINI_GOALS: 'goal-small',
  POPUP_GOALS: 'goal-small',
  SMALL_GOALS: 'goal-small',
  FULL_GOALS: 'goal-large',
  BALLS: 'ball',
  POLES: 'pole',
  LADDERS: 'ladder',
  MANNEQUINS: 'dummy',
  RINGS: 'ring',
  // BIBS, HURDLES, REBOUNDER — no matching ElementType, skip
};

// Phase type -> ConceptData category mapping
const PHASE_CATEGORY_MAP: Record<string, string> = {
  warmup: 'Aufwaermen',
  small_sided: 'Technik',
  expanded: 'Taktik',
  game: 'Spielform',
  cooldown: 'Auslaufen',
};

interface SessionRow {
  id: number;
  topic_de: string;
  topic_en: string;
  total_duration_min: number;
  intensity_level: string;
  age_code: string;
  age_name: string;
}

interface ActivityRow {
  activity_order: number;
  phase_type: string;
  duration_min: number;
  drill_id: number;
  name_de: string | null;
  name_en: string | null;
  description_de: string | null;
  description_en: string | null;
  player_count_min: number | null;
  player_count_max: number | null;
  field_length_m: number | null;
  field_width_m: number | null;
  format: string | null;
  difficulty: string | null;
}

function openDb(): Database.Database {
  return new Database(DB_PATH, { readonly: true });
}

export interface SessionSummary {
  id: number;
  topic_de: string;
  topic_en: string;
  total_duration_min: number;
  intensity_level: string;
  age_code: string;
  age_name: string;
  drill_count: number;
}

export function listSessions(): SessionSummary[] {
  const db = openDb();
  try {
    const rows = db.prepare(`
      SELECT ts.id, ts.topic_de, ts.topic_en, ts.total_duration_min,
             ts.intensity_level, ag.code AS age_code, ag.name_de AS age_name,
             (SELECT COUNT(*) FROM session_activities sa WHERE sa.session_id = ts.id) AS drill_count
      FROM training_sessions ts
      JOIN age_groups ag ON ag.id = ts.age_group_id
      ORDER BY ts.id
    `).all() as SessionSummary[];
    return rows;
  } finally {
    db.close();
  }
}

export function loadSessionAsExercises(sessionId: number): {
  session: SessionRow;
  exercises: ParseResult[];
} | null {
  const db = openDb();
  try {
    const session = db.prepare(`
      SELECT ts.id, ts.topic_de, ts.topic_en, ts.total_duration_min,
             ts.intensity_level, ag.code AS age_code, ag.name_de AS age_name
      FROM training_sessions ts
      JOIN age_groups ag ON ag.id = ts.age_group_id
      WHERE ts.id = ?
    `).get(sessionId) as SessionRow | undefined;

    if (!session) return null;

    const activities = db.prepare(`
      SELECT sa.activity_order, sa.phase_type, sa.duration_min,
             d.id AS drill_id, d.name_de, d.name_en,
             d.description_de, d.description_en,
             d.player_count_min, d.player_count_max,
             d.field_length_m, d.field_width_m,
             d.format, d.difficulty
      FROM session_activities sa
      JOIN drills d ON d.id = sa.drill_id
      WHERE sa.session_id = ?
      ORDER BY sa.activity_order
    `).all(sessionId) as ActivityRow[];

    const exercises = activities.map(act => activityToParseResult(db, act));

    return { session, exercises };
  } finally {
    db.close();
  }
}

function activityToParseResult(db: Database.Database, act: ActivityRow): ParseResult {
  const name = act.name_de || act.name_en || `Drill #${act.drill_id}`;
  const description = act.description_de || act.description_en || '';
  const category = PHASE_CATEGORY_MAP[act.phase_type] || 'Taktik';

  // Player count from format or drill metadata
  const playerCount = estimatePlayerCount(act);

  // Field size
  const fieldSize = (act.field_length_m && act.field_width_m)
    ? `${act.field_length_m}x${act.field_width_m}m`
    : '';

  // Coaching points
  const cpRows = db.prepare(
    'SELECT point_de, point_en FROM drill_coaching_points WHERE drill_id = ? ORDER BY sort_order'
  ).all(act.drill_id) as { point_de: string | null; point_en: string | null }[];
  const coachingPoints = cpRows
    .map(r => r.point_de || r.point_en || '')
    .filter(p => p.length > 0);

  // Variations
  const varRows = db.prepare(
    'SELECT description_de, description_en FROM drill_variations WHERE drill_id = ? ORDER BY sort_order'
  ).all(act.drill_id) as { description_de: string | null; description_en: string | null }[];
  const variations = varRows
    .map(r => r.description_de || r.description_en || '')
    .filter(v => v.length > 0);

  // Equipment -> materialCounts
  const eqRows = db.prepare(`
    SELECT e.code, de.quantity
    FROM drill_equipment de
    JOIN equipment e ON e.id = de.equipment_id
    WHERE de.drill_id = ?
  `).all(act.drill_id) as { code: string; quantity: number | null }[];

  const materialCounts = {} as Record<ElementType, number>;
  let hasLargeGoals = false;

  for (const eq of eqRows) {
    const elementType = EQUIPMENT_MAP[eq.code];
    if (!elementType) continue;
    const qty = eq.quantity || 1;
    materialCounts[elementType] = (materialCounts[elementType] || 0) + qty;
    if (elementType === 'goal-large') hasLargeGoals = true;
  }

  const concept: ConceptData = {
    name,
    category,
    duration: act.duration_min || 15,
    players: playerCount,
    fieldSize,
    description,
    coachingPoints: coachingPoints.length > 0 ? coachingPoints : [''],
    variations: variations.length > 0 ? variations : [''],
    phases: [{ id: 1, name: phaseName(act.phase_type), description: '' }],
  };

  return { concept, materialCounts, playerCount, hasLargeGoals };
}

function estimatePlayerCount(act: ActivityRow): number {
  // Try to extract from format (e.g., "4v4" -> 8, "3v3+3" -> 9)
  if (act.format) {
    const match = act.format.match(/^(\d+)v(\d+)(?:\+(\d+))?$/);
    if (match) {
      return parseInt(match[1]) + parseInt(match[2]) + (match[3] ? parseInt(match[3]) : 0);
    }
  }
  // From drill metadata
  if (act.player_count_min && act.player_count_max) {
    return Math.round((act.player_count_min + act.player_count_max) / 2);
  }
  if (act.player_count_min) return act.player_count_min;
  // Default by phase
  if (act.phase_type === 'warmup' || act.phase_type === 'cooldown') return 12;
  if (act.phase_type === 'small_sided') return 8;
  if (act.phase_type === 'game') return 16;
  return 12;
}

function phaseName(phaseType: string): string {
  const names: Record<string, string> = {
    warmup: 'Aufwaermen',
    small_sided: 'Kleinfeld',
    expanded: 'Erweitert',
    game: 'Spiel',
    cooldown: 'Abkuehlen',
  };
  return names[phaseType] || phaseType;
}
