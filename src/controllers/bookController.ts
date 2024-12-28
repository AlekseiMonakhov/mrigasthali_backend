import { Request, Response } from 'express';
import path from 'path';
import { STORAGE_PATH, getFilesFromDir } from '../utils/fileUtils';

export async function getBooks(_req: Request, res: Response) {
    const dirPath = path.join(STORAGE_PATH, 'books', 'pdf');

    try {
        const files = await getFilesFromDir(dirPath);
        res.json(files.map(file => ({
            name: file.name,
            path: `/files${file.path}`
        })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to get books' });
    }
}