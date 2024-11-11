import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers'
import type { Env, Params, Note } from '../types'

class RAGError extends Error {
  constructor(message: string, public step: string, public data?: any) {
    super(message);
    this.name = 'RAGError';
  }
}

interface RAGMetrics {
  processingTime: number;
  vectorDimensions: number;
  similarityScore?: number;
}

export class RAGWorkflow extends WorkflowEntrypoint<Env, Params> {
  private metrics: RAGMetrics;

  constructor(public env: Env) {
    super();
    this.metrics = {
      processingTime: 0,
      vectorDimensions: 0
    };
  }

  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const startTime = Date.now();
    const { text, userEmail } = event.payload;
    let record: Note | null = null;

    try {
      // Input validation
      await step.do('validate input', async () => {
        if (!text?.trim()) {
          throw new RAGError('Text is required', 'validation');
        }
        if (!userEmail?.trim()) {
          throw new RAGError('User email is required', 'validation');
        }
      });

      // Preprocess text
      const processedText = await step.do('preprocess text', async () => {
        return text.trim().toLowerCase();
      });

      // Create database record
      record = await step.do('create database record', async () => {
        const query = `
          INSERT INTO notes (text, userEmail, created_at, version)
          VALUES (?, ?, ?, ?)
          RETURNING *
        `;
        const { results } = await this.env.DATABASE.prepare(query)
          .bind(
            processedText,
            userEmail as string,
            new Date().toISOString(),
            1
          )
          .run<Note>();

        if (!results?.[0]) {
          throw new RAGError('Failed to create note', 'database');
        }
        return results[0];
      });

      // Generate embedding
      const embedding = await step.do('generate embedding', async () => {
        const embeddings = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: [processedText]
        });

        const values = embeddings.data[0];
        if (!values) {
          throw new RAGError('Failed to generate vector embedding', 'ai');
        }

        this.metrics.vectorDimensions = values.length;
        return values;
      });

      // Insert vector
      await step.do('insert vector', async () => {
        const response = await this.env.VECTOR_INDEX.upsert([{
          id: record!.id.toString(),
          values: embedding,
          metadata: {
            userEmail: userEmail as string,
            created_at: new Date().toISOString(),
            version: 1
          }
        }]);

        if (!response) {
          throw new RAGError('Failed to insert vector', 'vectordb');
        }
      });

      this.metrics.processingTime = Date.now() - startTime;
      await this.logMetrics();

      return {
        success: true,
        noteId: record.id,
      };

    } catch (error) {
      console.error('RAG Workflow error:', error);

      // Rollback on failure
      if (record?.id) {
        await this.rollback(record.id);
      }

      throw error instanceof RAGError ? error : new RAGError(
        (error instanceof Error ? error.message : 'Unknown error'),
        'unknown',
        error
      );
    }
  }

  private async rollback(noteId: string): Promise<void> {
    const errors: Error[] = [];

    try {
      // Delete note
      await this.env.DATABASE.prepare('DELETE FROM notes WHERE id = ?')
        .bind(noteId)
        .run();
    } catch (error) {
      errors.push(error as Error);
    }

    try {
      // Delete vector
      await this.env.VECTOR_INDEX.deleteByIds([noteId]);
    } catch (error) {
      errors.push(error as Error);
    }

    if (errors.length > 0) {
      console.error('Rollback errors:', errors);
    }
  }

  private async logMetrics(): Promise<void> {
    try {
      await this.env.DATABASE.prepare(`
        INSERT INTO rag_metrics (
          processing_time,
          vector_dimensions,
          similarity_score,
          timestamp
        ) VALUES (?, ?, ?, ?)
      `)
      .bind(
        this.metrics.processingTime,
        this.metrics.vectorDimensions,
        this.metrics.similarityScore || 0,
        new Date().toISOString()
      )
      .run();
    } catch (error) {
      console.error('Failed to log metrics:', error);
    }
  }
}
