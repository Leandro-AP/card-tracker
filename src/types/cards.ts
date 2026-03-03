export interface MagicTG {
    id: number;
    collection_id: number; 

    name: string;
    set_name: string;
    rarity: string;
    qtt: number;
    image_url: string;

    mana_cost: string;  // Format example: '3colorless|2blue|1white'
    color_identity: string; // Format example: 'blue|white'
    typr_line: string;
    
    traits: string; // 'Flying|Haste|etc'
    habilities: string; // 'Tap|Pay 1 and tap to do something'
    effects: string;    // Instant|Sorcery|Enchantment effect or creature conditional effect

    power: number;
    toughness: number;
    loyalty: number;
}

export interface Pokemon {
    //TODO
}

export interface Yugioh {
    //TODO
}