package com.example.events;

public class ProductEvent {

    private String eventType; // CREATED, UPDATED, DELETED
    private String productId;
    private String owner;

    public ProductEvent() {
    }

    public ProductEvent(String eventType, String productId, String owner) {
        this.eventType = eventType;
        this.productId = productId;
        this.owner = owner;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }

}