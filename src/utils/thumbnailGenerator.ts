import sharp from 'sharp';
import { fromPath } from 'pdf2pic';
import fs from 'fs/promises';
import path from 'path';
import { STORAGE_PATH } from './fileUtils';

interface ThumbnailOptions {
    width?: number;
    height?: number;
    quality?: number;
}

export async function generateBookThumbnails(
    pdfPath: string, 
    options: ThumbnailOptions = {}
): Promise<string> {
    const {
        width = 200,
        height = 300,
        quality = 80
    } = options;

    // Проверяем существование PDF файла
    if (!await fileExists(pdfPath)) {
        throw new Error('PDF file not found');
    }

    const thumbnailDir = path.join(STORAGE_PATH, 'thumbnails');
    const fileName = path.basename(pdfPath, '.pdf');
    const thumbnailPath = path.join(thumbnailDir, `${fileName}.jpg`);
    const optimizedThumbnailPath = thumbnailPath.replace('.jpg', '_optimized.jpg');

    // Проверяем существование thumbnail
    if (await fileExists(optimizedThumbnailPath)) {
        return path.relative(STORAGE_PATH, optimizedThumbnailPath);
    }

    // Проверяем размер файла
    const stats = await fs.stat(pdfPath);
    if (stats.size > 100 * 1024 * 1024) { // 100MB
        throw new Error('PDF file is too large');
    }

    try {
        await fs.mkdir(thumbnailDir, { recursive: true });

        const options = {
            density: 100,
            saveFilename: fileName,
            savePath: thumbnailDir,
            format: "jpg",
            width
        };

        const convert = fromPath(pdfPath, options);
        await convert(1);

        await sharp(thumbnailPath)
            .resize(width, height, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality })
            .toFile(optimizedThumbnailPath);

        // Удаляем промежуточный файл
        await fs.unlink(thumbnailPath);

        return path.relative(STORAGE_PATH, optimizedThumbnailPath);
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        throw new Error('Failed to generate thumbnail');
    }
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
} 