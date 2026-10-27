package com.buy01.media.event;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.buy01.events.product.ProductDeletedEvent;
import com.buy01.media.repository.MediaRepository;

@Component
public class ProductDeletedListener {

    private final MediaRepository mediaRepository;

    public ProductDeletedListener(MediaRepository mediaRepository) {
        this.mediaRepository = mediaRepository;
    }

    @KafkaListener(topics = "product-deleted", groupId = "media-service")
    public void onProductDeleted(ProductDeletedEvent event) {

        mediaRepository.deleteByProductId(event.productId());

    }
}