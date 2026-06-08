package com.buy01.media.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.buy01.media.client.ProductServiceClient;
import com.buy01.media.repository.MediaRepository;

@ExtendWith(MockitoExtension.class)
class MediaServiceOwnershipTest {

    @Mock
    private MediaRepository mediaRepository;

    @Mock
    private ProductServiceClient productServiceClient;

    @Test
    void nonOwnerCannotReplaceMedia() {
        MediaService mediaService = new MediaService(mediaRepository, productServiceClient);
        when(productServiceClient.isCurrentUserOwner("product-1", "Bearer token")).thenReturn(false);

        assertThatThrownBy(() -> mediaService.replaceMedia(List.of(), "product-1", "Bearer token"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");

        verify(mediaRepository, never()).deleteAllByProductId("product-1");
    }

    @Test
    void ownerCanDeleteMedia() {
        MediaService mediaService = new MediaService(mediaRepository, productServiceClient);
        when(productServiceClient.isCurrentUserOwner("product-1", "Bearer token")).thenReturn(true);
        when(mediaRepository.findAllByProductId("product-1")).thenReturn(List.of());

        mediaService.deleteAllByProductIdForOwner("product-1", "Bearer token");

        verify(mediaRepository).deleteAllByProductId("product-1");
    }
}
