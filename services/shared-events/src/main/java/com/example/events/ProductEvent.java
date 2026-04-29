package com.example.events;

import lombok.AllArgsConstructor;
import lombok.Data;
@AllArgsConstructor

@Data
public class ProductEvent {

    private String eventType; // CREATED, UPDATED, DELETED
    private String productId;
    private String owner;
    private Double price;
    public ProductEvent() {

    }
}