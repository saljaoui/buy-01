package com.buy01.media.service;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import lombok.AllArgsConstructor;
import com.example.events.ProductEvent;
import com.buy01.media.repository.MediaRepository;

@AllArgsConstructor
@Service
public class ProductEventConsumer {

    private final MediaService mediaService;

    @KafkaListener(topics = "product-events", groupId = "media-service-group")
    public void handleProductEvent(ProductEvent event) {
        System.out.println("📥 Received event: " + event.getEventType());

        switch (event.getEventType()) {
            case "DELETED" ->
                // Auto-clean media when product is deleted
                //mediaRepository.deleteByProductId(event.getProductId());
                //System.out.println("Product deleted: " + event.getProductId());
                this.mediaService.deleteAllByProductId(event.getProductId());
                

            case "CREATED" ->
                // Maybe initialize a media placeholder
                System.out.println("Product created: " + event.getProductId());

            case "UPDATED" ->
                // Handle update logic if needed
                System.out.println("Product updated: " + event.getProductId());
        }
    }
}