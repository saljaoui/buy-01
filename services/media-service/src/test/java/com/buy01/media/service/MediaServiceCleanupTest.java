package com.buy01.media.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.buy01.events.ProductDeletedEvent;
import com.buy01.media.client.ProductServiceClient;
import com.buy01.media.model.Media;
import com.buy01.media.repository.MediaRepository;

@ExtendWith(MockitoExtension.class)
class MediaServiceCleanupTest {

    @Mock
    private MediaRepository mediaRepository;

    @Mock
    private ProductServiceClient productServiceClient;

    @Test
    void deleteAllByProductIdDeletesDatabaseRowsWhenFilesAreMissing() {
        MediaService mediaService = new MediaService(mediaRepository, productServiceClient);
        when(mediaRepository.findAllByProductId("product-1")).thenReturn(List.of(
                Media.builder()
                        .id("media-1")
                        .productId("product-1")
                        .imagePath("missing-file.jpg")
                        .build()));

        MediaCleanupResult result = mediaService.deleteAllByProductId("product-1");

        assertThat(result.hasFailures()).isFalse();
        assertThat(result.deletedCount()).isZero();
        assertThat(result.missingCount()).isEqualTo(1);
        verify(mediaRepository).deleteAllByProductId("product-1");
    }

    @Test
    void productDeleteEventTriggersMediaCleanup() {
        MediaService mediaService = new MediaService(mediaRepository, productServiceClient);
        ProductEventConsumer consumer = new ProductEventConsumer(mediaService);
        when(mediaRepository.findAllByProductId("product-1")).thenReturn(List.of());

        consumer.handleProductEvent(new ProductDeletedEvent("product-1", "seller-1", java.time.Instant.now()));

        verify(mediaRepository).deleteAllByProductId("product-1");
    }
}
