declare module 'pdf-parse' {
    interface PDFData {
        numpages: number;
        text: string;
    }
    
    function PDFParser(dataBuffer: Buffer): Promise<PDFData>;
    export default PDFParser;
} 