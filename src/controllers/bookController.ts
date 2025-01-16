import { Request, Response } from 'express';
import path from 'path';
import { STORAGE_PATH, getFilesFromDir } from '../utils/fileUtils';
import { generateBookThumbnails } from '../utils/thumbnailGenerator';

export async function getBooks(req: Request, res: Response) {
    const dirPath = path.join(STORAGE_PATH, 'books', 'pdf');
    const { page = 1, limit = 20 } = req.query;

    try {
        const files = await getFilesFromDir(dirPath);
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedFiles = files.slice(startIndex, endIndex);

        const booksWithThumbnails = await Promise.allSettled(
            paginatedFiles.map(async file => {
                try {
                    const fullPath = path.join(STORAGE_PATH, file.path);
                    const thumbnail = await generateBookThumbnails(fullPath, {
                        width: 200,
                        height: 300,
                        quality: 80
                    });
                    
                    return {
                        name: file.name,
                        path: `/files${file.path}`,
                        thumbnail: `/files/${thumbnail}`,
                        error: null
                    };
                } catch (error) {
                    return {
                        name: file.name,
                        path: `/files${file.path}`,
                        thumbnail: null,
                        error: 'Failed to generate thumbnail'
                    };
                }
            })
        );

        res.json({
            items: booksWithThumbnails.map(result => 
                result.status === 'fulfilled' ? result.value : null
            ).filter(Boolean),
            totalPages: Math.ceil(files.length / Number(limit)),
            currentPage: Number(page)
        });
    } catch (error) {
        console.error('Error in getBooks:', error);
        res.status(500).json({ error: 'Failed to get books' });
    }
}