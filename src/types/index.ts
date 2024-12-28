export interface FileInfo {
    name: string;
    path: string;
}

export interface ImageResponse {
    items: {
        src: string;
        alt: string;
        title: string;
    }[];
    totalPages: number;
    currentPage: number;
}