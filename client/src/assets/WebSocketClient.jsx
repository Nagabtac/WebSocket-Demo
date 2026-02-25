import{useState, useEffect} from 'react';
import SockJs from 'sockJs-client';
import {Client} from "@stomp/stompjs";
const WebSocketClient = () => {

    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJs('http://localhost:8080/ws'),
            onConnect: () => {
                client.subscribe("topic/channel1", (message) => {
                    const body = JSON.parse(message.body);
                    setMessages((prev) => [...prev, body]);
                });
                console.log('WebSocket connected');
            },
            onDisconnect: () => {
                //handle disconnection
                console.log('WebSocket disconnected');
            }
        });
        client.activate();

        return()=>{
            client.deactivate();
        };
    }, []);
    return <div>    
        {messages.length ==0 ? (<p>No messages...</p>) : messages.map(m, i) => (
            <p key={i}><p>{m.content}</p>
            </p>
        )};
    </div>
}