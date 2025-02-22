import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { STORAGE_PATH } from './fileUtils';
import { createCanvas } from 'canvas';

// Импортируем Legacy версию pdf.js
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Создаем фабрику для canvas
class NodeCanvasFactory {
    create(width: number, height: number) {
        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');

        return {
            canvas,
            context,
            width,
            height
        };
    }

    reset(canvasAndContext: any, width: number, height: number) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext: any) {
        // Метод destroy не требуется для node-canvas
    }
}

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

        // Проверяем существует ли уже thumbnail
        if (await fileExists(thumbnailPath)) {
            // Возвращаем существующую обложку
            return `data:image/jpeg;base64,${(await fs.readFile(thumbnailPath)).toString('base64')}`;
        } 

        // Загружаем PDF файл
        const data = await fs.readFile(pdfPath);
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdfDocument = await loadingTask.promise;

        // Получаем первую страницу
        const page = await pdfDocument.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });

        // Создаем canvas нужного размера
        const canvasFactory = new NodeCanvasFactory();
        const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
        const context = canvasAndContext.context;

        // Рендерим страницу на canvas
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // Получаем данные изображения
        const imageBuffer = canvasAndContext.canvas.toBuffer();

        // Оптимизируем с помощью sharp
        const optimizedBuffer = await sharp(imageBuffer)
            .resize(width, height, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality })
            .toBuffer();

        // Сохраняем оптимизированную версию
        await fs.writeFile(thumbnailPath, optimizedBuffer);

        // Возвращаем base64 сгенерированной обложки
        return `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
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