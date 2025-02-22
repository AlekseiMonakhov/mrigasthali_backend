import sharp from 'sharp';
import fs from 'fs/promises';
import pdf from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';
import * as console from "node:console";

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

    try {
        // Читаем PDF файл
        const pdfBuffer = await fs.readFile(pdfPath);
        
        // Загружаем PDF документ
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        
        // Получаем первую страницу
        const pages = pdfDoc.getPages();
        if (pages.length === 0) {
            throw new Error('PDF has no pages');
        }
        
        const firstPage = pages[0];
        
        // Конвертируем страницу в PNG
        const pngImage = await firstPage.exportAsImage({
            width,
            height
        });
        
        // Получаем буфер изображения
        const pngBuffer = await pngImage.toBuffer();

        // Оптимизируем с помощью sharp
        const optimizedBuffer = await sharp(pngBuffer)
            .resize(width, height, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality })
            .toBuffer();

        // Возвращаем base64
        return `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
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
