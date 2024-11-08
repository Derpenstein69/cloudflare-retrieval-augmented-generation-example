import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers'
import type { Env, Params, Note } from '../types'

export class RAGWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const env = this.env
    const { text, userEmail } = event.payload; // Add userEmail to payload

    try {
      const record = await step.do('create database record', async () => {
        const query = "INSERT INTO notes (text, userEmail) VALUES (?, ?) RETURNING *"
        const { results } = await env.DATABASE.prepare(query)
          .bind(text, userEmail)
          .run<Note>()

        if (!results?.[0]) throw new Error("Failed to create note");
        return results[0];
      });

      const embedding = await step.do('generate embedding', async () => {
        const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: text })
        const values = embeddings.data[0]
        if (!values) throw new Error("Failed to generate vector embedding")
        return values
      })

      await step.do('insert vector', async () => {
        return env.VECTOR_INDEX.upsert([
          {
            id: record.id.toString(),
            values: embedding,
          }
        ]);
      })
    } catch (error) {
      console.error('RAG Workflow error:', error);
      throw error;
    }
  }
}