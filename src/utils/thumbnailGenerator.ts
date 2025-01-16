import sharp from 'sharp';
import { createCanvas } from 'canvas';
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

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
    if (isErrorWithMessage(maybeError)) return maybeError;
    try {
        return new Error(JSON.stringify(maybeError));
    } catch {
        return new Error('Unknown error');
    }
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as Record<string, unknown>).message === 'string'
    );
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

    const thumbnailDir = path.join(STORAGE_PATH, 'books', 'thumbnails');
    const fileName = path.basename(pdfPath, '.pdf');
    const optimizedThumbnailPath = path.join(thumbnailDir, `${fileName}.jpg`);

    if (await fileExists(optimizedThumbnailPath)) {
        return path.relative(STORAGE_PATH, optimizedThumbnailPath);
    }

    try {
        await fs.mkdir(thumbnailDir, { recursive: true });

        // Создаем canvas для рендеринга
        const canvas = createCanvas(width * 2, height * 2);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width * 2, height * 2);

        // Конвертируем в изображение
        const buffer = canvas.toBuffer('image/jpeg');

        // Оптимизируем изображение
        await sharp(buffer)
            .resize(width, height, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality })
            .toFile(optimizedThumbnailPath);

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
