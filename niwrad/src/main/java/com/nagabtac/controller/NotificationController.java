package com.nagabtac.controller;

import com.nagabtac.entity.Notification;
import com.nagabtac.entity.User;
import com.nagabtac.repository.NotificationRepository;
import com.nagabtac.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:5173", allowedHeaders = "*")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationController(NotificationRepository notificationRepository,
                                UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getNotifications(Authentication auth) {
        try {
            String currentUsername = auth.getName();
            Optional<User> currentUser = userRepository.findByUsername(currentUsername);

            if (currentUser.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            List<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(currentUser.get());
            
            List<Map<String, Object>> result = notifications.stream().map(notification -> {
                Map<String, Object> notificationMap = new HashMap<>();
                notificationMap.put("id", notification.getId());
                notificationMap.put("type", notification.getType());
                notificationMap.put("title", notification.getTitle());
                notificationMap.put("message", notification.getMessage());
                notificationMap.put("isRead", notification.isRead());
                notificationMap.put("createdAt", notification.getCreatedAt());
                notificationMap.put("entityId", notification.getEntityId());
                notificationMap.put("entityType", notification.getEntityType());
                if (notification.getActor() != null) {
                    notificationMap.put("actorUsername", notification.getActor().getUsername());
                }
                return notificationMap;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to get notifications"));
        }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication auth) {
        try {
            String currentUsername = auth.getName();
            Optional<User> currentUser = userRepository.findByUsername(currentUsername);

            if (currentUser.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            long unreadCount = notificationRepository.countByUserAndIsRead(currentUser.get(), false);
            return ResponseEntity.ok(Map.of("count", unreadCount));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to get unread count"));
        }
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id, Authentication auth) {
        try {
            String currentUsername = auth.getName();
            Optional<User> currentUser = userRepository.findByUsername(currentUsername);
            Optional<Notification> notification = notificationRepository.findById(id);

            if (currentUser.isEmpty() || notification.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Notification not found"));
            }

            Notification notif = notification.get();
            if (!notif.getUser().equals(currentUser.get())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Unauthorized"));
            }

            notif.setRead(true);
            notificationRepository.save(notif);

            return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to mark notification as read"));
        }
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsRead(Authentication auth) {
        try {
            String currentUsername = auth.getName();
            Optional<User> currentUser = userRepository.findByUsername(currentUsername);

            if (currentUser.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            List<Notification> unreadNotifications = notificationRepository.findByUserAndIsReadOrderByCreatedAtDesc(
                currentUser.get(), false
            );

            unreadNotifications.forEach(notification -> notification.setRead(true));
            notificationRepository.saveAll(unreadNotifications);

            return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to mark all notifications as read"));
        }
    }
}