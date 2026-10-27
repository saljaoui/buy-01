package com.buy01.products.event;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import com.buy01.events.product.ProductDeletedEvent;

@Service
public class ProductEventPublisher {

    private final KafkaTemplate<String, ProductDeletedEvent> kafkaTemplate;

    public ProductEventPublisher(KafkaTemplate<String, ProductDeletedEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishProductDeleted(String productId) {
        ProductDeletedEvent event = new ProductDeletedEvent(productId);
        kafkaTemplate.send("product-deleted", productId, event);
    }
}