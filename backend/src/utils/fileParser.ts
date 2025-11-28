import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { promises as fs } from 'fs';
import http from 'http';
import https from 'https';

/**
 * Parse PDF files and extract text content
 */
export const parsePDF = async (filePath: string): Promise<string> => {
  try {
    const dataBuffer = await getFileBuffer(filePath);
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
    const dataBuffer = await getFileBuffer(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
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

const getFileBuffer = async (filePath: string): Promise<Buffer> => {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return downloadRemoteFile(filePath);
  }
  return fs.readFile(filePath);
};

const downloadRemoteFile = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Failed to download file. Status code: ${res.statusCode}`));
          return;
        }

        const data: Uint8Array[] = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => resolve(Buffer.concat(data)));
      })
      .on('error', (error) => reject(error));
  });
};

