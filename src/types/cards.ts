export interface MagicTG {
    id: number;
    scryfall_id: string; 

    name: string;
    set_name: string;
    rarity: string;
    image_url: string;

    mana_cost: string;
    cmc: string;
    color_identity: string;
    type_line: string;
    
    keywords: string; 
    oracle_text: string; 

    power: number;
    toughness: number;
    loyalty: number;

    qtt: number;
}

export interface Pokemon {
    //TODO
}

export interface Yugioh {
    //TODO
}

export interface CollectionCard {   // Mirrors collection_cards table
    id: number;
    collection_id: number;
    game_id: string;
    card_id: number;
    qtt: number;
}

export interface CollectionCardDetail<T> {
    collection_card_id: number;
    qtt: number;
    card: T;
}