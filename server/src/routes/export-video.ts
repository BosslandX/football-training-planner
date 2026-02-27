import { Router } from 'express';
import { generateAnimationFrames } from '../services/video-export.js';

export const exportVideoRoute = Router();

exportVideoRoute.post('/video', async (req, res) => {
  try {
    const { elements, drawings, fieldType, animDuration, fps } = req.body;

    if (!elements) {
      res.status(400).json({ error: 'Missing required data (elements)' });
      return;
    }

    const gifBuffer = await generateAnimationFrames({
      elements,
      drawings: drawings || [],
      fieldType: fieldType || 'full-green',
      animDuration: animDuration || 5,
      fps: fps || 15,
    });

    res.set({
      'Content-Type': 'image/gif',
      'Content-Disposition': 'attachment; filename="animation.gif"',
      'Content-Length': gifBuffer.length.toString(),
    });
    res.send(gifBuffer);
  } catch (err) {
    console.error('Video export error:', err);
    res.status(500).json({ error: 'Video generation failed' });
  }
});
