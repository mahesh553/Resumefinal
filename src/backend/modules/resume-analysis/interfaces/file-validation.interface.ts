export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileInfo?: {
    originalName: string;
    mimeType: string;
    size: number;
    extension: string;
  };
}

export interface ParsedResumeContent {
  text: string;
  metadata: {
    pages?: number;
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/plain', // .txt
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB