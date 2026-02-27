import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export type ElementType =
  | 'player-run' | 'player-stand' | 'player-pass'
  | 'goalkeeper' | 'trainer' | 'dummy'
  | 'ball' | 'cone' | 'pole' | 'ladder' | 'flag' | 'ring'
  | 'goal-large' | 'goal-small' | 'goal-cone';

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

export interface ParseResult {
  concept: ConceptData;
  materialCounts: Record<ElementType, number>;
  playerCount: number;
  hasLargeGoals: boolean;
}

// Material text → ElementType mapping
const MATERIAL_MAP: [RegExp, ElementType][] = [
  [/h[üu]tchen|pylonen?|kegel/i, 'cone'],
  [/b[äa]lle?\b/i, 'ball'],
  [/kleinfeldtor|minitor/i, 'goal-small'],
  [/gro[ßs]feldtor|gro[ßs]tor|jugendtor/i, 'goal-large'],
  [/stange/i, 'pole'],
  [/leiter/i, 'ladder'],
  [/dummy/i, 'dummy'],
];

const SKIP_MATERIALS = /leibchen|markierungshemd/i;

interface Section {
  name: string;
  lines: string[];
}

/** Strip bullet prefixes like "• ", "- ", "* " */
function stripBullet(s: string): string {
  return s.replace(/^[•\-–*]\s*/, '');
}

function extractText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

const PHASE_PATTERNS = [
  /^Erw[äa]rmung/i,
  /^Hauptteil\s*I/i,
  /^Hauptteil/i,
  /^Abschlussspiel/i,
  /^Aufw[äa]rmen/i,
  /^Cool[\s-]?Down/i,
  /^Auslaufen/i,
  /^Schlussteil/i,
];

// Title headers that aren't actual phases
const TITLE_PATTERNS = /^(TRAININGSPLANUNG|TRAINING|ÜBERSICHT)\s*$/i;

function detectSections(text: string): Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [];
  let current: Section = { name: 'Allgemein', lines: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      current.lines.push('');
      continue;
    }

    let isHeader = false;

    // Known phase patterns
    for (const pat of PHASE_PATTERNS) {
      if (pat.test(trimmed)) {
        isHeader = true;
        break;
      }
    }

    // ALL-CAPS line with 3+ alpha chars (likely a header) — but not title-only headers
    if (!isHeader && trimmed.length >= 3 && trimmed === trimmed.toUpperCase() && /[A-ZÄÖÜ]/.test(trimmed)) {
      isHeader = true;
    }

    if (isHeader) {
      if (current.lines.filter(l => l.trim()).length > 0 || current.name !== 'Allgemein') {
        sections.push(current);
      }
      current = { name: trimmed, lines: [] };
    } else {
      current.lines.push(trimmed);
    }
  }

  if (current.lines.filter(l => l.trim()).length > 0 || sections.length === 0) {
    sections.push(current);
  }

  return sections;
}

function extractDuration(text: string): number {
  // Sum all "Dauer: X Minuten" occurrences
  const allDurations = [...text.matchAll(/Dauer[:\s]*(\d+)\s*(?:min(?:uten)?)/gi)];
  if (allDurations.length > 0) {
    return allDurations.reduce((sum, m) => sum + parseInt(m[1]), 0);
  }

  // Fallback: single "X Minuten" pattern
  const minMatch = text.match(/(\d+)\s*(?:Minuten|min)\b/i);
  if (minMatch) return parseInt(minMatch[1]);

  return 15;
}

function extractPlayerCount(text: string): number {
  // Try "Anzahl Spieler: X" or "X Spieler"
  const match = text.match(/Anzahl\s*Spieler[*\w]*[:\s]*(\d+)/i);
  if (match) return parseInt(match[1]);

  const match2 = text.match(/(\d+)\s*Spieler/i);
  if (match2) return parseInt(match2[1]);

  return 16;
}

function extractFieldSize(text: string): string {
  // Collect all field sizes mentioned
  const sizes = [...text.matchAll(/(\d+\s*x\s*\d+\s*m)/gi)];
  if (sizes.length > 0) {
    // Return the largest one
    return sizes.map(m => m[1]).sort((a, b) => {
      const [aw, ah] = a.match(/\d+/g)!.map(Number);
      const [bw, bh] = b.match(/\d+/g)!.map(Number);
      return (bw * bh) - (aw * ah);
    })[0];
  }
  return '';
}

function extractMaterial(text: string): Record<ElementType, number> {
  const counts: Record<string, number> = {};
  const lines = text.split('\n');

  // Find all "Material:" lines (possibly with bullet prefix)
  for (const line of lines) {
    const trimmed = stripBullet(line.trim());
    if (!/^Material[:\s]/i.test(trimmed)) continue;

    const after = trimmed.replace(/^Material[:\s]*/i, '');
    if (!after) continue;

    // Split by comma and parse each item
    const items = after.split(/[,;]/);
    for (const item of items) {
      const clean = item.trim();
      if (!clean || SKIP_MATERIALS.test(clean)) continue;

      for (const [pattern, elementType] of MATERIAL_MAP) {
        if (pattern.test(clean)) {
          const countMatch = clean.match(/(\d+)/);
          const count = countMatch ? parseInt(countMatch[1]) : 1;
          counts[elementType] = (counts[elementType] || 0) + count;
          break;
        }
      }
    }
  }

  return counts as Record<ElementType, number>;
}

function extractCoachingPoints(text: string): string[] {
  const points: string[] = [];
  const lines = text.split('\n');

  let inCoaching = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const stripped = stripBullet(trimmed);

    // Detect coaching section header
    if (/^Coaching[\s-]?punkte/i.test(stripped) || /^Coaching[\s-]?Hinweise/i.test(stripped)) {
      inCoaching = true;
      continue;
    }

    if (inCoaching) {
      if (trimmed === '') continue;

      // End on next major section header (not a bullet)
      const strippedCheck = stripBullet(trimmed);
      if (
        !trimmed.startsWith('•') && !trimmed.startsWith('-') && !trimmed.startsWith('"') && !trimmed.startsWith('„') &&
        /^[A-ZÄÖÜ][a-zäöü]+/.test(strippedCheck) &&
        !/^["„"]/.test(strippedCheck)
      ) {
        // Check if this looks like a section header (short, no colon needed for known patterns)
        if (PHASE_PATTERNS.some(p => p.test(strippedCheck)) || (strippedCheck === strippedCheck.toUpperCase() && strippedCheck.length >= 3)) {
          inCoaching = false;
          continue;
        }
      }

      // Extract the coaching point
      const cleaned = stripped
        .replace(/^["„"]\s*/, '')
        .replace(/[""!]*\s*$/, '')
        .trim();

      // Skip lines that look like organisation metadata or legends
      if (/^(Dauer|Aufbau|Teams|Material|Organisation|Legende|Laufweg|Dribbling|Schuss|Angreifer|Verteidiger|Ball)[:\s]/i.test(cleaned)) {
        inCoaching = false;
        continue;
      }

      if (cleaned.length > 5) {
        points.push(cleaned);
      }
    }
  }

  return points.length > 0 ? points : [''];
}

function extractVariations(text: string): string[] {
  const variations: string[] = [];
  const lines = text.split('\n');

  let inVariation = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const stripped = stripBullet(trimmed);

    if (/^Variation(?:en)?[:\s]/i.test(stripped)) {
      inVariation = true;
      const after = stripped.replace(/^Variation(?:en)?[:\s]*/i, '');
      if (after) variations.push(after);
      continue;
    }

    // Also catch inline variations like "Variation 1:" / "Variation 2:"
    const inlineMatch = stripped.match(/^Variation\s*\d+[:\s]\s*(.*)/i);
    if (inlineMatch && inlineMatch[1]) {
      variations.push(inlineMatch[1]);
      continue;
    }

    if (inVariation) {
      if (trimmed === '') continue;
      if (/^[A-ZÄÖÜ][a-zäöü]*[:\s]/.test(stripped) && !/^[-–•]/.test(trimmed)) {
        inVariation = false;
        continue;
      }
      const cleaned = stripped.replace(/^[-–•*]\s*/, '');
      if (cleaned.length > 2) {
        variations.push(cleaned);
      }
    }
  }

  return variations.length > 0 ? variations : [''];
}

function extractDescription(text: string): string {
  const lines = text.split('\n');
  let inDescription = false;
  const descLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const stripped = stripBullet(trimmed);

    if (/^(?:Inhalt und Methodik|Ablauf|Beschreibung)[:\s]*/i.test(stripped)) {
      inDescription = true;
      const after = stripped.replace(/^(?:Inhalt und Methodik|Ablauf|Beschreibung)[:\s]*/i, '');
      if (after) descLines.push(after);
      continue;
    }

    if (inDescription) {
      // End on known section headers
      if (/^(?:Coaching|Variation|Organisation|Material)[:\s]*/i.test(stripped)) {
        inDescription = false;
        continue;
      }
      // End on phase headers
      if (PHASE_PATTERNS.some(p => p.test(trimmed)) || (trimmed === trimmed.toUpperCase() && trimmed.length >= 3 && /[A-ZÄÖÜ]/.test(trimmed))) {
        inDescription = false;
        continue;
      }
      if (trimmed) {
        descLines.push(stripped);
      }
    }
  }

  return descLines.join('\n');
}

function extractName(text: string, filename: string): string {
  const lines = text.split('\n');

  // Try to find "Thema:" line
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^Thema[:\s]/i.test(trimmed)) {
      const name = trimmed.replace(/^Thema[:\s]*/i, '').trim();
      if (name) return name;
      // Name might be on the next non-empty line
      const nextIdx = lines.indexOf(line) + 1;
      for (let i = nextIdx; i < lines.length; i++) {
        const next = lines[i].trim();
        if (next) return next;
      }
    }
  }

  // Try first non-empty line
  const firstLine = lines.find(l => l.trim())?.trim();
  if (firstLine && firstLine.length < 100 && !TITLE_PATTERNS.test(firstLine)) {
    return firstLine;
  }

  // Fallback to filename
  return filename.replace(/\.(docx|pdf)$/i, '').replace(/[_-]/g, ' ');
}

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/aufwärmen|erwärmung/.test(lower)) return 'Aufwärmen';
  if (/technik/.test(lower)) return 'Technik';
  if (/taktik/.test(lower)) return 'Taktik';
  if (/spielform|abschlussspiel/.test(lower)) return 'Spielform';
  if (/torschuss/.test(lower)) return 'Torschuss';
  if (/kondition/.test(lower)) return 'Kondition';
  if (/auslaufen|cool[\s-]?down/.test(lower)) return 'Auslaufen';
  return 'Taktik';
}

function buildPhases(sections: Section[]): Phase[] {
  // Filter out title-only sections and empty ones
  const meaningful = sections.filter(s => {
    if (TITLE_PATTERNS.test(s.name)) return false;
    return s.lines.filter(l => l.trim()).length > 0;
  });

  if (meaningful.length === 0) {
    return [{ id: 1, name: 'Übung', description: '' }];
  }

  if (meaningful.length === 1) {
    return [{ id: 1, name: meaningful[0].name, description: meaningful[0].lines.filter(l => l.trim()).join('\n') }];
  }

  return meaningful.map((s, i) => ({
    id: i + 1,
    name: s.name,
    description: s.lines.filter(l => l.trim()).join('\n'),
  }));
}

/** Check if a section represents a training phase (Erwärmung, Hauptteil, etc.) */
function isTrainingPhase(sectionName: string): boolean {
  return PHASE_PATTERNS.some(p => p.test(sectionName));
}

/** Extract data from a single section's text block */
function extractSectionData(sectionText: string, sectionName: string, globalPlayerCount: number, globalFieldSize: string): ParseResult {
  const duration = extractDuration(sectionText) || 15;
  const sectionPlayerCount = extractPlayerCount(sectionText);
  const playerCount = sectionPlayerCount !== 16 ? sectionPlayerCount : globalPlayerCount;
  const sectionFieldSize = extractFieldSize(sectionText);
  const fieldSize = sectionFieldSize || globalFieldSize;
  const materialCounts = extractMaterial(sectionText);
  const coachingPoints = extractCoachingPoints(sectionText);
  const variations = extractVariations(sectionText);
  const description = extractDescription(sectionText) || sectionText.split('\n').filter(l => l.trim()).join('\n');
  const category = detectCategory(sectionName + '\n' + sectionText);
  const hasLargeGoals = (materialCounts['goal-large'] || 0) > 0;

  const concept: ConceptData = {
    name: sectionName,
    category,
    duration,
    players: playerCount,
    fieldSize,
    description,
    coachingPoints,
    variations,
    phases: [{ id: 1, name: sectionName, description: '' }],
  };

  return { concept, materialCounts, playerCount, hasLargeGoals };
}

export async function parseTrainingPlan(buffer: Buffer, filename: string): Promise<ParseResult[]> {
  let rawText: string;

  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value;
  } else if (ext === 'pdf') {
    const pdf = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await pdf.getText();
    rawText = result.text;
    await pdf.destroy();
  } else {
    throw new Error(`Unsupported file type: .${ext}`);
  }

  const text = extractText(rawText);
  const sections = detectSections(text);

  // Global fallback values extracted from the full text
  const globalPlayerCount = extractPlayerCount(text);
  const globalFieldSize = extractFieldSize(text);

  // Find sections that are actual training phases
  const phaseSections = sections.filter(s =>
    isTrainingPhase(s.name) && s.lines.filter(l => l.trim()).length > 0
  );

  // If we have multiple training phase sections, create one ParseResult per phase
  if (phaseSections.length > 1) {
    return phaseSections.map(section => {
      const sectionText = section.lines.join('\n');
      return extractSectionData(sectionText, section.name, globalPlayerCount, globalFieldSize);
    });
  }

  // Single exercise fallback (original behavior)
  const phases = buildPhases(sections);
  const duration = extractDuration(text);
  const materialCounts = extractMaterial(text);
  const coachingPoints = extractCoachingPoints(text);
  const variations = extractVariations(text);
  const description = extractDescription(text);
  const name = extractName(text, filename);
  const category = detectCategory(text);
  const hasLargeGoals = (materialCounts['goal-large'] || 0) > 0;

  const concept: ConceptData = {
    name,
    category,
    duration,
    players: globalPlayerCount,
    fieldSize: globalFieldSize,
    description,
    coachingPoints,
    variations,
    phases,
  };

  return [{
    concept,
    materialCounts,
    playerCount: globalPlayerCount,
    hasLargeGoals,
  }];
}
