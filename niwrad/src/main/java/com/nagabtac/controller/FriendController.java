package com.nagabtac.controller;

import com.nagabtac.entity.*;
import com.nagabtac.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/friends")
@CrossOrigin(origins = "http://localhost:5173")
public class FriendController {

    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public FriendController(UserRepository userRepository,
                           FriendshipRepository friendshipRepository,
                           NotificationRepository notificationRepository,
                           SimpMessagingTemplate messagingTemplate) {
        this.userRepository = userRepository;
        this.friendshipRepository = friendshipRepository;
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam String query, Authentication auth) {
        try {
            String currentUsername = auth.getName();
            List<User> users = userRepository.findByUsernameContainingIgnoreCaseAndUsernameNot(query, currentUsername);
            
            List<Map<String, Object>> result = users.stream().map(user -> {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", user.getId());
                userMap.put("username", user.getUsername());
                return userMap;
            }).toList();
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("Search failed with error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", "Search failed: " + e.getMessage()));
        }
    }

    @PostMapping("/request")
    public ResponseEntity<?> sendFriendRequest(@RequestBody Map<String, String> request, Authentication auth) {
        try {
            String currentUsername = auth.getName();
            String targetUsername = request.get("username");

            Optional<User> currentUser = userRepository.findByUsername(currentUsername);
            Optional<User> targetUser = userRepository.findByUsername(targetUsername);

            if (currentUser.isEmpty() || targetUser.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            User requester = currentUser.get();
            User addressee = targetUser.get();

            // Check if friendship already exists
            if (friendshipRepository.existsByUsers(requester, addressee)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Friendship already exists"));
            }

            // Create friendship request
            Friendship friendship = new Friendship(requester, addressee);
            friendship = friendshipRepository.save(friendship);

            // Create notification
            Notification notification = new Notification(
                addressee,
                requester,
                Notification.NotificationType.FRIEND_REQUEST,
                friendship.getId(),
                "friendship"
            );
            notificationRepository.save(notification);

            // Send real-time notification
            Map<String, Object> notificationData = new HashMap<>();
            notificationData.put("id", notification.getId());
            notificationData.put("type", notification.getType());
            notificationData.put("title", notification.getTitle());
            notificationData.put("message", notification.getMessage());
            notificationData.put("createdAt", notification.getCreatedAt());
            notificationData.put("entityId", notification.getEntityId());
            notificationData.put("isRead", notification.isRead());

            messagingTemplate.convertAndSendToUser(
                addressee.getUsername(),
                "/queue/notifications",
                notificationData
            );

            return ResponseEntity.ok(Map.of("message", "Friend request sent"));
        } catch (Exception e) {
            System.err.println("Failed to send friend request: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to send friend request"));
        }
    }

    @PostMapping("/accept/{friendshipId}")
    public ResponseEntity<?> acceptFriendRequest(@PathVariable Long friendshipId, Authentication auth) {
        try {
            String currentUsername = auth.getName();
            Optional<User> currentUser = userRepository.findByUsername(currentUsername);
            Optional<Friendship> friendship = friendshipRepository.findById(friendshipId);

            if (currentUser.isEmpty() || friendship.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Request not found"));
            }

            Friendship friendshipEntity = friendship.get();
            User addressee = currentUser.get();

            // Verify the current user is the addressee
            if (!friendshipEntity.getAddressee().equals(addressee)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Unauthorized"));
            }

            // Update friendship status
            friendshipEntity.setStatus(Friendship.FriendshipStatus.ACCEPTED);
            friendshipRepository.save(friendshipEntity);

            // Mark the related notification as read
            List<Notification> relatedNotifications = notificationRepository.findByUserAndIsReadOrderByCreatedAtDesc(
                addressee, false
            );
            relatedNotifications.stream()
                .filter(n -> n.getType() == Notification.NotificationType.FRIEND_REQUEST && 
                           n.getEntityId() != null && n.getEntityId().equals(friendshipId))
                .forEach(n -> {
                    n.setRead(true);
                    notificationRepository.save(n);
                });

            // Create notification for requester
            Notification notification = new Notification(
                friendshipEntity.getRequester(),
                addressee,
                Notification.NotificationType.FRIEND_ACCEPTED,
                friendshipEntity.getId(),
                "friendship"
            );
            notificationRepository.save(notification);

            // Send real-time notification
            Map<String, Object> notificationData = new HashMap<>();
            notificationData.put("id", notification.getId());
            notificationData.put("type", notification.getType());
            notificationData.put("title", notification.getTitle());
            notificationData.put("message", notification.getMessage());
            notificationData.put("createdAt", notification.getCreatedAt());
            notificationData.put("isRead", notification.isRead());

            messagingTemplate.convertAndSendToUser(
                friendshipEntity.getRequester().getUsername(),
                "/queue/notifications",
                notificationData
            );

            return ResponseEntity.ok(Map.of("message", "Friend request accepted"));
        } catch (Exception e) {
            System.err.println("Failed to accept friend request: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to accept friend request"));
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> getFriends(Authentication auth) {
        try {
            String currentUsername = auth.getName();
            Optional<User> currentUser = userRepository.findByUsername(currentUsername);

            if (currentUser.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            // Get all accepted friendships for the user using native query
            List<Friendship> friendships = friendshipRepository.findByUserAndStatusNative(
                currentUser.get().getId(), 
                "ACCEPTED"
            );
            
            // Extract friend usernames from friendships
            List<String> friendUsernames = friendships.stream()
                .map(friendship -> {
                    // Return the other user in the friendship
                    if (friendship.getRequester().equals(currentUser.get())) {
                        return friendship.getAddressee().getUsername();
                    } else {
                        return friendship.getRequester().getUsername();
                    }
                })
                .toList();

            return ResponseEntity.ok(friendUsernames);
        } catch (Exception e) {
            System.err.println("Failed to get friends: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to get friends: " + e.getMessage()));
        }
    }

    @GetMapping("/requests")
    public ResponseEntity<?> getFriendRequests(Authentication auth) {
        try {
            String currentUsername = auth.getName();
            Optional<User> currentUser = userRepository.findByUsername(currentUsername);

            if (currentUser.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            List<Friendship> requests = friendshipRepository.findByAddresseeAndStatus(
                currentUser.get(), 
                Friendship.FriendshipStatus.PENDING
            );

            List<Map<String, Object>> result = requests.stream().map(friendship -> {
                Map<String, Object> requestMap = new HashMap<>();
                requestMap.put("id", friendship.getId());
                requestMap.put("sender", friendship.getRequester().getUsername());
                requestMap.put("createdAt", friendship.getCreatedAt());
                return requestMap;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("Failed to get friend requests: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to get friend requests"));
        }
    }
}