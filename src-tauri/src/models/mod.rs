#[derive(serde::Serialize, serde::Deserialize)]
pub struct Collection {
    pub id: i64,
    pub name: String,
    pub game_id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Card {
    pub id: i64,
    pub collection_id: i64,
    pub name: String,
    pub image_url: String,
    pub qtt: i64
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct  MtgCardPayload {
    pub scryfall_id: String,
    pub name: String,
    pub set_name: String,
    pub rarity: String,
    pub image_url: String,
    pub mana_cost: String,
    pub cmc: i64,
    pub color_identity: String,
    pub type_line: String,
    pub keywords: String,
    pub oracle_text: String,
    pub power: String,
    pub toughness: String,
    pub loyalty: String,
    pub qtt: i64,
}

// pub struct PkmnCardPayload {}
// pub struct YgoCardPayload {}