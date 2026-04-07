package com.nagabtac.config;

import com.nagabtac.websocket.JwtChannelInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

    public WebSocketConfig(JwtChannelInterceptor jwtChannelInterceptor) {
        this.jwtChannelInterceptor = jwtChannelInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry){
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry){
        // Regular WebSocket endpoint for large messages
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
                
        // SockJS endpoint with size limits
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS()
                .setStreamBytesLimit(75 * 1024 * 1024) // 75MB for images
                .setHttpMessageCacheSize(1000)
                .setDisconnectDelay(30 * 1000);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtChannelInterceptor);
        // Add debugging interceptor
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                System.out.println("=== WEBSOCKET MESSAGE INTERCEPTED ===");
                System.out.println("Message type: " + message.getClass().getSimpleName());
                System.out.println("Payload type: " + message.getPayload().getClass().getSimpleName());
                if (message.getPayload() instanceof String) {
                    String payload = (String) message.getPayload();
                    System.out.println("Payload length: " + payload.length());
                    System.out.println("Payload preview: " + (payload.length() > 200 ? payload.substring(0, 200) + "..." : payload));
                }
                System.out.println("Headers: " + message.getHeaders());
                return message;
            }
        });
        // Increase message size limit for images
        registration.taskExecutor().corePoolSize(4);
        registration.taskExecutor().maxPoolSize(8);
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.taskExecutor().corePoolSize(4);
        registration.taskExecutor().maxPoolSize(8);
    }
}