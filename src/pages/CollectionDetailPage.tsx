import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import "../App.css";
import { ArrowBigLeft, Plus } from "lucide-react";

import { Collection } from "../types/collections";
import { MagicTG, Pokemon, Yugioh } from "../types/cards";

import MtgSearchModal from "../components/mtg/MtgSearchModal";



export default function CollectionDetailPage() {
    //console.log("===    COLLECTION DETAIL PAGE MOUNTED  ===");

    const navigate = useNavigate();
    const { id } = useParams();
    const collectionId = id ? parseInt(id, 10) : null;

    if (!collectionId || Number.isNaN(collectionId)) {
        console.error("Invalid collection ID");
        navigate(-1);
        return;
    }

    const [collection, setCollection] = useState<any>(null);
    const [showSearchModal, setShowSearchModal] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {

                // Fetch collection details from database
                const result = await invoke<Collection>("get_collection", { collectionId: (id ? parseInt(id) : 0) });
                await setCollection(result);
                console.log(result);
            } catch (err) {
                console.error("Error invoking get_collection:", err)
            }
        };
        init();
    }, [id]);

    // Collection cards - never touched by search
    const [cards, setCards] = useState<any[]>([]);  // Dynamic list cards

    useEffect(() => {
        if(!collection) return;
        const fethcCards = async () => {
            try {
                // Fetch collection cards
                switch (collection.game_id) {
                    case "MtG":
                        const mCards = await invoke<MagicTG[]>("get_cards", { collectionId: (id ? parseInt(id) : 0), gameId: collection.game_id });
                        setCards(mCards);
                        break;
                    case "PKMN":
                        const pCards = await invoke<Pokemon[]>("get_cards", { collectionId: (id ? parseInt(id) : 0), gameId: collection.game_id });
                        setCards(pCards);
                        break;
                    case "YGO":
                        const yCards = await invoke<Yugioh[]>("get_cards", { collectionId: (id ? parseInt(id) : 0), gameId: collection.game_id });
                        setCards(yCards);
                        break;
                    default:
                        console.error("Unkwon game type ", collection.game_id);
                }

            } catch (err) {
                console.error("Error invoking get_cards:", err);
            }
        }
        fethcCards();
    }, [collection])

    return (
        <div className="container">
            <div className="topDisplay">
                <button onClick={() => navigate(-1)}><ArrowBigLeft /></button>

                {collection ? (
                    <>
                        <h1>{collection.name}</h1>
                        <div>
                            <span>Created: {new Date(collection.created_at).toLocaleDateString()}</span>
                            {new Date(collection.created_at).toLocaleDateString() !==
                                new Date(collection.updated_at).toLocaleDateString() && (
                                    <span>Last Updated: {new Date(collection.updated_at).toLocaleDateString()}</span>
                                )}
                        </div>
                    </>
                ) : (
                    <h1>Loading...</h1>
                )}
            </div>

            <div className="cDisplay">
                <div className="card add-card" onClick={() => setShowSearchModal(true)}>
                    <Plus size={64} strokeWidth={2} />
                </div>


                {cards.map((card) => (
                    <div key={card.id}>
                        {/* TODO: card tile */}
                    </div>
                ))}
            </div>

            {/*Modal*/}
            {showSearchModal && collection?.game_id === "MtG" && (
                <MtgSearchModal
                    collectionId={collectionId}
                    onClose={() => setShowSearchModal(false)}
                    onCardAdded={(card) => setCards(prev => [...prev, card])}
                />
            )}
        </div>
    );
}