# cloudflare-retrieval-augmented-generation-example

This repo shows how to build a Retrieval Augmented Generation (RAG) application using Cloudflare Workers AI. It uses Cloudflare Workflows, D1, and Vectorize to store notes that can be used to generate context for the RAG model.

## Installation/Setup

You must have a Cloudflare account and the `wrangler` CLI installed (or use `npx wrangler`).

Clone the repo and install dependencies:

```bash
$ git clone https://github.com/cloudflare/cloudflare-retrieval-augmented-generation-example.git
$ cd cloudflare-retrieval-augmented-generation-example
$ npm install
```

Generate a new database and vector index:

```bash
$ wrangler d1 create DATABASE
$ wrangler vectorize:index create VECTOR_INDEX --preset "@cf/baai/bge-base-en-v1.5"
```

Apply the migration to create the `notes` table in D1:

```bash
$ wrangler d1 migrations apply DATABASE

# Apply in production
$ wrangler d1 migrations apply DATABASE --remote
```

Add the configuration to `wrangler.toml`, replacing my values with your own:

```toml
[[d1_databases]]
binding = "DATABASE"
database_name = "<your database name>"
database_id = "<your database id>"

[[vectorize]]
binding = "VECTOR_INDEX"
index_name = "<your vector index name>"
```

Deploy the application:

```bash
$ npm run deploy
```

## Usage

After deploying, you can use the following routes:
-`/` home page
- `/query` is an endpoint that accepts a `?text` query param and returns a response from the model.
- `/ui` is a form UI that allows you to ask the AI a question and get a response.
- `/write` is a form UI that allows you to add a note to the AI's knowledge base.
- `/notes` is a list of all the notes in the AI's knowledge base.
- `/notes.json` is a JSON endpoint that returns all the notes in the AI's knowledge base.

## Tutorial

This project was created as part of a tutorial on [Building a Retrieval Augmented Generation (RAG) Application with Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/tutorials/build-a-retrieval-augmented-generation-ai/).

