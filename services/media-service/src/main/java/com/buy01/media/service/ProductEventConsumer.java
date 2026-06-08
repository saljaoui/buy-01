package com.buy01.media.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import com.buy01.events.ProductDeletedEvent;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(ProductEventConsumer.class);

    private final MediaService mediaService;

    @KafkaListener(topics = "product-events", groupId = "media-service-group")
    public void handleProductEvent(ProductDeletedEvent event) {
        log.info("Received product delete event for productId={} deletedBy={}", event.productId(), event.deletedBy());
        MediaCleanupResult cleanupResult = this.mediaService.deleteAllByProductId(event.productId());
        if (cleanupResult.hasFailures()) {
            throw new IllegalStateException(cleanupResult.summary());
        }
        log.info(cleanupResult.summary());
    }
}
