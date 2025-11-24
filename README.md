 Second Brain – Personal AI Companion

This project is a small prototype of a "second brain" – a personal AI system that can ingest information, remember it, and answer questions about it later using semantic search and an LLM-style flow.

The goal is to show the end-to-end architecture clearly:
ingestion - chunking - embeddings - storage - retrieval - answer.

This was built as a 48-hour take-home assignment, so the focus is on system design, retrieval quality, and clean structure rather than feature completeness.

---

## 1. Project Structure

The repository is organized as a simple monorepo with frontend and backend:

- 'server' and 'client'

The backend exposes a small API for ingestion and querying.  
The frontend provides a minimal chat-style interface to interact with the system.

---

## 2. High-Level Architecture

The system follows a simple pipeline:

1. The user sends text (for now) to be ingested.
2. The backend splits the text into smaller chunks.
3. Each chunk is converted into an embedding using a model (Gemini embeddings in this prototype).
4. Chunks and embeddings are stored in memory with metadata.
5. When the user asks a question, the question is embedded.
6. The system computes similarity between the question embedding and all chunk embeddings.
7. The most relevant chunks are returned as the "answer" (or used as context for an LLM in a full version).

The design also accounts for other modalities (audio, PDFs, web pages, images) by converting everything into text first, then passing it through the same pipeline.

---

## 3. Backend (server)

### 3.1 Overview

The backend is a Node.js/Express app located in the `server/` folder.

Key responsibilities:

- Expose ingestion and query endpoints
- Chunk incoming content
- Generate embeddings
- Store chunks and metadata in memory
- Perform semantic search using cosine similarity

### 3.2 API Endpoints

Base URL (local):  
`http://localhost:4000`

Endpoints:

- `GET /api/health`  
  Simple health check. Returns a JSON payload indicating the server is running.

- `POST /api/ingest/text`  
  Ingests raw text into the "second brain".

  Example body:
  ```json
  {
    "text": "Project meeting - November: discussed API errors...",
    "title": "Project meeting notes",
    "contentTime": "2025-11-20T10:00:00.000Z"
  }
The server will:

chunk the text

embed each chunk

store chunks and metadata in memory

POST /api/query
Answers a user question using semantic search.

Example body:

json
Copy code
{
  "question": "What were the action items from the project meeting?"
}
The server will:

embed the question

compute similarity against all stored chunks

sort results by similarity

return the most relevant chunks as the answer

In the ideal case, these top chunks can be passed into an LLM to generate a natural-language summary. Due to free model limitations, this prototype focuses on returning the relevant chunks directly.

3.3 Environment Variables
The backend expects:

GOOGLE_API_KEY – Gemini API key (for embeddings)

PORT (optional) – defaults to 4000 if not set

A .env file inside the server/ folder:

bash
Copy code
cd server
echo GOOGLE_API_KEY=your_gemini_key_here > .env
echo PORT=4000 >> .env
Note: .env should be in .gitignore and must not be committed.

4. Frontend (client)
4.1 Overview
The frontend is a React app created with Vite, located in the client/ folder.

Features:

Simple chat-style interface

"Load demo data" button to ingest a sample meeting note

Input box to ask questions

Displays answers returned by the backend

4.2 API Base URL
The frontend uses an environment variable to know where the backend lives.

In client/src/App.jsx, the base URL is read from:

js
Copy code
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";
For local development:

It falls back to http://localhost:4000/api

For production (e.g., Vercel):

Set VITE_API_BASE in the deployment environment to your backend’s public URL, for example:
https://your-backend-service.up.railway.app/api

5. Running the Project Locally
5.1 Start the backend
From the project root:

bash
Copy code
cd server
npm install
Set up .env inside server/:

bash
Copy code
GOOGLE_API_KEY=your_gemini_key_here
PORT=4000
Then start the server:

bash
Copy code
npm start
The backend will be available at:

http://localhost:4000

Check:

http://localhost:4000/api/health

You should see a small JSON response.

5.2 Start the frontend
Open a second terminal from the project root:

bash
Copy code
cd client
npm install
npm run dev
Vite will start the frontend on:

http://localhost:5173

Open that in your browser.

6. How to Use the Demo
Open the frontend in the browser.

Click on the "Load demo data" button.
This sends a request to the backend to ingest a sample meeting note.

In the input box, type a question, for example:

What were the action items from the project meeting?

What issues were discussed?

The system will:

embed the question

perform semantic search over the stored chunks

return the most relevant text as the answer

This demonstrates the full pipeline: ingestion → embeddings → retrieval → answer.

7. Design Decisions and Trade-offs
The prototype focuses on plain text ingestion and semantic search.
Audio, documents, web pages, and images are accounted for in the design but not fully implemented in code due to time and free API constraints.

Storage is in-memory for simplicity in this version.
In a real deployment, this would move to a persistent store (for example, Postgres with pgvector or a vector database like Qdrant or Pinecone).

Answers are currently formed from the most relevant chunks rather than fully generated natural language.
In production, these chunks would be passed into an LLM to synthesize a concise answer. The code is structured so that this can be added easily.

The architecture supports temporal queries by associating timestamps with sources and chunks.
A future enhancement would parse natural language time expressions (like “last week”) and apply date filters before semantic retrieval.

8. Future Improvements
Some natural next steps:

Full PDF, audio, and web URL ingestion and preprocessing

Persistent storage with a vector index

True LLM-based summarization based on the top retrieved chunks

User authentication and multi-user separation

Better UI for inspecting sources and context

9. License
This project was built as part of a take-home assignment and is intended for demonstration and review.


