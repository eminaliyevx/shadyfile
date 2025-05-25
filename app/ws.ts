import {
  defineEventHandler,
  defineWebSocket,
} from "@tanstack/react-start/server";
import { consola } from "consola";
import { Peer } from "crossws";
import { WebSocketMessageErrorEnum } from "./lib/enums";
import { roomSchema, webSocketMessageSchema } from "./lib/schemas";
import { redis } from "./lib/server/redis";
import { WebSocketMessage } from "./lib/types";
import { safeJsonParse } from "./lib/utils";

interface TypedPeer extends Peer {
  roomId?: string;

  userId?: string;

  username?: string;

  send(
    data: WebSocketMessage,
    options?: { compress?: boolean },
  ): number | void | undefined;

  publish(
    topic: string,
    data: string,
    options?: {
      compress?: boolean;
    },
  ): void;
}

const ROOM_EXPIRY_TIME = 60 * 60 * 24;

export default defineEventHandler({
  handler(event) {
    consola.info("WebSocket event handler:", event);
  },
  websocket: defineWebSocket({
    open(peer: TypedPeer) {
      consola.info(`WebSocket connection opened: peer ${peer.id}`);

      peer.send({
        type: "connected",
        data: null,
      });
    },

    async message(peer: TypedPeer, message) {
      try {
        const clientMessage = webSocketMessageSchema.parse(message.json());

        const handler = webSocketMessageHandler(peer);

        switch (clientMessage.type) {
          case "join-room": {
            await handler.joinRoom(clientMessage);
            break;
          }

          case "peer-signal": {
            await handler.forwardSignal(clientMessage);
            break;
          }

          case "send-public-key": {
            await handler.sendPublicKey(clientMessage);
            break;
          }
        }
      } catch (error) {
        consola.error("Invalid message format:", error);

        peer.send({
          type: "error",
          data: {
            message: WebSocketMessageErrorEnum.enum.WEBSOCKET_MESSAGE_ERROR_0,
          },
        });
      }
    },

    async close(peer: TypedPeer, details) {
      if (peer.roomId && peer.userId && peer.username) {
        const room = await getRoom(peer.roomId);

        if (!room) {
          return;
        }

        const { host, users } = room;

        const updatedUsers = { ...users };

        delete updatedUsers[peer.userId];

        const newHost =
          host?.id === peer.userId ? Object.values(updatedUsers)[0] : host;

        await redis.set(
          `room:${peer.roomId}`,
          JSON.stringify({
            host: newHost,
            users: updatedUsers,
          }),
          "EX",
          ROOM_EXPIRY_TIME,
        );
      }

      peer.publish(
        `room:${peer.roomId}`,
        JSON.stringify({
          type: "peer-left",
          data: {
            roomId: peer.roomId,
            id: peer.userId,
            username: peer.username,
          },
        }),
      );

      peer.unsubscribe(`room:${peer.roomId}`);

      peer.roomId = undefined;
      peer.userId = undefined;
      peer.username = undefined;

      consola.info(
        `WebSocket connection closed: peer ${peer.id}, details: ${details}`,
      );
    },

    async error(_, error) {
      consola.error("WebSocket error:", error);
    },
  }),
});

function webSocketMessageHandler(peer: TypedPeer) {
  return {
    async joinRoom(message: Extract<WebSocketMessage, { type: "join-room" }>) {
      try {
        const room = await getRoom(message.data.roomId);

        if (!room) {
          return peer.send({
            type: "error",
            data: {
              message: WebSocketMessageErrorEnum.enum.WEBSOCKET_MESSAGE_ERROR_1,
            },
          });
        }

        if (room.users[message.data.id]) {
          peer.roomId = message.data.roomId;
          peer.userId = message.data.id;
          peer.username = message.data.username;

          return peer.send({
            type: "error",
            data: {
              message: WebSocketMessageErrorEnum.enum.WEBSOCKET_MESSAGE_ERROR_2,
            },
          });
        }

        let { host: _host, users } = room;

        const host = _host ?? {
          id: message.data.id,
          username: message.data.username,
        };

        if (Object.keys(users).length >= 2) {
          return peer.send({
            type: "error",
            data: {
              message: WebSocketMessageErrorEnum.enum.WEBSOCKET_MESSAGE_ERROR_3,
            },
          });
        }

        await redis.set(
          `room:${message.data.roomId}`,
          JSON.stringify({
            host,
            users: {
              ...users,
              [message.data.id]: {
                id: message.data.id,
                username: message.data.username,
              },
            },
          }),
          "EX",
          ROOM_EXPIRY_TIME,
        );

        peer.subscribe(`room:${message.data.roomId}`);

        peer.send({
          type: "room-joined",
          data: {
            id: message.data.id,
            username: message.data.username,
            roomId: message.data.roomId,
            isHost: host.id === message.data.id,
          },
        });

        peer.roomId = message.data.roomId;
        peer.userId = message.data.id;
        peer.username = message.data.username;

        ({ host: _host, users } = (await getRoom(message.data.roomId))!);

        if (Object.keys(users).length > 1) {
          for (const [id, user] of Object.entries(users)) {
            if (id !== message.data.id) {
              peer.publish(
                `room:${message.data.roomId}`,
                JSON.stringify({
                  type: "peer-joined",
                  data: {
                    roomId: message.data.roomId,
                    id: message.data.id,
                    username: message.data.username,
                    isHost: false,
                  },
                }),
              );

              peer.send({
                type: "peer-joined",
                data: {
                  roomId: message.data.roomId,
                  id,
                  username: user.username,
                  isHost: true,
                },
              });
            }
          }
        }

        consola.info(
          `User ${message.data.id} joined room ${message.data.roomId}`,
        );
      } catch (error) {
        consola.error("Failed to join room", error);

        peer.send({
          type: "error",
          data: {
            message: WebSocketMessageErrorEnum.enum.WEBSOCKET_MESSAGE_ERROR_4,
          },
        });
      }
    },

    async forwardSignal(
      message: Extract<WebSocketMessage, { type: "peer-signal" }>,
    ) {
      try {
        consola.info(
          `Forwarding signal from ${message.data.from} to ${message.data.to}`,
        );

        peer.publish(
          `room:${message.data.roomId}`,
          JSON.stringify({
            type: "peer-signal",
            data: message.data,
          }),
        );
      } catch (error) {
        consola.error(
          WebSocketMessageErrorEnum.enum.WEBSOCKET_MESSAGE_ERROR_6,
          error,
        );

        peer.send({
          type: "error",
          data: {
            message: WebSocketMessageErrorEnum.enum.WEBSOCKET_MESSAGE_ERROR_6,
          },
        });
      }
    },

    async sendPublicKey(
      message: Extract<WebSocketMessage, { type: "send-public-key" }>,
    ) {
      peer.publish(
        `room:${message.data.roomId}`,
        JSON.stringify({
          type: "public-key-received",
          data: message.data,
        }),
      );
    },

    async ackDhke(message: Extract<WebSocketMessage, { type: "ack-dhke" }>) {
      peer.publish(
        `room:${message.data.roomId}`,
        JSON.stringify({
          type: "dhke-acked",
          data: message.data,
        }),
      );
    },
  };
}

async function getRoom(roomId: string) {
  try {
    const room = await redis.get(`room:${roomId}`);

    return roomSchema.parse(safeJsonParse(room));
  } catch {
    return null;
  }
}
