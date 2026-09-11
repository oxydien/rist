use serde::Deserialize;

#[derive(Deserialize, FromFormField)]
pub enum ChatBroadcastingType {
    #[serde(rename = "default")]
    #[field(value = "default")]
    Default
}