useEffect(() => {
  if (!Joined || !name.trim()) return;

  const client = new Client({
    webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
    reconnectDelay: 5000, // optional: reconnect automatically
    onConnect: () => {
      setConnected(true);

      // Subscribe to messages
      client.subscribe("/topic/messages", (stompMessage) => {
        const body = JSON.parse(stompMessage.body);
        setMessages((prev) => [...prev, body]);
      });

      // Announce join
      client.publish({
        destination: "/app/chat",
        body: JSON.stringify({
          sender: name,
          content: `${name} has joined the chat`,
          type: "JOIN",
        }),
      });
    },
    onStompError: (frame) => {
      console.error("Broker reported error: ", frame.headers["message"]);
      console.error("Details: ", frame.body);
    },
  });

  clientRef.current = client; // Save to ref
  client.activate(); // Start the client

  // Cleanup on unmount or when leaving
  return () => {
    if (clientRef.current && clientRef.current.connected) {
      // Announce leave
      clientRef.current.publish({
        destination: "/app/chat",
        body: JSON.stringify({
          sender: name,
          content: `${name} has left the chat`,
          type: "LEAVE",
        }),
      });
      clientRef.current.deactivate();
    }
  };
}, [Joined, name]);
