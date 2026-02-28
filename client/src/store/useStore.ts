import { create } from 'zustand';
import type { FieldElement, Drawing, ConceptData, ToolMode, FieldType, Keyframe, ImportResult, Exercise } from '../types';

interface HistoryEntry {
  elements: FieldElement[];
  drawings: Drawing[];
}

interface AppState {
  // Elements on field
  elements: FieldElement[];
  drawings: Drawing[];
  nextId: number;

  // Selection & mode
  selectedId: number | null;
  selectedColor: string;
  drawColor: string;
  mode: ToolMode;

  // Field
  fieldType: FieldType;
  showGrid: boolean;
  playerStyle: 'circle' | 'figure';
  zoom: number;

  // Animation
  animTime: number;
  animDuration: number;
  animSpeed: number;
  animPlaying: boolean;

  // Concept
  concept: ConceptData;
  showConcept: boolean;

  // Exercises (multi-exercise support)
  exercises: Exercise[];
  currentExerciseIndex: number;

  // Undo/Redo
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Actions
  addElement: (el: Omit<FieldElement, 'id'>) => number;
  updateElement: (id: number, updates: Partial<FieldElement>) => void;
  removeElement: (id: number) => void;
  duplicateElement: (id: number) => void;
  bringToFront: (id: number) => void;
  sendToBack: (id: number) => void;
  setSelected: (id: number | null) => void;
  setSelectedColor: (color: string) => void;
  setDrawColor: (color: string) => void;
  setMode: (mode: ToolMode) => void;
  setFieldType: (type: FieldType) => void;
  toggleGrid: () => void;
  togglePlayerStyle: () => void;
  setZoom: (z: number) => void;
  addDrawing: (d: Omit<Drawing, 'id'>) => void;
  removeDrawing: (id: number) => void;
  updateDrawing: (id: number, updates: Partial<Drawing>) => void;

  // Animation
  setAnimTime: (t: number) => void;
  setAnimDuration: (d: number) => void;
  setAnimSpeed: (s: number) => void;
  setAnimPlaying: (p: boolean) => void;
  addKeyframe: (elementId: number, kf: Keyframe) => void;
  removeKeyframe: (elementId: number, index: number) => void;
  clearKeyframes: (elementId: number) => void;
  interpolateElements: (t: number) => void;

  // Concept
  updateConcept: (updates: Partial<ConceptData>) => void;
  toggleConcept: () => void;
  addPhase: () => void;
  updatePhase: (id: number, updates: Partial<{ name: string; description: string }>) => void;
  removePhase: (id: number) => void;
  addCoachingPoint: () => void;
  updateCoachingPoint: (index: number, value: string) => void;
  addVariation: () => void;
  updateVariation: (index: number, value: string) => void;

  // Undo
  saveUndo: () => void;
  undo: () => void;
  redo: () => void;

  // Reset
  resetAll: () => void;

  // Exercises
  switchExercise: (index: number) => void;

  // Import
  importTrainingPlan: (data: ImportResult) => void;

  // Export helper
  getExportData: () => { elements: FieldElement[]; drawings: Drawing[]; concept: ConceptData; fieldType: FieldType };
}

const defaultConcept: ConceptData = {
  name: '',
  category: 'Aufwärmen',
  duration: 15,
  players: 16,
  fieldSize: '',
  description: '',
  coachingPoints: [''],
  variations: [''],
  phases: [{ id: 1, name: '', description: '' }],
};

export const useStore = create<AppState>((set, get) => ({
  elements: [],
  drawings: [],
  nextId: 1,
  selectedId: null,
  selectedColor: '#3498db',
  drawColor: '#ffffff',
  mode: 'select',
  fieldType: 'full-green',
  showGrid: false,
  playerStyle: 'circle',
  zoom: 1,
  animTime: 0,
  animDuration: 5,
  animSpeed: 1,
  animPlaying: false,
  concept: { ...defaultConcept },
  showConcept: true,
  exercises: [],
  currentExerciseIndex: 0,
  undoStack: [],
  redoStack: [],

  addElement: (el) => {
    const id = get().nextId;
    set(s => ({
      elements: [...s.elements, { ...el, id } as FieldElement],
      nextId: s.nextId + 1,
      selectedId: id,
    }));
    return id;
  },

  updateElement: (id, updates) => set(s => ({
    elements: s.elements.map(e => e.id === id ? { ...e, ...updates } : e),
  })),

  removeElement: (id) => set(s => ({
    elements: s.elements.filter(e => e.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),

  duplicateElement: (id) => {
    const el = get().elements.find(e => e.id === id);
    if (!el) return;
    const newId = get().nextId;
    set(s => ({
      elements: [...s.elements, { ...el, id: newId, x: el.x + 20, y: el.y + 20, keyframes: [] }],
      nextId: s.nextId + 1,
      selectedId: newId,
    }));
  },

  bringToFront: (id) => set(s => {
    const el = s.elements.find(e => e.id === id);
    if (!el) return s;
    return { elements: [...s.elements.filter(e => e.id !== id), el] };
  }),

  sendToBack: (id) => set(s => {
    const el = s.elements.find(e => e.id === id);
    if (!el) return s;
    return { elements: [el, ...s.elements.filter(e => e.id !== id)] };
  }),

  setSelected: (id) => set({ selectedId: id }),
  setSelectedColor: (color) => set({ selectedColor: color }),
  setDrawColor: (color) => set({ drawColor: color }),
  setMode: (mode) => set({ mode }),
  setFieldType: (type) => set({ fieldType: type }),
  toggleGrid: () => set(s => ({ showGrid: !s.showGrid })),
  togglePlayerStyle: () => set(s => ({ playerStyle: s.playerStyle === 'circle' ? 'figure' : 'circle' })),
  setZoom: (z) => set({ zoom: Math.max(0.5, Math.min(2.0, z)) }),

  addDrawing: (d) => {
    const id = get().nextId;
    set(s => ({
      drawings: [...s.drawings, { ...d, id } as Drawing],
      nextId: s.nextId + 1,
    }));
  },

  removeDrawing: (id) => set(s => ({
    drawings: s.drawings.filter(d => d.id !== id),
  })),

  updateDrawing: (id, updates) => set(s => ({
    drawings: s.drawings.map(d => d.id === id ? { ...d, ...updates } : d),
  })),

  setAnimTime: (t) => set({ animTime: t }),
  setAnimDuration: (d) => set({ animDuration: d }),
  setAnimSpeed: (s) => set({ animSpeed: s }),
  setAnimPlaying: (p) => set({ animPlaying: p }),

  addKeyframe: (elementId, kf) => set(s => ({
    elements: s.elements.map(e => {
      if (e.id !== elementId) return e;
      const keyframes = e.keyframes.filter(k => Math.abs(k.t - kf.t) > 0.05);
      keyframes.push(kf);
      keyframes.sort((a, b) => a.t - b.t);
      return { ...e, keyframes };
    }),
  })),

  removeKeyframe: (elementId, index) => set(s => ({
    elements: s.elements.map(e => {
      if (e.id !== elementId) return e;
      const keyframes = [...e.keyframes];
      keyframes.splice(index, 1);
      return { ...e, keyframes };
    }),
  })),

  clearKeyframes: (elementId) => set(s => ({
    elements: s.elements.map(e =>
      e.id === elementId ? { ...e, keyframes: [] } : e
    ),
  })),

  interpolateElements: (t) => set(s => ({
    elements: s.elements.map(el => {
      if (!el.keyframes || el.keyframes.length < 2) return el;
      const first = el.keyframes[0];
      const last = el.keyframes[el.keyframes.length - 1];
      if (t <= first.t) return { ...el, x: first.x, y: first.y, rotation: first.rotation };
      if (t >= last.t) return { ...el, x: last.x, y: last.y, rotation: last.rotation };
      for (let i = 0; i < el.keyframes.length - 1; i++) {
        const kf1 = el.keyframes[i];
        const kf2 = el.keyframes[i + 1];
        if (t >= kf1.t && t <= kf2.t) {
          const p = (t - kf1.t) / (kf2.t - kf1.t);
          const smooth = p * p * (3 - 2 * p);
          return {
            ...el,
            x: kf1.x + (kf2.x - kf1.x) * smooth,
            y: kf1.y + (kf2.y - kf1.y) * smooth,
            rotation: kf1.rotation + (kf2.rotation - kf1.rotation) * smooth,
          };
        }
      }
      return el;
    }),
  })),

  updateConcept: (updates) => set(s => ({
    concept: { ...s.concept, ...updates },
  })),
  toggleConcept: () => set(s => ({ showConcept: !s.showConcept })),

  addPhase: () => set(s => ({
    concept: {
      ...s.concept,
      phases: [...s.concept.phases, {
        id: Date.now(),
        name: '',
        description: '',
      }],
    },
  })),

  updatePhase: (id, updates) => set(s => ({
    concept: {
      ...s.concept,
      phases: s.concept.phases.map(p => p.id === id ? { ...p, ...updates } : p),
    },
  })),

  removePhase: (id) => set(s => ({
    concept: {
      ...s.concept,
      phases: s.concept.phases.filter(p => p.id !== id),
    },
  })),

  addCoachingPoint: () => set(s => ({
    concept: { ...s.concept, coachingPoints: [...s.concept.coachingPoints, ''] },
  })),

  updateCoachingPoint: (index, value) => set(s => ({
    concept: {
      ...s.concept,
      coachingPoints: s.concept.coachingPoints.map((p, i) => i === index ? value : p),
    },
  })),

  addVariation: () => set(s => ({
    concept: { ...s.concept, variations: [...s.concept.variations, ''] },
  })),

  updateVariation: (index, value) => set(s => ({
    concept: {
      ...s.concept,
      variations: s.concept.variations.map((v, i) => i === index ? value : v),
    },
  })),

  saveUndo: () => set(s => ({
    undoStack: [...s.undoStack.slice(-49), {
      elements: JSON.parse(JSON.stringify(s.elements)),
      drawings: JSON.parse(JSON.stringify(s.drawings)),
    }],
    redoStack: [],
  })),

  undo: () => {
    const { undoStack, elements, drawings } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    set(s => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, { elements: JSON.parse(JSON.stringify(elements)), drawings: JSON.parse(JSON.stringify(drawings)) }],
      elements: prev.elements,
      drawings: prev.drawings,
      selectedId: null,
    }));
  },

  redo: () => {
    const { redoStack, elements, drawings } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set(s => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, { elements: JSON.parse(JSON.stringify(elements)), drawings: JSON.parse(JSON.stringify(drawings)) }],
      elements: next.elements,
      drawings: next.drawings,
      selectedId: null,
    }));
  },

  switchExercise: (index) => {
    const state = get();
    if (index === state.currentExerciseIndex || index < 0 || index >= state.exercises.length) return;

    // Save current state into exercises array
    const updatedExercises = [...state.exercises];
    updatedExercises[state.currentExerciseIndex] = {
      concept: state.concept,
      elements: state.elements,
      drawings: state.drawings,
      fieldType: state.fieldType,
    };

    // Load target exercise
    const target = updatedExercises[index];
    set({
      exercises: updatedExercises,
      currentExerciseIndex: index,
      elements: target.elements,
      drawings: target.drawings,
      concept: target.concept,
      fieldType: target.fieldType,
      selectedId: null,
      animTime: 0,
      animPlaying: false,
      undoStack: [],
      redoStack: [],
    });
  },

  importTrainingPlan: (data: ImportResult) => {
    let nextId = 1;

    const exercises: Exercise[] = data.exercises.map(ex => {
      const elements: FieldElement[] = ex.elements.map(el => ({
        ...el,
        id: nextId++,
        keyframes: [],
      } as FieldElement));
      return {
        concept: ex.concept,
        elements,
        drawings: [],
        fieldType: (ex.fieldType as FieldType) || 'full-green',
      };
    });

    const first = exercises[0];
    set({
      exercises,
      currentExerciseIndex: 0,
      elements: first.elements,
      drawings: first.drawings,
      nextId,
      selectedId: null,
      concept: first.concept,
      fieldType: first.fieldType,
      showConcept: true,
      animTime: 0,
      animPlaying: false,
      undoStack: [],
      redoStack: [],
    });
  },

  resetAll: () => set({
    elements: [],
    drawings: [],
    exercises: [],
    currentExerciseIndex: 0,
    selectedId: null,
    animTime: 0,
    animPlaying: false,
  }),

  getExportData: () => {
    const s = get();
    return {
      elements: s.elements,
      drawings: s.drawings,
      concept: s.concept,
      fieldType: s.fieldType,
    };
  },
}));
