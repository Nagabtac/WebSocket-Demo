package com.nagabtac.example;

import java.util.Scanner;

import org.springframework.boot.CommandLineRunner;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.nagabtac.dto.Message;

@Component
public class SimulateWs implements CommandLineRunner {

    private final SimpMessagingTemplate messagingTemplate;

    public SimulateWs(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        // Run in a separate thread to not block Spring Boot startup
        Thread inputThread = new Thread(() -> {
            try (Scanner sc = new Scanner(System.in)) {
                System.out.println("WebSocket Simulator***************");
                System.out.println("Enter a message and press ENTER TO SEND....");
                System.out.flush(); // Force output to appear

                while (!Thread.currentThread().isInterrupted()) {
                    if (sc.hasNextLine()) {
                        String input = sc.nextLine();
                        if (input.isBlank()) continue;

                        Message msg = new Message(input, "SERVER");
                        messagingTemplate.convertAndSend("/topic/messages", msg);
                        System.out.println("*******Server sent a message: " + input);
                        System.out.flush(); // Force output to appear
                    }
                }
            } catch (Exception e) {
                System.err.println("Error in WebSocket simulator: " + e.getMessage());
            }
        });
        
        inputThread.setDaemon(true); // Allow JVM to exit even if this thread is running
        inputThread.start();
    }
}