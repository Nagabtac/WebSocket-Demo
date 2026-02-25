package com.nagabtac.config;

import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    //websocket configuration
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry){
        //prefix for topics clients can subscribe to
        registry.enableSimpleBroker("/topic");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry){
        //endpoint for clients to connect to
        registry.addEndpoint("/ws")           //the websoket handshake url
        .setAllowedOrigins("http://localhost:5173")//client address
        .withSockJS(); //for older browsers that don't support websockets

    }
}
