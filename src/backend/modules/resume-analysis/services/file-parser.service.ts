import { Injectable } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
const pdfParseFunc = (pdfParse as any).default || pdfParse;
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import { ParsedResumeContent } from '../interfaces/file-validation.interface';

@Injectable()
export class FileParserService {
  async parseFile(filePath: string, mimeType: string, bufferContent?: Buffer): Promise<ParsedResumeContent> {
    const buffer = bufferContent || fs.readFileSync(filePath);

    switch (mimeType) {
      case 'application/pdf':
        return this.parsePDF(buffer);
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.parseDOCX(buffer);
      
      case 'application/msword':
        throw new Error('Legacy DOC format not supported. Please convert to DOCX.');
      
      case 'text/plain':
        return this.parseTXT(buffer);
      
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  private async parsePDF(buffer: Buffer): Promise<ParsedResumeContent> {
    try {
      const data = await pdfParseFunc(buffer);
      
      return {
        text: data.text,
        metadata: {
          pages: data.numpages,
          title: data.info?.Title,
          author: data.info?.Author,
          creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to parse PDF: ${error?.message || 'Unknown error'}`);
    }
  }

  private async parseDOCX(buffer: Buffer): Promise<ParsedResumeContent> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      return {
        text: result.value,
        metadata: {
          // DOCX metadata would need additional parsing
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to parse DOCX: ${error?.message || 'Unknown error'}`);
    }
  }

  private async parseTXT(buffer: Buffer): Promise<ParsedResumeContent> {
    try {
      const text = buffer.toString('utf-8');
      
      return {
        text,
        metadata: {},
      };
    } catch (error: any) {
      throw new Error(`Failed to parse TXT: ${error?.message || 'Unknown error'}`);
    }
  }

  cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .replace(/\s{2,}/g, ' ')  // Remove excessive spaces
      .trim();
  }

  extractMetadata(text: string): any {
    const metadata: any = {};

    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      metadata.email = emailMatch[0];
    }

    // Extract phone number (basic patterns)
    const phoneMatch = text.match(/(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
    if (phoneMatch) {
      metadata.phone = phoneMatch[0];
    }

    // Extract LinkedIn profile
    const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/);
    if (linkedinMatch) {
      metadata.linkedin = `https://${linkedinMatch[0]}`;
    }

    // Extract name (first line that looks like a name)
    const lines = text.split('\n').filter(line => line.trim());
    const namePattern = /^[A-Z][a-z]+ [A-Z][a-z]+/;
    const nameLine = lines.find(line => namePattern.test(line.trim()));
    if (nameLine) {
      metadata.name = nameLine.trim();
    }

    return metadata;
  }
}