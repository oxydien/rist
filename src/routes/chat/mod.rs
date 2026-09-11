mod chat_types;

use std::sync::Arc;
use std::time::Duration;
use rist_chat::RistChat;
use rocket::futures::{SinkExt, StreamExt};
use rocket_ws::{Channel, Message, WebSocket};
use tokio::sync::{OnceCell};
use tokio::time::interval;
use crate::{err_none, log_e, log_i};
use crate::routes::chat::chat_types::ChatBroadcastingType;

static CHAT_STATE: OnceCell<Arc<ChatState>> = OnceCell::const_new();
pub struct ChatState {
    pub server: RistChat
}

impl ChatState {
    pub async fn init() -> Result<(), Box<dyn std::error::Error>> {
        CHAT_STATE
            .get_or_try_init(Self::initialize_state)
            .await
            .map_err(|e| {
                log_e!("Failed to initialize CHAT state: {}", e);
                e
            })?;

        Ok(())
    }

    pub async fn get() -> Result<Arc<Self>, Box<dyn std::error::Error>> {
        if !CHAT_STATE.initialized() {
            while !CHAT_STATE.initialized() {}
        }

        let state = err_none!(CHAT_STATE.get(), "Failed to get CHAT state");
        Ok(Arc::clone(&state))
    }

    pub fn initialized() -> bool {
        CHAT_STATE.initialized()
    }

    async fn initialize_state() -> Result<Arc<Self>, Box<dyn std::error::Error>> {
        log_i!("Initializing CHAT State");

        let chat = RistChat::create().await?;

        log_i!("Starting chat runtime");
        chat.start().await?;

        Ok(Arc::new(Self {
            server: chat,
        }))
    }
}

#[get("/api/chat/ws?<b>")]
pub async fn chat_websocket_gateway(
    ws: WebSocket,
    b: ChatBroadcastingType,
) -> Result<Channel<'static>, String> {
    let server_opt = CHAT_STATE.get().ok_or(String::from("Failed to get chat state"))?;
    let state = Arc::clone(&server_opt);

    let server = state.server.clone();

    let conn_id = RistChat::generate_unique_id();
    server.on_connection_created(conn_id).await.map_err(|e| e.to_string())?;

    Ok(ws.channel(move |stream| {
        Box::pin(async move {
            let (mut sink, mut stream) = stream.split();
            let mut interval = interval(Duration::from_millis(200));

            loop {
                tokio::select! {
                    // Reader - Incomming data
                    msg_opt = stream.next() => {
                        match msg_opt {
                            Some(Ok(Message::Binary(data))) => {
                                if let Err(e) = server.on_connection_data_received(conn_id, data).await {
                                    log_e!("Data processing error for connection {}: {:?}", conn_id, e);
                                }
                            }
                            Some(Ok(Message::Close(_))) | None => {
                                break;
                            }
                            Some(Err(e)) => {
                                log_e!("WebSocket error for connection {}: {:?}", conn_id, e);
                                break;
                            }
                            // Only Binary message type is supported
                            _ => {}
                        }
                    }

                    // Writer - Polling data
                    _ = interval.tick() => {
                        match server.get_response_for_connection(conn_id).await {
                            Ok(Some(data)) => {
                                if let Err(e) = sink.send(Message::Binary(data)).await {
                                    log_e!("Failed to send data to connection {}: {:?}", conn_id, e);
                                    break;
                                }
                            }
                            Ok(None) => {} // No data
                            Err(e) => {
                                log_e!("Error getting response for connection {}: {:?}", conn_id, e);
                            }
                        }
                    }
                }
            }

            // Connection closed
            if let Err(e) = server.on_connection_closed(conn_id).await {
                log_e!("Failed to close connection on server {}: {:?}", conn_id, e);
            }

            Ok(())
        })
    }))
}