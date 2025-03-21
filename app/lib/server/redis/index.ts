import { consola } from "consola";
import Redis from "ioredis";
import { env } from "../../env/server";

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
});

redis.on("connect", () => {
  consola.success("Connected to Redis");
});

redis.on("error", (error) => {
  consola.error("Redis connection error", error);
});

// // Helper functions for room management
// export const roomService = {
//   // Store a room with expiration (24 hours by default)
//   async setRoom(
//     roomId: string,
//     roomData: any,
//     expirySeconds = 86400,
//   ): Promise<void> {
//     await redis.set(
//       `room:${roomId}`,
//       JSON.stringify(roomData),
//       "EX",
//       expirySeconds,
//     );
//   },

//   // Get room data
//   async getRoom(roomId: string): Promise<any | null> {
//     const data = await redis.get(`room:${roomId}`);
//     if (!data) return null;
//     return JSON.parse(data);
//   },

//   // Delete a room
//   async deleteRoom(roomId: string): Promise<void> {
//     await redis.del(`room:${roomId}`);
//   },

//   // Add a peer to a room
//   async addPeerToRoom(
//     roomId: string,
//     peerId: string,
//     peerData: any,
//   ): Promise<void> {
//     await redis.hset(`room:${roomId}:peers`, peerId, JSON.stringify(peerData));
//     // Update room's last activity timestamp
//     await redis.set(`room:${roomId}:lastActive`, Date.now().toString());
//   },

//   // Get a peer from a room
//   async getPeerFromRoom(roomId: string, peerId: string): Promise<any | null> {
//     const data = await redis.hget(`room:${roomId}:peers`, peerId);
//     if (!data) return null;
//     return JSON.parse(data);
//   },

//   // Remove a peer from a room
//   async removePeerFromRoom(roomId: string, peerId: string): Promise<void> {
//     await redis.hdel(`room:${roomId}:peers`, peerId);
//   },

//   // Get all peers in a room
//   async getAllPeersInRoom(roomId: string): Promise<Record<string, any>> {
//     const peers = await redis.hgetall(`room:${roomId}:peers`);
//     const result: Record<string, any> = {};

//     for (const [peerId, peerDataJson] of Object.entries(peers)) {
//       result[peerId] = JSON.parse(peerDataJson);
//     }

//     return result;
//   },

//   // Check if a room exists
//   async roomExists(roomId: string): Promise<boolean> {
//     return (await redis.exists(`room:${roomId}`)) === 1;
//   },

//   // Get room count
//   async getRoomCount(): Promise<number> {
//     const keys = await redis.keys("room:*");
//     return keys.length;
//   },
// };
