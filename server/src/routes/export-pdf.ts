import { Router } from 'express';
import { generatePDF } from '../services/pdf-export.js';

export const exportPDFRoute = Router();

exportPDFRoute.post('/pdf', async (req, res) => {
  try {
    let exercises: any[];

    if (req.body.exercises && Array.isArray(req.body.exercises)) {
      // New format: { exercises: Exercise[] }
      exercises = req.body.exercises;
    } else if (req.body.elements && req.body.concept) {
      // Backward-compatible: single exercise format
      const { elements, drawings, concept, fieldType } = req.body;
      exercises = [{ elements, drawings, concept, fieldType }];
    } else {
      res.status(400).json({ error: 'Missing required data (exercises[] or elements+concept)' });
      return;
    }

    const pdfBuffer = await generatePDF(exercises);

    const firstName = exercises[0]?.concept?.name || 'training';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${firstName}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});
