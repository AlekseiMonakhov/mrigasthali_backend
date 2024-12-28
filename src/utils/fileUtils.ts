// @ts-ignore
import fs from 'fs/promises';
import path from 'path';
import { FileInfo } from '../types';

export const STORAGE_PATH = path.join(process.cwd(), 'storage');

export async function getFilesFromDir(dirPath: string): Promise<FileInfo[]> {
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        return files
            .filter(file => file.isFile())
            .map(file => ({
                name: file.name,
                path: path.join(dirPath, file.name).replace(STORAGE_PATH, ''),
            }));
    } catch (error) {
        console.error('Error reading directory:', error);
        return [];
    }
}