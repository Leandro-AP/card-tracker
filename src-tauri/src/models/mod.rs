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
    pub name: String,
    pub collection_id: i64,
    pub qtt: i64
}