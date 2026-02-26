import { useState, useEffect } from 'react';
import SockJS from 'sockjs-client';
import { Client } from "@stomp/stompjs";

const WebSocketClient = () => {
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
            onConnect: () => {
                client.subscribe("/topic/messages", (message) => {
                    const body = JSON.parse(message.body);
                    setMessages((prev) => [...prev, body]);
                });
                console.log('WebSocket connected');
            },
            onDisconnect: () => {
                console.log('WebSocket disconnected');
            }
        });

        client.activate();

        return () => {
            client.deactivate();
        };
    }, []);

    return (
        <div>    
            {messages.length === 0 ? (
                <p>No messages...</p>
            ) : (
                messages.map((m, i) => (
                    <p key={i}>{m.content}</p>
                ))
            )}
        </div>
    );
};

export default WebSocketClient;