
export type Env = {
  AI: Ai;
  DATABASE: D1Database;
  RAG_WORKFLOW: Workflow;
  VECTOR_INDEX: VectorizeIndex;
  JWT_SECRET: string;
  USERS_KV: KVNamespace;
  SESSIONS_DO: DurableObjectNamespace;
};

export type Note = {
  id: string;
  text: string;
}

export type Params = {
  text: string;
};