package com.buy01.media.service;

import com.buy01.media.client.ProductServiceClient;
import com.buy01.media.dto.MediaResponse;
import com.buy01.media.exception.InvalidFileException;
import com.buy01.media.exception.MediaNotFoundException;
import com.buy01.media.exception.UnauthorizedActionException;
import com.buy01.media.model.Media;
import com.buy01.media.repository.MediaRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MediaService {

    private static final long MAX_SIZE_BYTES = 2L * 1024 * 1024; // 2 MB

    private final MediaRepository mediaRepository;
    private final FileStorageService fileStorageService;
    private final ProductServiceClient productServiceClient;

    @Transactional
    public MediaResponse upload(MultipartFile file, String productId, String userId) {
        validateFile(file);

        if (!productServiceClient.checkOwnership(productId, userId)) {
            throw new UnauthorizedActionException("You do not own this product");
        }

        String storedPath = fileStorageService.store(file);

        try {
            Media media = new Media();
            media.setProductId(productId);
            media.setImagePath(storedPath);

            Media saved = mediaRepository.save(media);
            return toResponse(saved);

        } catch (Exception e) {
            fileStorageService.delete(storedPath);
            throw e;
        }
    }

    public FileStorageService.LoadedFile loadFile(String id) {
        Media media = getOrThrow(id);
        return fileStorageService.load(media.getImagePath());
    }

    public List<MediaResponse> findByProductId(String productId) {
        return mediaRepository.findByProductId(productId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void delete(String id, String userId) {
        Media media = getOrThrow(id);

        if (!productServiceClient.checkOwnership(media.getProductId(), userId)) {
            throw new UnauthorizedActionException("You do not own this media");
        }

        fileStorageService.delete(media.getImagePath());
        mediaRepository.delete(media);
    }

    @Transactional
    public void deleteAllForProduct(String productId) {
        List<Media> mediaList = mediaRepository.findByProductId(productId);

        for (Media media : mediaList) {
            fileStorageService.delete(media.getImagePath());
        }

        mediaRepository.deleteAll(mediaList);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("File is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new InvalidFileException("Only image files are allowed");
        }

        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new InvalidFileException("File exceeds the 2MB size limit");
        }
    }

    private Media getOrThrow(String id) {
        return mediaRepository.findById(id)
                .orElseThrow(() ->
                        new MediaNotFoundException("Media not found with id: " + id));
    }

    private MediaResponse toResponse(Media media) {
        return new MediaResponse(
                media.getId(),
                "/media/" + media.getId(),
                media.getProductId()
        );
    }
}