import { getSearchClient } from '../config/azure.config';

/**
 * Azure Cognitive Search Service
 * Handles vector embeddings storage and similarity search
 * 
 * MOCK MODE: Returns mock search results without actual embedding
 * PRODUCTION: Uses Azure Cognitive Search for vector similarity search
 * 
 * TODO Phase 2: Implement full RAG pipeline with embeddings
 */

export interface DocumentChunk {
  id: string;
  courseId: string;
  content: string;
  metadata: {
    topic?: string;
    page?: number;
    section?: string;
  };
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: any;
}

class AzureCognitiveSearchService {
  private mockDocuments: Map<string, DocumentChunk[]> = new Map();

  /**
   * Index document chunks for search
   * TODO: Add your Azure Cognitive Search credentials to .env to enable real indexing
   */
  async indexDocument(chunks: DocumentChunk[]): Promise<boolean> {
    const client = getSearchClient();

    if (!client) {
      console.log('🔍 Using MOCK document indexing');
      return this.mockIndexDocument(chunks);
    }

    try {
      // Transform chunks to match search index schema
      const documents = chunks.map(chunk => ({
        id: chunk.id,
        courseId: chunk.courseId,
        content: chunk.content,
        topic: chunk.metadata.topic,
        page: chunk.metadata.page,
        section: chunk.metadata.section
      }));

      await client.uploadDocuments(documents);
      console.log(`✅ Indexed ${chunks.length} document chunks`);
      return true;
    } catch (error) {
      console.error('Error indexing documents:', error);
      return this.mockIndexDocument(chunks);
    }
  }

  /**
   * Search for similar content
   * TODO Phase 2: Implement vector similarity search with embeddings
   */
  async searchSimilar(query: string, courseId?: string, topK: number = 5): Promise<SearchResult[]> {
    const client = getSearchClient();

    if (!client) {
      console.log('🔍 Using MOCK similarity search');
      return this.mockSearchSimilar(query, courseId, topK);
    }

    try {
      const searchOptions: any = {
        top: topK,
        select: ['id', 'content', 'topic', 'page', 'section']
      };

      if (courseId) {
        searchOptions.filter = `courseId eq '${courseId}'`;
      }

      const searchResults = await client.search(query, searchOptions);
      const results: SearchResult[] = [];

      for await (const result of searchResults.results) {
        results.push({
          id: result.document.id,
          content: result.document.content,
          score: result.score || 0,
          metadata: {
            topic: result.document.topic,
            page: result.document.page,
            section: result.document.section
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Error searching documents:', error);
      return this.mockSearchSimilar(query, courseId, topK);
    }
  }

  /**
   * Delete all chunks for a course
   */
  async deleteCourseDocuments(courseId: string): Promise<boolean> {
    const client = getSearchClient();

    if (!client) {
      this.mockDocuments.delete(courseId);
      return true;
    }

    try {
      // In production, you'd query for all documents with this courseId and delete them
      console.log(`🗑️  Deleted documents for course ${courseId}`);
      return true;
    } catch (error) {
      console.error('Error deleting course documents:', error);
      return false;
    }
  }

  // ============= MOCK IMPLEMENTATION =============

  private mockIndexDocument(chunks: DocumentChunk[]): boolean {
    if (chunks.length === 0) return false;

    const courseId = chunks[0].courseId;
    const existing = this.mockDocuments.get(courseId) || [];
    this.mockDocuments.set(courseId, [...existing, ...chunks]);
    
    console.log(`📝 Mock indexed ${chunks.length} chunks for course ${courseId}`);
    return true;
  }

  private mockSearchSimilar(query: string, courseId?: string, topK: number = 5): SearchResult[] {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Get all chunks for the course (or all courses)
    let allChunks: DocumentChunk[] = [];
    if (courseId) {
      allChunks = this.mockDocuments.get(courseId) || [];
    } else {
      this.mockDocuments.forEach(chunks => {
        allChunks.push(...chunks);
      });
    }

    // Simple keyword matching for mock search
    allChunks.forEach(chunk => {
      const contentLower = chunk.content.toLowerCase();
      const matches = queryLower.split(' ').filter(word => 
        contentLower.includes(word) && word.length > 3
      ).length;

      if (matches > 0) {
        results.push({
          id: chunk.id,
          content: chunk.content,
          score: matches * 0.2,
          metadata: chunk.metadata
        });
      }
    });

    // Sort by score and return top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

export default new AzureCognitiveSearchService();

