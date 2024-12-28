import { Request, Response } from 'express';
import path from 'path';
import { STORAGE_PATH, getFilesFromDir } from '../utils/fileUtils';

export async function getImagesByCategory(req: Request, res: Response) {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const dirPath = path.join(STORAGE_PATH, 'images', 'gallery', category);

    try {
        const files = await getFilesFromDir(dirPath);
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);

        const paginatedFiles = files.slice(startIndex, endIndex);

        res.json({
            items: paginatedFiles.map(file => ({
                src: `/files${file.path}`,
                alt: file.name,
                title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')
            })),
            totalPages: Math.ceil(files.length / Number(limit)),
            currentPage: Number(page)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get images' });
    }
}