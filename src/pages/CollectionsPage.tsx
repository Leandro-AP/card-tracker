import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import "../App.css";
import { Plus } from "lucide-react";

import { Collection } from "../types/collections";

interface GameInfo {
  name: String;
  image: String;
}

const GAME_INFO: Record<string, GameInfo> = {
  MtG: { name: "Magic: The Gathering", image: "/images/MtG.jpg" },
  PKMN: { name: "Pokémon", image: "/images/PKMN.jpg" },
  YGO: { name: "Yu-Gi-Oh!", image: "/images/YGO.png" },
};

export default function CollectionsPage() {
    const navigate = useNavigate();

    const [collections, setCollections] = useState<Collection[]>([]);

  React.useEffect(() => {
    const init = async () => {
      await invoke("init_db");

      // temp
      if (import.meta.env.DEV) {
        const schema = await invoke("debug_schema");
        console.log("[debug_schema]", schema);
      }

      const result = await invoke<Collection[]>("get_collections");
      setCollections(result);
      console.log(result)
    }
    init();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");

  const handleAddCollection = async () => {
    if (!name.trim() || !type.trim()) return;
    await invoke("add_collection", { name, gameId: type })
    const updated = await invoke<Collection[]>("get_collections");
    setCollections(updated);
    setShowModal(false);
    setName("");
    setType("");
  };

  return (
    <div className="container">
      <h1>My Collections</h1>

      <div className="cDisplay">
        {/* Add New Collection Card */}
        <div className="card add-card" onClick={() => setShowModal(true)}>
          <Plus size={64} strokeWidth={2} />
        </div>

        {/* Existing Collection Cards */}
        {collections && (collections.map((c) => ( // Insert collections if any exist
          <div id={"cc-"+c.id} key={c.id} className="card collection-card" style={{
            backgroundImage: GAME_INFO[c.game_id] ? `url(${GAME_INFO[c.game_id].image})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          onClick={() => navigate(`/collection/${c.id}`)}>
            <div className="card-overlay">
              <div className="card-content">
                <h3 className="collection-name">{c.name}</h3>
                <div className="collection-info">
                  {/* <p>Type: {GAME_INFO[c.game_id].name || c.game_id}</p> */}
                  <p>
                    Created: {new Date(c.created_at).toLocaleDateString()} <br />
                    {new Date(c.created_at).toLocaleDateString() !==
                      new Date(c.updated_at).toLocaleDateString() && (  // Only show updated date when it is different from created date
                        <>
                          <br />
                          Updated: {new Date(c.updated_at).toLocaleDateString()}
                        </>
                      )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Collection</h2>
            <input
              type="text"
              placeholder="Collection name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Select card type</option>
              <option value="MtG">Magic: The Gathering</option>
              <option value="PKMN">Pokémon</option>
              <option value="YGO">Yu-Gi-Oh!</option>
            </select>
            <button onClick={handleAddCollection}>Add Collection</button>
          </div>
        </div>
      )}
    </div>
  );
}