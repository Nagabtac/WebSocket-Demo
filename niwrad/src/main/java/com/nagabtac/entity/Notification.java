package com.nagabtac.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "entity_type")
    private String entityType;

    @Column(name = "is_read")
    private boolean isRead;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public enum NotificationType {
        FRIEND_REQUEST, FRIEND_ACCEPTED, MESSAGE, LIKE, COMMENT
    }

    public Notification() {
        this.createdAt = LocalDateTime.now();
        this.isRead = false;
    }

    public Notification(User user, User actor, NotificationType type) {
        this();
        this.user = user;
        this.actor = actor;
        this.type = type;
    }

    public Notification(User user, User actor, NotificationType type, Long entityId, String entityType) {
        this(user, actor, type);
        this.entityId = entityId;
        this.entityType = entityType;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public User getActor() {
        return actor;
    }

    public void setActor(User actor) {
        this.actor = actor;
    }

    public NotificationType getType() {
        return type;
    }

    public void setType(NotificationType type) {
        this.type = type;
    }

    public Long getEntityId() {
        return entityId;
    }

    public void setEntityId(Long entityId) {
        this.entityId = entityId;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        isRead = read;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    // Helper methods for display
    public String getTitle() {
        if (actor == null) return "System Notification";
        
        switch (type) {
            case FRIEND_REQUEST:
                return "New Friend Request";
            case FRIEND_ACCEPTED:
                return "Friend Request Accepted";
            case MESSAGE:
                return "New Message";
            default:
                return "Notification";
        }
    }

    public String getMessage() {
        if (actor == null) return "System notification";
        
        switch (type) {
            case FRIEND_REQUEST:
                return actor.getUsername() + " sent you a friend request";
            case FRIEND_ACCEPTED:
                return actor.getUsername() + " accepted your friend request";
            case MESSAGE:
                return actor.getUsername() + " sent you a message";
            default:
                return "You have a new notification";
        }
    }
}