import { convert } from 'pdf-poppler';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { STORAGE_PATH } from './fileUtils';

interface ThumbnailOptions {
    width?: number;
    height?: number;
    quality?: number;
}

interface ErrorWithMessage {
    message: string;
    stack?: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as Record<string, unknown>).message === 'string'
    );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
    if (isErrorWithMessage(maybeError)) return maybeError;

    try {
        return new Error(JSON.stringify(maybeError));
    } catch {
        return new Error('Unknown error');
    }
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

    if (!await fileExists(pdfPath)) {
        throw new Error('PDF file not found');
    }

    const pdfDir = path.join(STORAGE_PATH, 'books', 'pdf');
    const thumbnailDir = path.join(STORAGE_PATH, 'books', 'thumbnails');
    
    const relativePdfPath = path.relative(pdfDir, pdfPath);
    const fileName = path.basename(relativePdfPath, '.pdf');
    const optimizedThumbnailPath = path.join(thumbnailDir, `${fileName}.jpg`);

    if (await fileExists(optimizedThumbnailPath)) {
        return path.relative(STORAGE_PATH, optimizedThumbnailPath);
    }

    try {
        await fs.mkdir(thumbnailDir, { recursive: true });

        const tempDir = path.join(thumbnailDir, 'temp');
        await fs.mkdir(tempDir, { recursive: true });

        const opts = {
            format: 'jpeg',
            out_dir: tempDir,
            out_prefix: fileName,
            page: 1,
            scale: 2.0,
        };

        await convert(pdfPath, opts);

        const tempImagePath = path.join(tempDir, `${fileName}-1.jpg`);

        await sharp(tempImagePath)
            .resize(width, height, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality })
            .toFile(optimizedThumbnailPath);

        await fs.unlink(tempImagePath).catch((err) => {
            console.warn('Failed to delete temp file:', toErrorWithMessage(err).message);
        });
        await fs.rmdir(tempDir).catch((err) => {
            console.warn('Failed to delete temp directory:', toErrorWithMessage(err).message);
        });

        return path.relative(STORAGE_PATH, optimizedThumbnailPath);
    } catch (maybeError: unknown) {
        const error = toErrorWithMessage(maybeError);
        console.error('Error generating thumbnail:', {
            message: error.message,
            pdfPath,
            stack: error.stack
        });
        throw new Error(`Failed to generate thumbnail: ${error.message}`);
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

// Вспомогательная функция для проверки размера файла
async function checkFileSize(filePath: string, maxSize: number = 100 * 1024 * 1024): Promise<void> {
    const stats = await fs.stat(filePath);
    if (stats.size > maxSize) {
        throw new Error(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`);
    }
} 