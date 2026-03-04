package com.nagabtac.dto;

public class Message {
    private String content;
    private String sender;
    private String type;
    private String mediaUrl;
    private String mediaType;

    // No-args constructor
    public Message() {}

    // Constructor with String sender
    public Message(String content, String sender) {
        this.content = content;
        this.sender = sender;
    }

    // Constructor with Object sender
    public Message(String content, Object sender) {
        this.content = content;
        this.sender = sender.toString();
    }

    // Getters and setters
    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getMediaUrl() {
        return mediaUrl;
    }

    public void setMediaUrl(String mediaUrl) {
        this.mediaUrl = mediaUrl;
    }

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }
}