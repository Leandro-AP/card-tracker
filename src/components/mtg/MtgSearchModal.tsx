import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MagicTG } from "../../types/cards";
import { integer } from "drizzle-orm/gel-core";

type ManaFilter = {
    W: number; U: number; B: number;
    R: number; G: number; C: number;
}

function ManaSelector({ mana, setMana}: {
    mana: ManaFilter;
    setMana: React.Dispatch<React.SetStateAction<ManaFilter>>
}) {
    const MIN = -1
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
        setMana(prev => ({
            ...prev,
            [color]: Math.min(MAX, Math.max(MIN, prev[color] + delta))
        }))
    }

    return (
        <div className="mana-selector">
            {(Object.keys(mana) as (keyof ManaFilter)[]).map((color) => {
                const displayValue = (val: number) => val === -1 ? "★" : val.toString()
                return (
                    <div key={color} className="mana-column">
                        <button onClick={() => update(color, 1)} disabled={mana[color] >= MAX}>▲</button>
                        <div className="mana-count-row">
                            <span
                                title={mana[color] === -1 ? `Any` : mana[color] === 0 ? `None` : `At least`}
                                style={{ color: mana[color] === 0 ? "#888" : "inherit" }}
                            >
                                {displayValue(mana[color])}
                            </span>
                            <img 
                                src={MANA_SYMBOLS[color]}
                                alt={color}
                                className="mana-symbol"
                                style={{ opacity: mana[color] === 0 ? 0.4 : 1 }}
                            />
                        </div>
                        <button onClick={() => update(color, -1)} disabled={mana[color] <= MIN}>▼</button>
                    </div>
                )
            })}
        </div>
    )
}

// ------------------------------------

interface Props {
    collectionId: number;
    onClose: () => void;
    onCardAdded: (card: MagicTG) => void;
}

export default function MtgSearchModal({ collectionId, onClose, onCardAdded}: Props) {
    const [searchMode, setSearchMode] = useState<"name" | "set" | "type" | "mana">("name")
    const [searchValue, setSearchValue] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [hoveredCard, setHoveredCard] = useState<any>(null)
    const [nextPage, setNextPage] = useState<string | null>(null)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const cardListRef = useRef<HTMLDivElement>(null)

    const [manaFilter, setManaFilter] = useState<ManaFilter>({ 
        W: -1, U: -1, B: -1, R: -1, G: -1, C: -1
    })

    const [typeFilter, setTypeFilter] = useState<Record<string, boolean>>({
        Creature: false, Artifact: false, Enchantment: false, Land: false,
        Planeswalker: false, Battle: false, Instant: false, Sorcery: false,
    })

    const buildQuery = () => {
        switch(searchMode) {
            case "name":
                if (!searchValue) return `q=${encodeURIComponent("a e")}`
                return `q=${encodeURIComponent(`name:"${searchValue}"`)}`
            case "set":
                if (!searchValue) return `q=${encodeURIComponent("a e")}`
                return `q=set:${encodeURIComponent(searchValue)}`
            case "type":
                const selected = Object.entries(typeFilter).filter(([_, v]) => v).map(([t]) => t)
                if (selected.length === 0) return `q=${encodeURIComponent("a e")}`
                return `q=${encodeURIComponent(selected.map(t => `t:${t}`).join(" OR "))}`
            case "mana":
                const parts = Object.entries(manaFilter)
                .filter(([_, value]) => value >= 0)
                .map(([color, value]) => {
                    if (value === 0) return color === "C" ? `-mana>=1` : `-c:${color}`
                    if (color === "C") return `mana>=${value}`
                    return `mana>=${color.repeat(value)}`
                })
                const manaQ = parts.length > 0
                    ? `${parts.join(" ")} -t:Land`
                    : `-t:Land`
                return `&q=${encodeURIComponent(manaQ)}`
            default:
                return ""
        }
    }

    useEffect(() => {
        const delay = setTimeout(() => {fetchSearchResults() }, 300)
        return () => clearTimeout(delay)
    }, [searchValue, manaFilter, searchMode, typeFilter])

    const fetchSearchResults = async () => {
        const query = buildQuery()
        if (!query) return
        
        const response = await fetch(`https://api.scryfall.com/cards/search?${query}&order=name&unique=cards`)
        const data = await response.json()

        if (data.data) {
            setSearchResults(data.data)
            setNextPage(data.has_more ? data.next_page : null)
        }
    }

    const fetchNextPage = async () => {
        if (!nextPage || isLoadingMore) return
        setIsLoadingMore(true)

        const data = await fetch(nextPage).then(r => r.json())

        setSearchResults(prev => [...prev, ...data.data])
        setNextPage(data.has_more ? data.next_page : null)
        setIsLoadingMore(false)
    }

    const onCardListScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) fetchNextPage()
    }

    function getCardImages(card: any): string[] {
        if (card.image_uris?.normal) return [card.image_uris.normal]
        if (card.card_faces) return card.card_faces.map((f: any) => f.image_uris.normal).filter(Boolean)
        return []
    }

    const handleAddCard = async (scryfallCard: any) => {
        console.log("Tried to add card: " + scryfallCard.name)
        // TODO: map scryfallCard to MagicTG
        // await invoke("add_card", { collectionId, gameId: "MtG", ...mappedFields})
        // onCardAdded(mappedCard)
    }

    return (
        <div className="modal-backdrop modal-backdrop-wide" onClick={onClose}>
            <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
                <h2>Add Card</h2>
                <select
                    className="searchSelect"
                    value={searchMode}
                    onChange={(e) => {
                        setSearchMode(e.target.value as any)
                        setSearchValue("")
                        setSearchResults([])
                        setTypeFilter(Object.fromEntries(Object.keys(typeFilter).map(k => [k, false])))
                        setManaFilter({ W: -1, U: -1, B: -1, R: -1, G: -1, C: -1 })
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
                                    onChange={() => setTypeFilter(prev => ({ ...prev, [type]: !prev[type] }))}
                                />
                                {type}
                            </label>
                        ))}
                    </div>
                )}

                {searchMode === "mana" && (
                    <ManaSelector mana={manaFilter} setMana={setManaFilter} />
                )}

                <div className="modal-card-list" ref={cardListRef} onScroll={onCardListScroll}>
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
                                onClick={() => handleAddCard(card)}
                            />
                        )
                    })}
                </div>
            </div>

            {hoveredCard && (
                <div className="modal-preview">
                    {getCardImages(hoveredCard).map((src, i) => (
                        <img
                            key={i}
                            src={src}
                            alt={`${hoveredCard.name} face ${i + 1}`}
                            className={getCardImages(hoveredCard).length > 1 ? "modal-preview-img--dfc" : ""}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}