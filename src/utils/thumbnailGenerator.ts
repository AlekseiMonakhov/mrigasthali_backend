import sharp from 'sharp';
import fs from 'fs/promises';
import { fromPath } from 'pdf2pic';

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
        const baseOptions = {
            width,
            height,
            density: 300,
            format: "png",
            preserveAspectRatio: true,
            saveFilePath: await fs.mkdtemp('tmp-'), // Временная директория для сохранения
        };

        // Конвертируем первую страницу PDF в изображение
        const convert = fromPath(pdfPath, baseOptions);
        const pageToConvertAsImage = 1;
        
        const result = await convert(pageToConvertAsImage);
        
        if (!result.path) {
            throw new Error('Failed to convert PDF to image');
        }

        // Читаем сгенерированный файл
        const imageBuffer = await fs.readFile(result.path);

        // Удаляем временный файл
        await fs.unlink(result.path);
        // Удаляем временную директорию
        await fs.rmdir(baseOptions.saveFilePath);

        // Оптимизируем с помощью sharp
        const optimizedBuffer = await sharp(imageBuffer)
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
