import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export default function Chat() {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const clientRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!joined || !name.trim()) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8081/ws"),
      onConnect: () => {
        setConnected(true);
        client.subscribe("/topic/messages", (message) => {
          setMessages((prev) => [...prev, JSON.parse(message.body)]);
        });
        client.publish({
          destination: "/app/join",
          body: JSON.stringify({
            sender: name,
            content: "joined the chat",
            type: "JOIN",
          }),
        });
      },
      onDisconnect: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    return () => client.deactivate();
  }, [joined, name]);

  const send = () => {
    if (!input.trim()) return;
    if (!clientRef.current?.connected) return;

    clientRef.current.publish({
      destination: "/app/chat",
      body: JSON.stringify({
        sender: name,
        content: input,
        type: "CHAT",
      }),
    });

    setInput("");
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      alert("Please select an image or video file");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8081/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      // Send message with media URL
      clientRef.current.publish({
        destination: "/app/chat",
        body: JSON.stringify({
          sender: name,
          content: file.name,
          type: "MEDIA",
          mediaUrl: `http://localhost:8081${data.url}`,
          mediaType: data.type,
        }),
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  if (!joined) {
    return (
      <div style={{ maxWidth: 420 }}>
        <h3>Join Public Chat</h3>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />

        <button disabled={!name.trim()} onClick={() => setJoined(true)}>
          Join
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <p>
        You: <strong>{name}</strong>
      </p>
      <p>Status: {connected ? "Connected" : "Disconnected"}</p>
      <div
        style={{
          border: "1px solid #ccc",
          height: 320,
          overflowY: "auto",
          padding: 10,
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <strong>{m.sender}:</strong>{" "}
            {m.type === "JOIN" ? (
              <em>{m.content}</em>
            ) : m.type === "MEDIA" ? (
              <div>
                <div>{m.content}</div>
                {m.mediaType?.startsWith("image/") ? (
                  <img
                    src={m.mediaUrl}
                    alt={m.content}
                    style={{ maxWidth: 300, maxHeight: 200, marginTop: 4 }}
                  />
                ) : m.mediaType?.startsWith("video/") ? (
                  <video
                    src={m.mediaUrl}
                    controls
                    style={{ maxWidth: 300, maxHeight: 200, marginTop: 4 }}
                  />
                ) : null}
              </div>
            ) : (
              m.content
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !connected}
        >
          {uploading ? "Uploading..." : "📎"}
        </button>
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
