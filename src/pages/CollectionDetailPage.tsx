import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import "../App.css";
import { ArrowBigLeft, Plus } from "lucide-react";

import { Collection } from "../types/collections";
import { MagicTG, Pokemon, Yugioh } from "../types/cards";

type ManaFilter = {
        W: number;
        U: number;
        B: number;
        R: number;
        G: number;
        C: number;
}

function ManaSelector({ mana, setMana }: {mana: ManaFilter; setMana: React.Dispatch<React.SetStateAction<ManaFilter>> }) {
    const MAX = 6

    const MANA_SYMBOLS: Record<string, string> = {
        W: "https://svgs.scryfall.io/card-symbols/W.svg",
        U: "https://svgs.scryfall.io/card-symbols/U.svg",
        B: "https://svgs.scryfall.io/card-symbols/B.svg",
        R: "https://svgs.scryfall.io/card-symbols/R.svg",
        G: "https://svgs.scryfall.io/card-symbols/G.svg",
        C: "https://svgs.scryfall.io/card-symbols/C.svg",
    }

    const update = (color: keyof ManaFilter, delta: number) => {
        setMana(prev => ({ ...prev, [color]: Math.min(MAX, Math.max(0, prev[color] + delta)) }))
    }

    return (
        <div className="mana-selector">
            {(Object.keys(mana) as (keyof ManaFilter)[]).map((color) => (
                <div key={color} className="mana-column">
                    <button onClick={() => update(color, 1)} disabled={mana[color] >= MAX}>▲</button>
                    <div className="mana-count-row">
                        <span>{mana[color as keyof typeof mana]}</span>
                        <img
                            src={MANA_SYMBOLS[color]}
                            alt={color}
                            className="mana-symbol"
                        />
                    </div>
                    <button onClick={() => update(color, -1)} disabled={mana[color] <= 0}>▼</button>
                </div>
            ))}
        </div>
    )
}

// ____________________________________________________________________________________

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
                        setSearchResults(mCards);
                        break;
                    case "PKMN":
                        const pCards = await invoke<Pokemon[]>("get_cards", { collectionId: (id ? parseInt(id) : 0), gameId: collection.game_id });
                        setSearchResults(pCards);
                        break;
                    case "YGO":
                        const yCards = await invoke<Yugioh[]>("get_cards", { collectionId: (id ? parseInt(id) : 0), gameId: collection.game_id });
                        setSearchResults(yCards);
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

    const [showModal, setShowModal] = useState(false);
    const [searchMode, setSearchMode] = useState<"name" | "set" | "type" | "mana">("name")
    const [searchValue, setSearchValue] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [card, setCard] = useState<any[]>([])
    const [hoveredCard, setHoveredCard] = useState<any>(null)

    const [manaFilter, setManaFilter] = useState({
        W: 0,
        U: 0,
        B: 0,
        R: 0,
        G: 0,
        C: 0
    })
    const [typeFilter, setTypeFilter] = useState<Record<string, boolean>>({
        Creature: false,
        Artifact: false,
        Enchantment: false,
        Land: false,
        Planeswalker: false,
        Battle: false,
        Instant: false,
        Sorcery: false,
    })

    const buildQuery = () => {
        switch (searchMode) {
            case "name":
                return `q=${encodeURIComponent(searchValue)}`
            case "set":
                return `q=set:${encodeURIComponent(searchValue)}`
            case "type":
                const selected = Object.entries(typeFilter).filter(([_, v]) => v).map(([t]) => t)
                if (selected.length === 0) return ""
                return `q=${encodeURIComponent(selected.map(t => `t:${t}`).join(" OR "))}`
            case "mana":
                const parts = Object.entries(manaFilter)
                    .filter(([_, value]) => value > 0)
                    .map(([color, value]) => {
                        if (color === "C") return `mana>=${value}`
                        return `mana>=${color.repeat(value)}`
                    })
                if (parts.length === 0) return ""
                return `&q=${parts.join(" ")}`
            default:
                return ""
        }
    }

    useEffect(() => {
        if (!showModal) return

        const delay = setTimeout(() => {
            fetchSearchResults()
        }, 300)

        return () => clearTimeout(delay)
    }, [searchValue, manaFilter, searchMode, typeFilter])

    const fetchSearchResults = async () => {
        const query = buildQuery()
        if (!query) return

        const response = await fetch(
            `https://api.scryfall.com/cards/search?${query}&order=name&unique=cards`
        )

        const data = await response.json()

        if (data.data) {
            setSearchResults(data.data.slice(0, 20))    // 20 card limit
        }
    }

    function getCardImages(card: any): string[] {
        if (card.image_uris?.normal) return [card.image_uris.normal]
        if (card.card_faces) return card.card_faces.map((f: any) => f.image_uris?.normal).filter(Boolean)
        return []
    }

    const handleAddCard = async () => {
        //Exit if no card was selected

        await invoke("add_card")
    }

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
                <div className="card add-card" onClick={() => setShowModal(true)}>
                    <Plus size={64} strokeWidth={2} />
                </div>


                {searchResults ? (
                    <>

                    </>
                ) : (
                    <h1>Waiting for cards</h1>
                )}
            </div>

            {/*Modal*/}
            {showModal && (
                <div className="modal-backdrop modal-backdrop-wide" onClick={() => setShowModal(false)}>
                    <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
                        <h2>Add Card</h2>
                        <select
                            value={searchMode}
                            onChange={(e) => {
                                setSearchMode(e.target.value as any)
                                setSearchValue("")
                                setSearchResults([])
                                setTypeFilter(Object.fromEntries(Object.keys(typeFilter).map(k => [k, false])))
                                setManaFilter({W: 0, U: 0, B: 0, R: 0, G: 0, C: 0})
                            }}
                        >
                            <option value="name">Name</option>
                            <option value="set">Set</option>
                            <option value="type">Type</option>
                            <option value="mana">Mana Cost</option>
                        </select>

                        {searchMode !== "mana" && searchMode !== "type" && (
                            <input
                                type="text"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder="Search..."
                                autoFocus
                            />
                        )}

                        {searchMode === "type" && (
                            <div className="type-selector">
                                {Object.keys(typeFilter).map((type) => (
                                    <label key={type} className="type-checkbox">
                                        <input 
                                            type="checkbox"
                                            checked={typeFilter[type]}
                                            onChange={() => 
                                                setTypeFilter(prev => ({ ...prev, [type]: !prev[type] }))
                                            }
                                        />
                                        {type}
                                    </label>
                                ))}
                            </div>
                        )}

                        {searchMode === "mana" && (
                            <ManaSelector mana={manaFilter} setMana={setManaFilter} />
                        )}

                        <div className="modal-card-list">
                            {searchResults.map((card) => {
                                const [front] = getCardImages(card) 
                                return front && (
                                    <img
                                        key={card.id}
                                        src={front}
                                        alt={card.name}
                                        className="modal-card-image"
                                        loading="lazy"
                                        onMouseEnter={() => setHoveredCard(card)}
                                        onMouseLeave={() => setHoveredCard(null)}
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {hoveredCard && (
                        <div className="modal-preview">
                            {getCardImages(hoveredCard).map((src, i) => (
                                <img key={i} src={src} alt={`${hoveredCard.name} face ${i + 1}`} className={getCardImages(hoveredCard).length > 1 ? "modal-preview-img--dfc" : ""} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}