import { Router } from 'express';
import { getBooks } from '../controllers/bookController';

const router = Router();

router.get('/', (req, res) => getBooks(req, res));

export default router;