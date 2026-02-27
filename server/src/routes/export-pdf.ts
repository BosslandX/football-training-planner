import { Router } from 'express';
import { generatePDF } from '../services/pdf-export.js';

export const exportPDFRoute = Router();

exportPDFRoute.post('/pdf', async (req, res) => {
  try {
    const { elements, drawings, concept, fieldType } = req.body;

    if (!elements || !concept) {
      res.status(400).json({ error: 'Missing required data (elements, concept)' });
      return;
    }

    const pdfBuffer = await generatePDF({ elements, drawings, concept, fieldType });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${concept.name || 'training'}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});
