import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fromPath } from 'pdf2pic';
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

    if (!await fileExists(pdfPath)) {
        throw new Error('PDF file not found');
    }

    try {
        // Формируем путь к thumbnail
        const pdfFileName = path.basename(pdfPath, '.pdf');
        const thumbnailPath = path.join(STORAGE_PATH, 'books', 'thumbnails', `${pdfFileName}.jpg`);

        let imageBuffer: Buffer;

        // Проверяем существует ли уже thumbnail
        if (await fileExists(thumbnailPath)) {
            // Если существует, читаем его
            imageBuffer = await fs.readFile(thumbnailPath);
        } else {
            // Если нет, генерируем из PDF
            const baseOptions = {
                width,
                height,
                density: 300,
                format: "jpeg",
                preserveAspectRatio: true,
                saveFilePath: path.join(STORAGE_PATH, 'books', 'thumbnails')
            };

            // Конвертируем первую страницу PDF в изображение
            const convert = fromPath(pdfPath, baseOptions);
            const pageToConvertAsImage = 1;
            
            const result = await convert(pageToConvertAsImage);
            
            if (!result.path) {
                throw new Error('Failed to convert PDF to image');
            }

            // Читаем сгенерированный файл
            imageBuffer = await fs.readFile(result.path);
        }

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
