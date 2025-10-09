import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { promises as fs } from 'fs';

/**
 * Parse PDF files and extract text content
 */
export const parsePDF = async (filePath: string): Promise<string> => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
};

/**
 * Parse DOCX files and extract text content
 */
export const parseDOCX = async (filePath: string): Promise<string> => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX file');
  }
};

/**
 * Parse uploaded file based on extension
 */
export const parseDocument = async (filePath: string, mimeType: string): Promise<string> => {
  if (mimeType === 'application/pdf') {
    return parsePDF(filePath);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return parseDOCX(filePath);
  } else {
    throw new Error('Unsupported file type. Only PDF and DOCX are supported.');
  }
};

/**
 * Chunk text into smaller pieces for embedding
 * TODO Phase 2: Implement smart chunking with overlap for better context
 */
export const chunkText = (text: string, chunkSize: number = 1000): string[] => {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '. ';
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

