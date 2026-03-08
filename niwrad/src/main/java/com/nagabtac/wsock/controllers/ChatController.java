package com.nagabtac.wsock.controllers;

import com.nagabtac.dto.Message;
import com.nagabtac.entity.ChatMessage;
import com.nagabtac.repository.ChatMessageRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatController {
    
    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository messageRepository;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                         ChatMessageRepository messageRepository) {
        this.messagingTemplate = messagingTemplate;
        this.messageRepository = messageRepository;
    }

    @MessageMapping("/chat")
    @SendTo("/topic/messages")
    public Message handleMessage(@Payload Message message, Principal principal) {
        message.setSender(principal.getName());
        
        ChatMessage chatMessage = new ChatMessage(
            message.getSender(),
            null,
            message.getContent(),
            message.getType()
        );
        messageRepository.save(chatMessage);
        
        return message;
    }

    @MessageMapping("/join")
    @SendTo("/topic/messages")
    public Message handleJoin(@Payload Message message, Principal principal) {
        message.setSender(principal.getName());
        message.setType("JOIN");
        return message;
    }

    @MessageMapping("/private")
    public void handlePrivateMessage(@Payload Message message, Principal principal) {
        message.setSender(principal.getName());
        
        ChatMessage chatMessage = new ChatMessage(
            message.getSender(),
            message.getRecipient(),
            message.getContent(),
            "PRIVATE"
        );
        messageRepository.save(chatMessage);
        
        messagingTemplate.convertAndSendToUser(
            message.getRecipient(),
            "/queue/messages",
            message
        );
        
        messagingTemplate.convertAndSendToUser(
            principal.getName(),
            "/queue/messages",
            message
        );
    }
}

