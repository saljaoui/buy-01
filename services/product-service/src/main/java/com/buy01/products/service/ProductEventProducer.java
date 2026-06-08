package com.buy01.products.service;

import java.util.concurrent.CompletableFuture;

import org.apache.kafka.clients.producer.RecordMetadata;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import com.buy01.events.ProductDeletedEvent;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductEventProducer {

    private static final Logger log = LoggerFactory.getLogger(ProductEventProducer.class);
    private static final String TOPIC = "product-events";

    private final KafkaTemplate<String, ProductDeletedEvent> kafkaTemplate;

    public CompletableFuture<SendResult<String, ProductDeletedEvent>> sendProductDeletedEvent(ProductDeletedEvent event) {
        CompletableFuture<SendResult<String, ProductDeletedEvent>> future =
                kafkaTemplate.send(TOPIC, event.productId(), event);

        future.whenComplete((result, throwable) -> {
            if (throwable != null) {
                log.error("Failed to publish product delete event for productId={}", event.productId(), throwable);
                return;
            }

            RecordMetadata metadata = result.getRecordMetadata();
            log.info(
                    "Published product delete event for productId={} to topic={} partition={} offset={}",
                    event.productId(),
                    metadata.topic(),
                    metadata.partition(),
                    metadata.offset());
        });

        return future;
    }
}
