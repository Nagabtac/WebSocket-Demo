import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import "./Chat.css";

export default function Chat() {
  const [token, setToken] = useState(() => {
    // Initialize token from localStorage
    return localStorage.getItem('authToken') || null;
  });
  const [username, setUsername] = useState(() => {
    // Initialize username from localStorage
    return localStorage.getItem('username') || null;
  });
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [input, setInput] = useState("");

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Friend states
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const clientRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Fetch friends
  const fetchFriends = async () => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:8080/api/friends/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      } else {
        const errorData = await res.json();
        console.error("Failed to fetch friends:", errorData);
      }
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:8080/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:8080/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  // Search users
  const searchUsers = async (query) => {
    if (!token || !query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`http://localhost:8080/api/friends/search?query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      } else {
        console.error("Search failed with status:", res.status);
      }
    } catch (err) {
      console.error("Failed to search users:", err);
    }
  };

  // Send friend request
  const sendFriendRequest = async (targetUsername) => {
    try {
      const res = await fetch("http://localhost:8080/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: targetUsername }),
      });
      
      if (res.ok) {
        alert("Friend request sent!");
        setSearchQuery("");
        setSearchResults([]);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to send friend request");
      }
    } catch (err) {
      alert("Failed to send friend request");
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (friendshipId) => {
    try {
      console.log("Accepting friendship with ID:", friendshipId);
      const res = await fetch(`http://localhost:8080/api/friends/accept/${friendshipId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        console.log("Friend request accepted successfully");
        fetchFriends();
        fetchNotifications();
        fetchUnreadCount();
      } else {
        const errorData = await res.json();
        console.error("Failed to accept friend request:", errorData);
        alert(errorData.error || "Failed to accept friend request");
      }
    } catch (err) {
      console.error("Failed to accept friend request:", err);
      alert("Failed to accept friend request");
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await fetch(`http://localhost:8080/api/notifications/${notificationId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Fetch friends and initial data
  useEffect(() => {
    if (token) {
      fetchFriends();
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [token, username]);

  // Search users when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, token]);

  // WebSocket connection
  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        console.log("=== WEBSOCKET CONNECTED ===");
        setConnected(true);

        client.subscribe("/topic/messages", (message) => {
          console.log("=== RECEIVED PUBLIC MESSAGE ===", message.body);
          const parsedMessage = JSON.parse(message.body);
          console.log("Parsed message:", parsedMessage);
          console.log("Has imageUrl:", !!parsedMessage.imageUrl);
          setMessages((prev) => [...prev, parsedMessage]);
        });

        client.subscribe("/user/queue/messages", (message) => {
          console.log("=== RECEIVED PRIVATE MESSAGE ===", message.body);
          const parsedMessage = JSON.parse(message.body);
          console.log("Parsed message:", parsedMessage);
          console.log("Has imageUrl:", !!parsedMessage.imageUrl);
          setMessages((prev) => [...prev, parsedMessage]);
        });

        // Subscribe to notifications
        client.subscribe("/user/queue/notifications", (notification) => {
          const notificationData = JSON.parse(notification.body);
          setNotifications((prev) => [notificationData, ...prev]);
          setUnreadCount((prev) => prev + 1);
          
          // Show browser notification if permission granted
          if (Notification.permission === "granted") {
            new Notification(notificationData.title, {
              body: notificationData.message,
              icon: "/vite.svg"
            });
          }
        });

        client.publish({
          destination: "/app/join",
          body: JSON.stringify({
            content: "joined the chat",
            type: "JOIN",
          }),
        });
      },
      onDisconnect: () => {
        console.log("=== WEBSOCKET DISCONNECTED ===");
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error("=== STOMP ERROR ===", frame);
        console.error("Error headers:", frame.headers);
        console.error("Error body:", frame.body);
        if (frame.headers["message"]?.includes("JWT")) {
          handleLogout();
        }
      },
      onWebSocketError: (error) => {
        console.error("=== WEBSOCKET ERROR ===", error);
      },
      onWebSocketClose: (event) => {
        console.log("=== WEBSOCKET CLOSED ===", event.code, event.reason);
      },
      debug: (str) => {
        console.log("=== STOMP DEBUG ===", str);
      },
      reconnectDelay: 5000,
    });

    client.activate();
    clientRef.current = client;

    return () => client.deactivate();
  }, [token]);

  // Request notification permission
  useEffect(() => {
    if (token && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [token]);

  // Validate token on app load
  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          // Try to fetch user data to validate token
          const res = await fetch("http://localhost:8080/api/notifications/unread-count", {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!res.ok) {
            // Token is invalid, clear it
            console.log("Token validation failed, logging out");
            handleLogout();
          }
        } catch (err) {
          console.log("Token validation error, logging out");
          handleLogout();
        }
      }
    };

    validateToken();
  }, []); // Only run once on component mount

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);

    const endpoint = isLogin ? "/auth/login" : "/auth/register";

    try {
      const res = await fetch(`http://localhost:8080${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Authentication failed");
        return;
      }

      const data = await res.json();
      
      if (isLogin) {
        // Save to localStorage for persistence
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.username);
        
        setToken(data.token);
        setUsername(data.username);
      } else {
        // After registration, switch to login
        setIsLogin(true);
        setFormData({ username: "", password: "" });
        setError(null);
        // Show success message briefly
        alert("Registration successful! Please login.");
      }
    } catch (err) {
      setError("Connection failed");
    }
  };

  const handleLogout = () => {
    clientRef.current?.deactivate();
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    
    setToken(null);
    setUsername(null);
    setMessages([]);
    setFriends([]);
    setSelectedUser(null);
    setNotifications([]);
    setUnreadCount(0);
    setShowNotifications(false);
    setShowAddFriend(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const send = () => {
    if (!input.trim() || !clientRef.current?.connected) return;

    console.log("=== SENDING TEXT MESSAGE ===");
    console.log("WebSocket connected:", clientRef.current?.connected);
    console.log("Selected user:", selectedUser);
    console.log("Message content:", input);

    if (selectedUser) {
      clientRef.current.publish({
        destination: "/app/private",
        body: JSON.stringify({
          recipient: selectedUser,
          content: input,
          type: "PRIVATE",
        }),
      });
    } else {
      clientRef.current.publish({
        destination: "/app/chat",
        body: JSON.stringify({
          content: input,
          type: "CHAT",
        }),
      });
    }

    setInput("");
  };

  const handleImageUpload = (e) => {
    console.log("=== IMAGE UPLOAD TRIGGERED ===");
    const file = e.target.files[0];
    console.log("File selected:", file);
    
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("Image selected:", file.name, file.size, file.type);

    // Check if WebSocket is connected
    console.log("WebSocket connected:", clientRef.current?.connected);
    console.log("WebSocket client:", clientRef.current);
    
    if (!clientRef.current?.connected) {
      alert("Not connected to chat. Please wait for connection.");
      console.log("WebSocket not connected - aborting");
      return;
    }

    // Check file size (limit to 75MB)
    if (file.size > 75 * 1024 * 1024) {
      alert("Image size must be less than 75MB");
      console.log("File too large:", file.size);
      return;
    }

    // Check file type - support JPG, PNG, GIF (more permissive check)
    if (!file.type || !file.type.startsWith('image/')) {
      alert("Please select an image file");
      console.log("Invalid file type:", file.type);
      return;
    }
    
    console.log("File validation passed, proceeding with upload...");

    console.log("Starting to read file...");
    const reader = new FileReader();
    
    reader.onload = (event) => {
      console.log("=== FILE READ COMPLETE ===");
      const originalImageData = event.target.result;
      console.log("Original file read successfully, data length:", originalImageData.length);
      
      // Create an image element to compress the image
      const img = new Image();
      img.onload = () => {
        console.log("=== COMPRESSING IMAGE ===");
        console.log("Original dimensions:", img.width, "x", img.height);
        
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (max 200px width/height for very small size)
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress (preserve original format when possible)
        ctx.drawImage(img, 0, 0, width, height);
        
        // Determine output format based on original file type
        let outputFormat = 'image/jpeg';
        let quality = 0.5;
        
        if (file.type === 'image/png') {
          outputFormat = 'image/jpeg'; // Convert PNG to JPEG for better compression
          quality = 0.3;
        } else if (file.type === 'image/gif') {
          // Convert GIF to JPEG for better compression
          outputFormat = 'image/jpeg';
          quality = 0.3;
        } else {
          // Default to JPEG for all other formats (including jpg/jpeg)
          outputFormat = 'image/jpeg';
          quality = 0.3; // Very low quality for small size
        }
        
        console.log("Output format:", outputFormat, "Quality:", quality);
        const compressedImageData = canvas.toDataURL(outputFormat, quality);
        
        console.log("Compressed dimensions:", width, "x", height);
        console.log("Compressed data length:", compressedImageData.length);
        console.log("Compression ratio:", ((originalImageData.length - compressedImageData.length) / originalImageData.length * 100).toFixed(1) + "%");
        
        // Check if compressed image is still too large for WebSocket
        const maxWebSocketMessageSize = 75 * 1024 * 1024; // 75MB limit for WebSocket messages
        if (compressedImageData.length > maxWebSocketMessageSize) {
          console.error("Compressed image still too large:", compressedImageData.length, "bytes");
          alert(`Image is still too large after compression (${Math.round(compressedImageData.length/1024)}KB). Please try a smaller image.`);
          return;
        }
        
        console.log("Compressed image size OK for WebSocket:", compressedImageData.length, "bytes");
        
        // Send the compressed image
        sendImageMessage(compressedImageData, file.name);
      };
      
      img.src = originalImageData;
    };
    
    const sendImageMessage = async (imageData, fileName) => {
      try {
        console.log("=== UPLOADING IMAGE TO SERVER ===");
        
        // Convert base64 to blob
        const response = await fetch(imageData);
        const blob = await response.blob();
        
        // Create form data
        const formData = new FormData();
        formData.append('image', blob, fileName);
        
        // Upload image
        const uploadResponse = await fetch('http://localhost:8080/api/images/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }
        
        const uploadResult = await uploadResponse.json();
        console.log("Image uploaded successfully:", uploadResult);
        
        // Send message with image URL
        const messageData = {
          content: `[Image: ${fileName}]`,
          imageUrl: uploadResult.imageUrl,
          type: selectedUser ? "PRIVATE" : "CHAT",
        };

        if (selectedUser) {
          messageData.recipient = selectedUser;
          console.log("Sending private image to:", selectedUser);
        } else {
          console.log("Sending public image");
        }

        console.log("Message data to send:", messageData);

        console.log("=== ATTEMPTING TO SEND MESSAGE ===");
        const destination = selectedUser ? "/app/private" : "/app/chat";
        console.log("Publishing to:", destination);
        console.log("Message size:", JSON.stringify(messageData).length, "bytes");
        
        // Try to send the message
        const receipt = clientRef.current.publish({
          destination: destination,
          body: JSON.stringify(messageData),
        });
        
        console.log("=== MESSAGE SENT SUCCESSFULLY ===");
        console.log("Receipt:", receipt);
        
      } catch (error) {
        console.error("=== ERROR SENDING IMAGE ===", error);
        alert("Failed to send image: " + error.message);
      }
    };
    
    reader.onerror = (error) => {
      console.error("=== ERROR READING FILE ===", error);
      alert("Failed to read image file");
    };
    
    console.log("Starting FileReader...");
    reader.readAsDataURL(file);
    
    // Reset the input
    e.target.value = '';
    console.log("Input reset");
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getInitials = (name) => {
    return name?.charAt(0).toUpperCase() || "?";
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-content">
          <div className="login-illustration">
            <svg viewBox="0 0 400 300" className="chat-illustration">
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5865f2" />
                  <stop offset="100%" stopColor="#4752c4" />
                </linearGradient>
                <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#48bb78" />
                  <stop offset="100%" stopColor="#38a169" />
                </linearGradient>
                <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ed8936" />
                  <stop offset="100%" stopColor="#dd6b20" />
                </linearGradient>
                
                {/* Profile image patterns */}
                <pattern id="profile1" patternUnits="objectBoundingBox" width="1" height="1">
                  <image href="/profile_1.png" x="0" y="0" width="30" height="30" preserveAspectRatio="xMidYMid slice" />
                </pattern>
                <pattern id="profile2" patternUnits="objectBoundingBox" width="1" height="1">
                  <image href="/profile_2.png" x="0" y="0" width="30" height="30" preserveAspectRatio="xMidYMid slice" />
                </pattern>
                <pattern id="profile3" patternUnits="objectBoundingBox" width="1" height="1">
                  <image href="/profile_3.png" x="0" y="0" width="30" height="30" preserveAspectRatio="xMidYMid slice" />
                </pattern>
                <pattern id="profile4" patternUnits="objectBoundingBox" width="1" height="1">
                  <image href="/profile_4.png" x="0" y="0" width="30" height="30" preserveAspectRatio="xMidYMid slice" />
                </pattern>
              </defs>
              
              {/* Chat bubbles with text */}
              <rect x="50" y="75" width="130" height="50" rx="20" fill="url(#gradient1)" opacity="0.9" />
              <text x="115" y="95" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="500">Hey everyone! 👋</text>
              <text x="115" y="110" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="500">How's it going?</text>
              
              <rect x="220" y="115" width="120" height="35" rx="18" fill="url(#gradient2)" opacity="0.8" />
              <text x="280" y="135" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="500">Great! Working on</text>
              
              <rect x="60" y="135" width="150" height="50" rx="20" fill="url(#gradient3)" opacity="0.7" />
              <text x="135" y="155" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="500">Nice! I just finished</text>
              <text x="135" y="170" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="500">my project 🎉</text>
              
              <rect x="200" y="175" width="140" height="35" rx="18" fill="url(#gradient4)" opacity="0.9" />
              <text x="270" y="195" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="500">Awesome work! 🚀</text>
              
              {/* Profile picture avatars using PNG images */}
              <circle cx="30" cy="100" r="15" fill="url(#profile1)" stroke="#fff" strokeWidth="2" />
              <circle cx="30" cy="160" r="15" fill="url(#profile2)" stroke="#fff" strokeWidth="2" />
              <circle cx="350" cy="135" r="15" fill="url(#profile3)" stroke="#fff" strokeWidth="2" />
              <circle cx="350" cy="195" r="15" fill="url(#profile4)" stroke="#fff" strokeWidth="2" />
              
              {/* Connection lines */}
              <path d="M 200 50 Q 200 30 220 30 Q 240 30 240 50" stroke="url(#gradient2)" strokeWidth="3" fill="none" opacity="0.6" />
              <circle cx="200" cy="50" r="4" fill="url(#gradient2)" />
              <circle cx="240" cy="50" r="4" fill="url(#gradient2)" />
              
              {/* Floating message indicators */}
              <circle cx="80" cy="60" r="3" fill="#48bb78" opacity="0.8" />
              <circle cx="90" cy="55" r="2" fill="#48bb78" opacity="0.6" />
              <circle cx="100" cy="58" r="2.5" fill="#48bb78" opacity="0.7" />
              
              <circle cx="320" cy="250" r="3" fill="#5865f2" opacity="0.8" />
              <circle cx="310" cy="245" r="2" fill="#5865f2" opacity="0.6" />
              <circle cx="300" cy="248" r="2.5" fill="#5865f2" opacity="0.7" />
            </svg>
            
            <div className="illustration-text">
              <h3>Connect & Chat</h3>
              <p>Join conversations with friends and colleagues in real-time</p>
            </div>
          </div>

          <div className="login-box">
            <div className="login-header">
              <h2>Welcome Back!</h2>
              <p>We're so excited to see you again!</p>
            </div>

            <div className="login-tabs">
              <button
                className={isLogin ? "active" : ""}
                onClick={() => setIsLogin(true)}
              >
                Login
              </button>
              <button
                className={!isLogin ? "active" : ""}
                onClick={() => setIsLogin(false)}
              >
                Register
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleAuth} className="login-form">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
              <button type="submit" className="submit-btn">
                {isLogin ? "Login" : "Register"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const filteredMessages = selectedUser
    ? messages.filter(
        (m) =>
          (m.sender === selectedUser && m.recipient === username) ||
          (m.sender === username && m.recipient === selectedUser)
      )
    : messages.filter((m) => !m.recipient);

  return (
    <div className="chat-app">
      <div className="sidebar">
        <div className="sidebar-header">
          <span>Direct Messages</span>
          <div className="header-actions">
            <button 
              className="notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
            <button 
              className="add-friend-btn"
              onClick={() => setShowAddFriend(!showAddFriend)}
            >
              👥
            </button>
          </div>
        </div>



        <div className="user-list">
          <div
            className={`user-item ${!selectedUser ? "active" : ""}`}
            onClick={() => setSelectedUser(null)}
          >
            <div className="user-avatar">#</div>
            <div className="user-info">
              <div className="user-name">Public Chat</div>
              <div className="user-status">Everyone</div>
            </div>
          </div>

          {/* Friends Section */}
          {friends.length > 0 && (
            <>
              <div className="section-divider">Friends</div>
              {friends.map((friend) => (
                <div
                  key={friend}
                  className={`user-item ${selectedUser === friend ? "active" : ""}`}
                  onClick={() => setSelectedUser(friend)}
                >
                  <div className="user-avatar">{getInitials(friend)}</div>
                  <div className="user-info">
                    <div className="user-name">{friend}</div>
                    <div className="user-status">Online</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="current-user">
          <div className="user-avatar">{getInitials(username)}</div>
          <div className="current-user-info">
            <div className="current-user-name">{username}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="chat-area">
        <div className="chat-header">
          <h3>{selectedUser ? `@${selectedUser}` : "# public-chat"}</h3>
          <span
            className={`status-indicator ${connected ? "connected" : ""}`}
          >
            {connected ? "● Connected" : "○ Disconnected"}
          </span>
        </div>

        <div className="messages-container">
          {filteredMessages.map((m, i) => (
            <div key={i} className="message">
              <div className="message-avatar">{getInitials(m.sender)}</div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-sender">{m.sender}</span>
                  <span className="message-time">{formatTime(m.timestamp)}</span>
                </div>
                <div className={`message-text ${m.type === "JOIN" ? "join" : ""}`}>
                  {m.imageUrl ? (
                    <div className="message-image-container">
                      <img 
                        src={`http://localhost:8080${m.imageUrl}`}
                        alt="Shared image" 
                        className="message-image"
                        onClick={() => window.open(`http://localhost:8080${m.imageUrl}`, '_blank')}
                      />
                      <div className="image-caption">{m.content}</div>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="message-input-container">
          <div className="message-input-wrapper">
            <button 
              className="image-upload-btn"
              onClick={() => document.getElementById('image-input').click()}
              title="Send Image"
            >
              �
            </button>
            <input
              id="image-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={`Message ${selectedUser ? `@${selectedUser}` : "#public-chat"}`}
            />
            <button className="send-btn" onClick={send} disabled={!connected}>
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Popover Panels */}
      {showNotifications && (
        <div className="notifications-panel">
          <div className="notifications-header">
            <h4>Notifications</h4>
            <button onClick={() => setShowNotifications(false)}>✕</button>
          </div>
          <div className="notifications-list">
            {notifications.length === 0 ? (
              <p>No notifications</p>
            ) : (
              notifications
                .filter(notification => {
                  // Hide read friend request notifications since they're no longer actionable
                  if (notification.type === 'FRIEND_REQUEST' && notification.isRead) {
                    return false;
                  }
                  return true;
                })
                .map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                    {notification.type === 'FRIEND_REQUEST' && !notification.isRead && (
                      <div className="notification-actions">
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            // First mark the notification as read
                            await markNotificationAsRead(notification.id);
                            // Then accept the friend request
                            await acceptFriendRequest(notification.entityId);
                          }}
                          className="accept-btn"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            // Just mark as read to dismiss the notification
                            await markNotificationAsRead(notification.id);
                          }}
                          className="reject-btn"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Add Friend Panel */}
      {showAddFriend && (
        <div className="add-friend-panel">
          <div className="add-friend-header">
            <h4>Add Friend</h4>
            <button onClick={() => setShowAddFriend(false)}>✕</button>
          </div>
          
          <div className="search-container">
            <input
              type="text"
              placeholder="Search username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="search-results">
            {searchQuery.trim() && searchResults.length === 0 ? (
              <div className="no-results">No users found</div>
            ) : (
              searchResults.map((user) => (
                <div key={user.id} className="search-result-item">
                  <div className="user-avatar">{getInitials(user.username)}</div>
                  <div className="user-info">
                    <div className="user-name">{user.username}</div>
                  </div>
                  <button 
                    onClick={() => sendFriendRequest(user.username)}
                    className="send-request-btn"
                  >
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
