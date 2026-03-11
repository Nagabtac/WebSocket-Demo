import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import "./Chat.css";

export default function Chat() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const clientRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Fetch users
  useEffect(() => {
    if (token) {
      fetch("http://localhost:8080/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setUsers(data.filter((u) => u !== username)));
    }
  }, [token, username]);

  // WebSocket connection
  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        setConnected(true);

        client.subscribe("/topic/messages", (message) => {
          setMessages((prev) => [...prev, JSON.parse(message.body)]);
        });

        client.subscribe("/user/queue/messages", (message) => {
          setMessages((prev) => [...prev, JSON.parse(message.body)]);
        });

        client.publish({
          destination: "/app/join",
          body: JSON.stringify({
            content: "joined the chat",
            type: "JOIN",
          }),
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        console.error("STOMP error:", frame);
        if (frame.headers["message"]?.includes("JWT")) {
          handleLogout();
        }
      },
      reconnectDelay: 5000,
    });

    client.activate();
    clientRef.current = client;

    return () => client.deactivate();
  }, [token]);

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
    setToken(null);
    setUsername(null);
    setMessages([]);
    setUsers([]);
    setSelectedUser(null);
  };

  const send = async () => {
    if ((!input.trim() && !selectedFile) || !clientRef.current?.connected) return;

    let fileData = null;
    
    // Upload file if selected
    if (selectedFile) {
      console.log('Uploading file:', selectedFile.name);
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      try {
        const response = await fetch('http://localhost:8080/api/files/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (response.ok) {
          fileData = await response.json();
          console.log('File uploaded successfully:', fileData);
        } else {
          console.error('File upload failed:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error details:', errorText);
          return;
        }
      } catch (error) {
        console.error('File upload error:', error);
        return;
      }
    }

    const messageData = {
      content: input || (selectedFile ? `Shared ${selectedFile.type.startsWith('image/') ? 'an image' : 'a file'}` : ''),
      type: selectedUser ? "PRIVATE" : "CHAT",
      ...(fileData && {
        fileUrl: `http://localhost:8080${fileData.url}`,
        fileName: fileData.originalName,
        fileType: fileData.type,
      }),
    };

    console.log('Sending message:', messageData);

    if (selectedUser) {
      messageData.recipient = selectedUser;
      clientRef.current.publish({
        destination: "/app/private",
        body: JSON.stringify(messageData),
      });
    } else {
      clientRef.current.publish({
        destination: "/app/chat",
        body: JSON.stringify(messageData),
      });
    }

    setInput("");
    setSelectedFile(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
        <div className="login-box">
          <h2>Welcome Back!</h2>
          <p>We're so excited to see you again!</p>

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

          <form onSubmit={handleAuth}>
            <input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
            <button type="submit">{isLogin ? "Login" : "Register"}</button>
          </form>
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
        <div className="sidebar-header">Direct Messages</div>

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

          {users.map((user) => (
            <div
              key={user}
              className={`user-item ${selectedUser === user ? "active" : ""}`}
              onClick={() => setSelectedUser(user)}
            >
              <div className="user-avatar">{getInitials(user)}</div>
              <div className="user-info">
                <div className="user-name">{user}</div>
                <div className="user-status">Online</div>
              </div>
            </div>
          ))}
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
                  {m.content}
                </div>
                {m.fileUrl && (
                  <div className="message-attachment">
                    {m.fileType?.startsWith('image/') ? (
                      <img 
                        src={m.fileUrl} 
                        alt={m.fileName}
                        className="message-image"
                        onClick={() => window.open(m.fileUrl, '_blank')}
                      />
                    ) : m.fileType?.startsWith('video/') ? (
                      <video 
                        src={m.fileUrl} 
                        controls
                        className="message-video"
                      />
                    ) : (
                      <div className="message-file">
                        <span>📎 {m.fileName}</span>
                        <a href={m.fileUrl} target="_blank" rel="noopener noreferrer">
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="message-input-container">
          <div className="message-input-wrapper">
            <input
              type="file"
              ref={fileInputRef}
              className="attachment-input"
              onChange={handleFileSelect}
              accept="image/*,video/*"
            />
            <button 
              className="attachment-btn" 
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              📎
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={
                selectedFile 
                  ? `File: ${selectedFile.name}` 
                  : `Message ${selectedUser ? `@${selectedUser}` : "#public-chat"}`
              }
            />
            {selectedFile && (
              <button 
                className="attachment-btn" 
                onClick={removeFile}
                title="Remove file"
              >
                ✕
              </button>
            )}
            <button className="send-btn" onClick={send} disabled={!connected}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
