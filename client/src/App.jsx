import { useState } from "react";

const API_BASE = "http://localhost:4000/api";

function App() {
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Hi! I’m your second brain. First click 'Load demo data', then ask me questions about it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  async function loadDemoData() {
    setLoadingDemo(true);
    try {
      const demoText = `
Project meeting - November:
- Discussed API errors on checkout flow
- Identified performance issues in the recommendation service
- Action items:
  1) Add better logging and monitoring on the API gateway
  2) Implement caching for product recommendations
  3) Prepare a demo for stakeholders next Tuesday
`;
      const res = await fetch(`${API_BASE}/ingest/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: demoText,
          title: "Demo meeting notes",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load demo data");
      }

      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: "Demo data loaded. Try asking: 'What were the action items from the project meeting?'",
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { from: "ai", text: "Failed to load demo data. Check the server is running." },
      ]);
    } finally {
      setLoadingDemo(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { from: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Query failed");
      }

      const data = await res.json();
      const answer = data.answer || "No answer.";
      setMessages((prev) => [...prev, { from: "ai", text: answer }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: "Sorry, something went wrong answering that. Check the server logs.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Second Brain – Demo Chat</h1>
        <button
          style={styles.secondaryButton}
          onClick={loadDemoData}
          disabled={loadingDemo}
        >
          {loadingDemo ? "Loading..." : "Load demo data"}
        </button>
      </header>

      <div style={styles.chatBox}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              ...styles.message,
              alignSelf: m.from === "user" ? "flex-end" : "flex-start",
              backgroundColor: m.from === "user" ? "#DCF8C6" : "#FFFFFF",
            }}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: 4 }}>
              {m.from === "user" ? "You" : "AI"}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.message, opacity: 0.7 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: 4 }}>
              AI
            </div>
            <div>Thinking...</div>
          </div>
        )}
      </div>

      <form style={styles.inputRow} onSubmit={handleSend}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your data..."
        />
        <button style={styles.button} type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    background: "#f5f5f5",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  chatBox: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "8px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    background: "#fafafa",
    marginBottom: "8px",
  },
  message: {
    maxWidth: "70%",
    padding: "8px 12px",
    borderRadius: "12px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    outline: "none",
  },
  button: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    background: "#2563eb",
    color: "white",
    fontWeight: 500,
  },
  secondaryButton: {
    padding: "6px 12px",
    borderRadius: "8px",
    border: "1px solid #2563eb",
    background: "white",
    color: "#2563eb",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 500,
  },
};

export default App;
