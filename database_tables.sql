-- These tables will be automatically created by JPA when you run the Spring Boot application
-- This file is for reference only - showing the improved unified schema

-- Users table (already exists)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unified friendships table (replaces both friend_requests and friendships)
CREATE TABLE friendships (
    id BIGSERIAL PRIMARY KEY,
    requester_id BIGINT NOT NULL REFERENCES users(id),
    addressee_id BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent self-friendship
    CONSTRAINT no_self_friend CHECK (requester_id <> addressee_id)
);

-- Improved notifications table
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    actor_id BIGINT REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    entity_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table with image URLs
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,
    recipient VARCHAR(255),
    content TEXT,
    type VARCHAR(50) NOT NULL,
    image_url TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prevent duplicate friendships (important for data integrity)
CREATE UNIQUE INDEX unique_friend_pair ON friendships (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
);

-- Indexes for better performance
CREATE INDEX idx_friendships_requester_status ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee_status ON friendships(addressee_id, status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Common queries that will be used:

-- Send friend request:
-- INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2);

-- Accept friend request:
-- UPDATE friendships SET status = 'ACCEPTED', updated_at = NOW() 
-- WHERE requester_id = $1 AND addressee_id = $2;

-- Get user's friends:
-- SELECT CASE 
--   WHEN requester_id = $1 THEN addressee_id 
--   ELSE requester_id 
-- END AS friend_id 
-- FROM friendships 
-- WHERE status = 'ACCEPTED' AND (requester_id = $1 OR addressee_id = $1);

-- Create notification:
-- INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type) 
-- VALUES ($target_user, $requester, 'FRIEND_REQUEST', $friendship_id, 'friendship');

-- Get unread notifications:
-- SELECT * FROM notifications 
-- WHERE user_id = $1 AND is_read = FALSE 
-- ORDER BY created_at DESC;