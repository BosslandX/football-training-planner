import { Router } from 'express';
import multer from 'multer';
import { parseTrainingPlan } from '../services/training-plan-parser.js';
import { placeElements } from '../services/element-placement.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
    ];
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (allowed.includes(file.mimetype) || ext === 'docx' || ext === 'pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only .docx and .pdf files are allowed'));
    }
  },
});

export const importTrainingPlanRoute = Router();

importTrainingPlanRoute.post('/training-plan', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const parseResults = await parseTrainingPlan(req.file.buffer, req.file.originalname);

    const exercises = parseResults.map(parseResult => {
      const { elements, fieldType } = placeElements(parseResult);
      return {
        concept: parseResult.concept,
        elements,
        fieldType,
      };
    });

    res.json({ exercises });
  } catch (err) {
    console.error('Import error:', err);
    const message = err instanceof Error ? err.message : 'Import failed';
    res.status(500).json({ error: message });
  }
});
