package com.nagabtac.example;

import java.util.Scanner;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.task.TaskExecutionProperties.Simple;

import com.nagabtac.dto.Message;

public class SimulateWs implements CommandLineRunner {
    private final SimpleMessagingTemplate messagingTemplate;
    
    public SimulateWs(SimpleMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void run(String... args ) throws Exception {
        try(Scanner sc = new Scanner(System.in);){
        System.out.println("WebSocket Simulator***************");
        System.out.println("Enter a message and press eNTER TO SENT....");
        while(sc.hasNextLine()) {
            String input = sc.nextLine();
            if(input.isBlank()) continue;
            
        Message msg = new Message(input, "SERVER");
        messagingTemplate.convertAndSend("/topic/messages", msg);
        System.out.println("*******Server sent a message: " + input);
        }
    }
    }
}
