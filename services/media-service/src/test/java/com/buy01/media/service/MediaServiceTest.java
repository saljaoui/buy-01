package com.buy01.media.service;

import com.buy01.media.client.ProductServiceClient;
import com.buy01.media.dto.MediaResponse;
import com.buy01.media.exception.InvalidFileException;
import com.buy01.media.exception.MediaNotFoundException;
import com.buy01.media.exception.UnauthorizedActionException;
import com.buy01.media.model.Media;
import com.buy01.media.repository.MediaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MediaServiceTest {

    @Mock
    private MediaRepository mediaRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private ProductServiceClient productServiceClient;

    @InjectMocks
    private MediaService mediaService;

    @Test
    void loadFile_returnsFile_whenMediaExists() {
        Media media = new Media("m1", "image.png", "p1");
        when(mediaRepository.findById("m1")).thenReturn(Optional.of(media));

        mediaService.loadFile("m1");

        verify(fileStorageService).load("image.png");
    }

    @Test
    void loadFile_throws_whenMediaNotFound() {
        when(mediaRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(MediaNotFoundException.class, () -> mediaService.loadFile("missing"));
    }

    @Test
    void upload_rejectsNonImageFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "doc.pdf", "application/pdf", new byte[]{1, 2, 3});

        assertThrows(InvalidFileException.class, () -> mediaService.upload(file, "p1", "u1"));
        verify(fileStorageService, never()).store(any());
    }

    @Test
    void upload_rejectsFileLargerThan2MB() {
        byte[] tooBig = new byte[2 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.png", "image/png", tooBig);

        assertThrows(InvalidFileException.class, () -> mediaService.upload(file, "p1", "u1"));
        verify(fileStorageService, never()).store(any());
    }

    @Test
    void upload_storesFileAndSaves_whenUserOwnsProduct() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[]{1, 2, 3});
        when(productServiceClient.checkOwnership("p1", "u1")).thenReturn(true);
        when(fileStorageService.store(file)).thenReturn("stored.png");
        when(mediaRepository.save(any(Media.class))).thenReturn(new Media("m1", "stored.png", "p1"));

        MediaResponse response = mediaService.upload(file, "p1", "u1");

        assertThat(response.id()).isEqualTo("m1");
        assertThat(response.productId()).isEqualTo("p1");
    }

    @Test
    void upload_throws_whenUserDoesNotOwnProduct() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[]{1, 2, 3});
        when(productServiceClient.checkOwnership("p1", "intruder")).thenReturn(false);

        assertThatThrownBy(() -> mediaService.upload(file, "p1", "intruder"))
                .isInstanceOf(UnauthorizedActionException.class);
        verify(fileStorageService, never()).store(any());
    }

    @Test
    void delete_throws_whenUserDoesNotOwnProduct() {
        when(mediaRepository.findById("m1")).thenReturn(Optional.of(new Media("m1", "image.png", "p1")));
        when(productServiceClient.checkOwnership("p1", "intruder")).thenReturn(false);

        assertThatThrownBy(() -> mediaService.delete("m1", "intruder"))
                .isInstanceOf(UnauthorizedActionException.class);
        verify(mediaRepository, never()).delete(any());
    }
}
