package com.nagabtac.example;

import com.nagabtac.dto.Message;

public class SimpleMessagingTemplate {

    public void convertAndSend(String destination, Message msg) {
        // Simulate sending the message by printing to console
        System.out.println("[Simulated send] To: " + destination + ", Message: " + msg.getContent());
        System.out.flush(); // ensure immediate output
    }

}