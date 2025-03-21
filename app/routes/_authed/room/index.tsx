import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/room/")({
  component: CreateRoomComponent,
});

function CreateRoomComponent() {
  // useEffect(() => {
  //   ws.onmessage = (event) => {
  //     const message = webSocketMessageSchema.parse(
  //       safeJsonParse<WebSocketMessage>(event.data, {
  //         type: "error",
  //         data: null,
  //       }),
  //     );

  //     console.log("Received message:", message);
  //   };

  //   ws.onerror = (error) => {
  //     console.error("WebSocket Error:", error);
  //   };

  //   return () => {
  //     ws.close();
  //   };
  // }, []);

  return <div>Hello "/_authed/room/"!</div>;
}
