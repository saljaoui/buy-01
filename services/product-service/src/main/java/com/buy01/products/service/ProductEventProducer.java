package com.buy01.products.service;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import com.example.events.ProductEvent;
import org.springframework.kafka.core.KafkaTemplate;
@Service
@RequiredArgsConstructor
public class ProductEventProducer {
    private static final String TOPIC = "product-events";
    private final KafkaTemplate<String, ProductEvent> kafkaTemplate;

    public void sendEvent(ProductEvent event) {
        kafkaTemplate.send(TOPIC, event.getProductId(), event);
        System.out.println("📤 Sent event: " + event.getEventType());
    }
}
