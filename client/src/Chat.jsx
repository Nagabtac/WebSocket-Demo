import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export default function Chat() {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");

  const clientRef = useRef(null);

  useEffect(() => {
    if (!joined || !name.trim()) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
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
          <div key={i}>
            <strong>{m.sender}:</strong>{" "}
            {m.type === "JOIN" ? <em>{m.content}</em> : m.content}
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
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
