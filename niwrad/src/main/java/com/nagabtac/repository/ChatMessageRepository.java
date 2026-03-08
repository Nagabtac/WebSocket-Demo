package com.nagabtac.repository;

import com.nagabtac.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    @Query("SELECT m FROM ChatMessage m WHERE (m.sender = ?1 AND m.recipient = ?2) OR (m.sender = ?2 AND m.recipient = ?1) ORDER BY m.timestamp")
    List<ChatMessage> findConversation(String user1, String user2);
    
    List<ChatMessage> findByRecipientOrderByTimestampDesc(String recipient);
}
