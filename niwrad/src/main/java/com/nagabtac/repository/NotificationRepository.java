package com.nagabtac.repository;

import com.nagabtac.entity.Notification;
import com.nagabtac.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    
    List<Notification> findByUserAndIsReadOrderByCreatedAtDesc(User user, boolean isRead);
    
    long countByUserAndIsRead(User user, boolean isRead);
}