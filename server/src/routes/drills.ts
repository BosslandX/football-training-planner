import { Router } from 'express';
import { loadDrillAsExercise } from '../services/session-loader.js';
import { placeElements } from '../services/element-placement.js';

export const drillsRoute = Router();

/** GET /api/drills/:id — load a single drill as an importable exercise */
drillsRoute.get('/:id', (req, res) => {
  try {
    const drillId = parseInt(req.params.id, 10);
    if (isNaN(drillId)) {
      res.status(400).json({ error: 'Invalid drill ID' });
      return;
    }

    const result = loadDrillAsExercise(drillId);
    if (!result) {
      res.status(404).json({ error: `Drill ${drillId} not found` });
      return;
    }

    const { elements, fieldType } = placeElements(result.exercise);

    res.json({
      exercises: [{
        concept: result.exercise.concept,
        elements,
        fieldType,
      }],
    });
  } catch (err) {
    console.error('Drill load error:', err);
    const message = err instanceof Error ? err.message : 'Failed to load drill';
    res.status(500).json({ error: message });
  }
});
