import { Router } from 'express';
import { listSessions, loadSessionAsExercises } from '../services/session-loader.js';
import { placeElements } from '../services/element-placement.js';

export const sessionsRoute = Router();

/** GET /api/sessions — list all generated sessions */
sessionsRoute.get('/', (_req, res) => {
  try {
    const sessions = listSessions();
    res.json({ sessions });
  } catch (err) {
    console.error('Session list error:', err);
    const message = err instanceof Error ? err.message : 'Failed to list sessions';
    res.status(500).json({ error: message });
  }
});

/** GET /api/sessions/:id — load a session as importable exercises */
sessionsRoute.get('/:id', (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID' });
      return;
    }

    const result = loadSessionAsExercises(sessionId);
    if (!result) {
      res.status(404).json({ error: `Session ${sessionId} not found` });
      return;
    }

    const exercises = result.exercises.map(parseResult => {
      const { elements, fieldType } = placeElements(parseResult);
      return {
        concept: parseResult.concept,
        elements,
        fieldType,
      };
    });

    res.json({
      session: result.session,
      exercises,
    });
  } catch (err) {
    console.error('Session load error:', err);
    const message = err instanceof Error ? err.message : 'Failed to load session';
    res.status(500).json({ error: message });
  }
});
