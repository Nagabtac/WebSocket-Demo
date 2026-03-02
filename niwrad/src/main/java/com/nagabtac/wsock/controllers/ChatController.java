package com.nagabtac.wsock.controllers;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import com.nagabtac.dto.Message;

@Controller
public class ChatController {
    
    // Listens for messages sent to /app/chat
    // Broadcasts the response to everyone subscribed to /topic/messages
    @MessageMapping("/chat")
    @SendTo("/topic/messages")
    public Message handleMessage(Message message) {
        return message; // Simply echo it back to all subscribers
    }

    // Listens for join messages
    @MessageMapping("/join")
    @SendTo("/topic/messages")
    public Message handleJoin(Message message) {
        return message;
    }
}
