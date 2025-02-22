import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { STORAGE_PATH } from './fileUtils';
import { createCanvas } from 'canvas';

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

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
    }
}

interface ThumbnailOptions {
    width?: number;
    height?: number;
    quality?: number;
}

async function createFallbackThumbnail(
    fileName: string,
    width: number,
    height: number,
    quality: number
): Promise<Buffer> {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
    ctx.fillText(text, width / 2, height / 2);

    return await sharp(canvas.toBuffer())
        .jpeg({ quality })
        .toBuffer();
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
        const pdfFileName = path.basename(pdfPath, '.pdf');
        const thumbnailPath = path.join(STORAGE_PATH, 'books', 'thumbnails', `${pdfFileName}.jpg`);

        if (await fileExists(thumbnailPath)) {
            return `data:image/jpeg;base64,${(await fs.readFile(thumbnailPath)).toString('base64')}`;
        } 

        try {
            const data = await fs.readFile(pdfPath);
            const loadingTask = pdfjsLib.getDocument({ data });
            const pdfDocument = await loadingTask.promise;

            const page = await pdfDocument.getPage(1);
            const viewport = page.getViewport({ scale: 1.0 });

            const canvasFactory = new NodeCanvasFactory();
            const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
            const context = canvasAndContext.context;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const imageBuffer = canvasAndContext.canvas.toBuffer();

            const optimizedBuffer = await sharp(imageBuffer)
                .resize(width, height, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .jpeg({ quality })
                .toBuffer();

            await fs.writeFile(thumbnailPath, optimizedBuffer);

            return `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
        } catch (pdfError) {
            console.error('Failed to process PDF, creating fallback thumbnail:', pdfError);
            const fallbackBuffer = await createFallbackThumbnail(pdfFileName, width, height, quality);
            await fs.writeFile(thumbnailPath, fallbackBuffer);
            return `data:image/jpeg;base64,${fallbackBuffer.toString('base64')}`;
        }
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