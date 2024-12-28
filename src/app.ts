import express from 'express';
import cors from 'cors';
import imageRoutes from './routes/imageRoutes';
import bookRoutes from './routes/bookRoutes';
import { STORAGE_PATH } from './utils/fileUtils';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/images', imageRoutes);
app.use('/api/books', bookRoutes);

// Serve static files
app.use('/files', express.static(STORAGE_PATH));

export default app;