import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getLearningModules, submitQuiz } from '../controllers/learningController.js';

const router = Router();

// Protect all learning routes with existing auth middleware
router.use(requireAuth);

router.get('/modules', getLearningModules);
router.post('/submit-quiz', submitQuiz);

export default router;

