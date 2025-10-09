import { useEffect, useState } from "react";
import { initDB, addCard } from "./lib/tauri";
import "./App.css";

function App() {
  const [cardName, setCardName] = useState("");
  const [status, setStatus] = useState("Idle");

  // Initialize database on app load
  useEffect(() => {
    initDB()
      .then(() => setStatus("Database initialized"))
      .catch((err) => setStatus(`Error: ${err}`));
  }, []);

  async function handleAddCard() {
    if (!cardName.trim()) return;
    try {
      await addCard("mtg", cardName);
      setStatus(`Added card: ${cardName}`);
      setCardName("")
    } catch (err) {
      setStatus(`Error: ${err}`)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Card Tracker</h1>
      <input
        type="text"
        value={cardName}
        onChange={(e) => setCardName(e.target.value)}
        placeholder="Enter card name"
        className="border px-3 py-1 mr-2"
      />
      <button
        onClick={handleAddCard}
        className="bg-blue-500 text-white px-4 py-1 rounded"
      >
        Add Card
      </button>

      <p className="mt-4 text-gray-700">{status}</p>
    </div>
  );
}

export default App;
