package com.nagabtac.repository;

import com.nagabtac.entity.Friendship;
import com.nagabtac.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    
    // Find friendship between two users (regardless of who requested)
    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requester = :user1 AND f.addressee = :user2) OR " +
           "(f.requester = :user2 AND f.addressee = :user1)")
    Optional<Friendship> findByUsers(@Param("user1") User user1, @Param("user2") User user2);
    
    // Check if friendship exists between two users
    @Query("SELECT COUNT(f) > 0 FROM Friendship f WHERE " +
           "((f.requester = :user1 AND f.addressee = :user2) OR " +
           "(f.requester = :user2 AND f.addressee = :user1))")
    boolean existsByUsers(@Param("user1") User user1, @Param("user2") User user2);
    
    // Get pending friend requests received by user
    List<Friendship> findByAddresseeAndStatus(User addressee, Friendship.FriendshipStatus status);
    
    // Get pending friend requests sent by user
    List<Friendship> findByRequesterAndStatus(User requester, Friendship.FriendshipStatus status);
    
    // Get all friendships for a user with specific status - using native query to avoid enum issues
    @Query(value = "SELECT * FROM friendships f WHERE " +
           "(f.requester_id = :userId OR f.addressee_id = :userId) AND " +
           "f.status = :status", nativeQuery = true)
    List<Friendship> findByUserAndStatusNative(@Param("userId") Long userId, @Param("status") String status);
}