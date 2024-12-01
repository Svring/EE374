import { canonicalizeMessage, Message, parseMessage } from "./message.ts";
import { Result } from "./utility.ts";

export async function createServer() {
  const port = 18018;
  const listener = Deno.listen({ hostname: "127.0.0.1", port: port });

  console.log(
    `Server listening on address ${listener.addr.hostname}:${listener.addr.port}`,
  );

  // Handle multiple connections
  for await (const conn of listener) {
    // Handle each connection in a separate task
    handleConnection(conn);
  }
}

function handleConnection(conn: Deno.Conn) {
  try {
    const handler = async () => {
      const buffer = new Uint8Array(1024);
      while (true) {
        try {
          const bytesRead = await conn.read(buffer);
          if (bytesRead === null) break; // Connection closed

          const messageResult: Result<object, string> = parseMessage(
            buffer.subarray(0, bytesRead),
          );

          if (!messageResult.success) {
            await sendError(conn, "INVALID_FORMAT", messageResult.error);
            continue;
          }

          const message = messageResult.value;
          console.log(`Received message: ${message}`);

          // Validate message type (you'll need to define valid message types)
          if (!isValidMessageType(message)) {
            await sendError(conn, "INVALID_FORMAT", "Invalid message type");
            continue;
          }

          // Handle valid message...
        } catch (err) {
          console.error("Failed to read from connection:", err);
          break;
        }
      }
    };

    // Run the handler
    handler();
  } catch (err) {
    console.error("Failed to handle connection:", err);
    conn.close();
  }
}

// Helper function to send error messages
async function sendError(conn: Deno.Conn, code: string, message: string) {
  const errorResponse = JSON.stringify({
    type: "error",
    code: code,
    message: message,
  });
  try {
    await conn.write(new TextEncoder().encode(errorResponse));
  } catch (err) {
    console.error("Failed to send error message:", err);
  }
}

// Helper function to validate message types
function isValidMessageType(message: any): boolean {
  // Define your valid message types here
  const validTypes = ["connect", "disconnect", "message"]; // Add your valid types
  return message && typeof message === "object" &&
    "type" in message &&
    validTypes.includes(message.type);
}
