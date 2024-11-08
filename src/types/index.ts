export type Env = {
  AI: Ai;
  DATABASE: D1Database; // Ensure DATABASE is defined
  RAG_WORKFLOW: Workflow;
  VECTOR_INDEX: VectorizeIndex;
  USERS_KV: KVNamespace;
  SESSIONS_DO: DurableObjectNamespace;
};

export type Note = {
  id: string;
  text: string;
};

export type Params = {
  text: string;
};

export type User = {
  email: string;
  password: string; // This should be the hashed password
};