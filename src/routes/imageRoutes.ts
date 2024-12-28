import { Router } from 'express';
import { getImagesByCategory } from '../controllers/imageController';

const router = Router();

router.get('/:category', getImagesByCategory);

export default router;