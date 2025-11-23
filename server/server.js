import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// --- App ---
const app = express();
const PORT = process.env.PORT || 4000;

// --- Gemini client ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// We'll use these two models:
// - text-embedding-004 for embeddings
// - gemini-2.5-flash for answering questions
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});
const qaModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
});

// In-memory "DB"
let sources = []; // { id, userId, title, modality, contentTime, createdAt }
let chunks = [];  // { id, userId, sourceId, content, embedding, createdAt, contentTime }

let nextSourceId = 1;
let nextChunkId = 1;

const DEMO_USER_ID = 1; // single demo user

// Helpers

async function embedText(text) {
  const result = await embeddingModel.embedContent(text);
  // Gemini embeddings live here:
  return result.embedding.values;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

function chunkText(text, maxTokensApprox = 500) {
  // Very rough split: 4 chars per token
  const approxChars = maxTokensApprox * 4;
  const chunksArr = [];
  for (let i = 0; i < text.length; i += approxChars) {
    chunksArr.push(text.slice(i, i + approxChars));
  }
  return chunksArr;
}

// middleware

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health Check

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ingestion plain text

app.post("/api/ingest/text", async (req, res) => {
  try {
    const { text, title, contentTime } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "text is required" });
    }

    const now = new Date().toISOString();
    const sourceId = nextSourceId++;

    sources.push({
      id: sourceId,
      userId: DEMO_USER_ID,
      title: title || "Untitled",
      modality: "text",
      contentTime: contentTime || now,
      createdAt: now,
    });

    const textChunks = chunkText(text);
    let added = 0;

    for (const raw of textChunks) {
      const content = raw.trim();
      if (!content) continue;

      const embedding = await embedText(content);

      chunks.push({
        id: nextChunkId++,
        userId: DEMO_USER_ID,
        sourceId,
        content,
        embedding,
        createdAt: now,
        contentTime: contentTime || now,
      });
      added++;
    }

    res.json({ ok: true, sourceId, chunksAdded: added });
  } catch (err) {
    console.error("Error in /api/ingest/text:", err);
    res.status(500).json({ error: "failed to ingest text" });
  }
});

// Query (Q&A)

app.post("/api/query", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    if (chunks.length === 0) {
      return res.status(400).json({ error: "no data ingested yet" });
    }

    // 1) Embed question
    const questionEmbedding = await embedText(question);

    // 2) Score all chunks for this user
    const scored = chunks
      .filter((c) => c.userId === DEMO_USER_ID)
      .map((c) => ({
        chunk: c,
        score: cosineSimilarity(questionEmbedding, c.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const contextText = scored
      .map(
        (s, idx) =>
          `Chunk ${idx + 1} (score=${s.score.toFixed(3)}):\n` + s.chunk.content
      )
      .join("\n\n---\n\n");

    const systemPrompt = `
You are a personal AI assistant that acts as a "second brain".
You are given the user's question and some context snippets from their own data.
Answer concisely in natural language using ONLY the provided context. 
If the answer is not in the context, say you don't know.`;

    const prompt = `System instructions:\n${systemPrompt}\n\nUser question: ${question}\n\nContext:\n${contextText}`;

    let answer;

    // 3) Try Gemini LLM
    try {
      const result = await qaModel.generateContent(prompt);
      answer = result.response.text();
    } catch (modelErr) {
      console.error("Gemini QA error:", modelErr);
      // Fallback: still show the raw context instead of crashing
      answer =
        "I had an issue calling the AI model, but here are the most relevant notes I found:\n\n" +
        contextText;
    }

    res.json({
      answer,
      contextUsedCount: scored.length,
    });
  } catch (err) {
    console.error("Error in /api/query:", err);
    res.status(500).json({ error: "failed to answer query" });
  }
});



// start the server

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
