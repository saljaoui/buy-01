package com.buy01.products.service;

import java.util.concurrent.CompletableFuture;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import com.buy01.events.product.ProductDeletedEvent;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductEventProducer {

    private static final String TOPIC = "product-deleted";

    private final KafkaTemplate<String, ProductDeletedEvent> kafkaTemplate;

    public CompletableFuture<SendResult<String, ProductDeletedEvent>> sendProductDeletedEvent(
            ProductDeletedEvent event) {
        return kafkaTemplate.send(TOPIC, event.productId(), event);
    }
}