package com.example.events;

import java.util.List;

import lombok.AllArgsConstructor;
import org.springframework.web.multipart.MultipartFile;
import lombok.Data;
@AllArgsConstructor
@Data
public class ProductEvent {

    private String eventType; // CREATED, UPDATED, DELETED
    private String productId;
    private String owner;
    private List<MultipartFile> medias;
    public ProductEvent() {
    }
}