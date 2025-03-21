import { z } from "zod";

export const NodeEnvEnum = z.enum(["development", "staging", "production"]);

export const ThemeEnum = z.enum(["light", "dark"]);

export enum WebSocketMessageError {
  WEBSOCKET_MESSAGE_ERROR_0 = "Invalid message format",
  WEBSOCKET_MESSAGE_ERROR_1 = "Room not found",
  WEBSOCKET_MESSAGE_ERROR_2 = "You are already in this room",
  WEBSOCKET_MESSAGE_ERROR_3 = "Room is already full",
  WEBSOCKET_MESSAGE_ERROR_4 = "Failed to join room",
  WEBSOCKET_MESSAGE_ERROR_5 = "WebSocket error",
  WEBSOCKET_MESSAGE_ERROR_6 = "Failed to forward signal",
}

export const WebSocketMessageErrorEnum = z.nativeEnum(WebSocketMessageError);
