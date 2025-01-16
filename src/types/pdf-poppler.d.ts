declare module 'pdf-poppler' {
    export function convert(
        pdf: string,
        options: {
            format: string;
            out_dir: string;
            out_prefix: string;
            page?: number;
            scale?: number;
        }
    ): Promise<void>;
} 