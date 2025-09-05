import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import {
  FileValidationResult,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
} from '../interfaces/file-validation.interface';

@Injectable()
export class FileValidationService {
  constructor(private configService: ConfigService) {}

  validateFile(file: Express.Multer.File): FileValidationResult {
    // Check file existence
    if (!file) {
      return {
        isValid: false,
        error: 'No file provided',
      };
    }

    // Check file size
    const maxSize = this.configService.get('MAX_FILE_SIZE') || MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`,
      };
    }

    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return {
        isValid: false,
        error: `File type not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed types: PDF, DOCX, DOC, TXT`,
      };
    }

    // Additional security checks
    const securityCheck = this.performSecurityChecks(file);
    if (!securityCheck.isValid) {
      return securityCheck;
    }

    return {
      isValid: true,
      fileInfo: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        extension: fileExtension,
      },
    };
  }

  private performSecurityChecks(file: Express.Multer.File): FileValidationResult {
    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid filename characters
      /^\./,  // Hidden files
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.originalname)) {
        return {
          isValid: false,
          error: 'Invalid or suspicious filename',
        };
      }
    }

    // Check file signature (magic numbers) for basic validation
    if (file.buffer) {
      const isValidSignature = this.validateFileSignature(file);
      if (!isValidSignature) {
        return {
          isValid: false,
          error: 'File signature does not match declared type',
        };
      }
    }

    return { isValid: true };
  }

  private validateFileSignature(file: Express.Multer.File): boolean {
    if (!file.buffer || file.buffer.length < 4) {
      return false;
    }

    const buffer = file.buffer;
    const signature = buffer.slice(0, 8);

    // PDF signature
    if (file.mimetype === 'application/pdf') {
      return signature.slice(0, 4).toString() === '%PDF';
    }

    // DOCX/ZIP signature (DOCX is a ZIP file)
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return signature[0] === 0x50 && signature[1] === 0x4B; // PK (ZIP header)
    }

    // DOC signature
    if (file.mimetype === 'application/msword') {
      return signature[0] === 0xD0 && signature[1] === 0xCF; // OLE header
    }

    // TXT files don't have a specific signature, just check it's text
    if (file.mimetype === 'text/plain') {
      try {
        // Try to decode as UTF-8 and check for mostly printable characters
        const text = buffer.slice(0, 1000).toString('utf-8');
        const printableRatio = text.split('').filter(char => 
          char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126 || char === '\n' || char === '\r' || char === '\t'
        ).length / text.length;
        return printableRatio > 0.7; // At least 70% printable characters
      } catch {
        return false;
      }
    }

    return true;
  }

  generateSecureFileName(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const extension = path.extname(originalName);
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${userId}_${timestamp}_${randomSuffix}${extension}`;
  }

  ensureUploadDirectory(): string {
    const uploadDir = this.configService.get('UPLOAD_DIRECTORY') || './uploads';
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Create user-specific subdirectories
    const resumeDir = path.join(uploadDir, 'resumes');
    const tempDir = path.join(uploadDir, 'temp');

    [resumeDir, tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    return uploadDir;
  }
}