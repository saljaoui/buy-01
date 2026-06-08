package com.buy01.media.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.buy01.media.client.ProductServiceClient;
import com.buy01.media.dto.MediaResponse;
import com.buy01.media.model.Media;
import com.buy01.media.repository.MediaRepository;

import jakarta.ws.rs.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaService {
    private static final Path UPLOAD_ROOT = Paths.get("uploads").toAbsolutePath().normalize();

    private final MediaRepository mediaRepository;
    private final ProductServiceClient productServiceClient;

    public void upload(MultipartFile file, String productId) {
        String filePath = this.save(file);
        Media media = Media.builder()
                .productId(productId)
                .imagePath(filePath)
                .build();
        this.mediaRepository.save(media);
    }

    public void upload(List<MultipartFile> files, String productId, String authorizationHeader) {
        this.assertSellerOwnsProduct(productId, authorizationHeader);
        if (files == null || files.isEmpty()) {
            return;
        }
        for (MultipartFile file : files) {
            this.validateImage(file);
            this.upload(file, productId);
        }
    }

    public void replaceMedia(List<MultipartFile> files, String productId, String authorizationHeader) {
        this.assertSellerOwnsProduct(productId, authorizationHeader);
        MediaCleanupResult cleanupResult = this.deleteAllByProductId(productId);
        if (cleanupResult.hasFailures()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, cleanupResult.summary());
        }
        this.upload(files, productId, authorizationHeader);
    }

    public void deleteAllByProductIdForOwner(String productId, String authorizationHeader) {
        this.assertSellerOwnsProduct(productId, authorizationHeader);
        MediaCleanupResult cleanupResult = this.deleteAllByProductId(productId);
        if (cleanupResult.hasFailures()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, cleanupResult.summary());
        }
    }

    private void assertSellerOwnsProduct(String productId, String authorizationHeader) {
        try {
            boolean owner = productServiceClient.isCurrentUserOwner(productId, authorizationHeader);
            if (!owner) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "You are not allowed to modify this product");
            }
        } catch (HttpClientErrorException.NotFound ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product Not Found", ex);
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null ||
            !(contentType.equals("image/jpeg") ||
              contentType.equals("image/png") ||
              contentType.equals("image/webp") ||
                contentType.equals("image/avif"))) {
            throw new IllegalArgumentException("Only JPG, PNG, WEBP, AVIF images are allowed");
        }

        long maxSize = 2 * 1024 * 1024;

        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File too large (max 2MB)");
        }
    }

    private String save(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        try {
            String originalFilename = sanitizeFilename(file.getOriginalFilename());
            String uniqueFilename = UUID.randomUUID() + "_" + originalFilename;
            if (!Files.exists(UPLOAD_ROOT)) {
                Files.createDirectories(UPLOAD_ROOT);
            }
            Path targetPath = UPLOAD_ROOT.resolve(uniqueFilename).normalize();
            validateInsideUploadRoot(targetPath);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            return uniqueFilename;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store media file", e);
        }
    }

    public Resource find(String imageId) {
        Media media = this.mediaRepository.findById(imageId)
                .orElseThrow(() -> new NotFoundException("media not found"));
        Path imagePath = resolveMediaPath(media);
        Resource image = new FileSystemResource(imagePath.toFile());
        if (!image.exists()) {
            throw new NotFoundException("image not found");
        }
        return image;
    }

    public Resource findPrimaryImage(String productId) {

        List<Media> mediaList = this.mediaRepository.findAllByProductId(productId);
        if (!mediaList.isEmpty()) {
            return this.find(mediaList.get(0).getId());
        }
        return null;
    }

    public List<Resource> findAllByProductId(String productId) {
        return this.mediaRepository.findAllByProductId(productId)
                .stream().map(media -> this.find(media.getId())).toList();
    }

    public List<MediaResponse> findAllMediaByProductId(String productId) {
        List<Media> mediaList = mediaRepository.findAllByProductId(productId);
        return mediaList.stream().map(media -> {
            try {
                Path imagePath = resolveMediaPath(media);
                Resource image = new FileSystemResource(imagePath.toFile());
                byte[] imageBytes = Files.readAllBytes(image.getFile().toPath());
                String base64 = Base64.getEncoder().encodeToString(imageBytes);
                String contentType = Files.probeContentType(image.getFile().toPath());
                return new MediaResponse(media.getId(), base64, contentType);
            } catch (Exception e) {
                throw new RuntimeException("Failed to read image", e);
            }
        }).collect(Collectors.toList());
    }

    public List<Media> findAll() {
        return this.mediaRepository.findAll();
    }

    private boolean deleteMediaFile(Media media) {
        try {
            Path filePath = resolveMediaPath(media);
            return Files.deleteIfExists(filePath);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to delete media file for productId="
                    + (media == null ? "unknown" : media.getProductId()), e);
        }
    }

    public MediaCleanupResult deleteAllByProductId(String productId) {
        List<Media> mediaList = this.getAllMedia(productId);
        List<String> failedFiles = new ArrayList<>();
        int deletedCount = 0;
        int missingCount = 0;

        for (Media media : mediaList) {
            try {
                boolean deleted = this.deleteMediaFile(media);
                if (deleted) {
                    deletedCount++;
                } else {
                    missingCount++;
                }
            } catch (Exception ex) {
                String failedFile = media == null
                        ? "unknown"
                        : (media.getImagePath() == null || media.getImagePath().isBlank()
                                ? media.getId()
                                : media.getImagePath());
                failedFiles.add(failedFile);
                log.error("Failed to remove media file for productId={} mediaId={}",
                        productId,
                        media == null ? "unknown" : media.getId(),
                        ex);
            }
        }

        if (failedFiles.isEmpty()) {
            this.mediaRepository.deleteAllByProductId(productId);
            log.info("Media cleanup completed for productId={} deleted={} missing={}",
                    productId, deletedCount, missingCount);
        } else {
            log.error("Media cleanup partially failed for productId={} failedFiles={}", productId, failedFiles);
        }

        return new MediaCleanupResult(productId, deletedCount, missingCount, List.copyOf(failedFiles));
    }

    public void delete(Media media) {
        this.mediaRepository.delete(media);
    }

    public List<Media> getAllMedia(String productId) {
        return this.mediaRepository.findAllByProductId(productId);
    }

    private static String sanitizeFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("Original filename is missing");
        }

        String cleaned = StringUtils.cleanPath(originalFilename);
        String filename = Paths.get(cleaned).getFileName().toString();
        if (filename.isBlank() || filename.equals(".") || filename.equals("..")) {
            throw new IllegalArgumentException("Invalid filename");
        }
        return filename;
    }

    private static Path resolveMediaPath(Media media) {
        if (media == null || media.getImagePath() == null || media.getImagePath().isBlank()) {
            throw new IllegalArgumentException("Invalid media or image path");
        }

        Path filePath = UPLOAD_ROOT.resolve(sanitizeFilename(media.getImagePath())).normalize();
        validateInsideUploadRoot(filePath);
        return filePath;
    }

    private static void validateInsideUploadRoot(Path filePath) {
        if (!filePath.startsWith(UPLOAD_ROOT)) {
            throw new SecurityException("Invalid file path outside upload directory");
        }
    }
}
