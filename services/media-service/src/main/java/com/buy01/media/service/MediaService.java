package com.buy01.media.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import com.buy01.media.dto.MediaResponse;
import com.buy01.media.model.Media;
import com.buy01.media.repository.MediaRepository;
import jakarta.ws.rs.NotFoundException;
import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
@Service
public class MediaService {
    private final MediaRepository mediaRepository;

    public void upload(MultipartFile file, String productId) {
        System.out.println("image: " + file);
        String filePath = this.save(file);
        Media media = Media.builder()
                .productId(productId)
                .imagePath(filePath)
                .build();
        this.mediaRepository.save(media);
    }

    public void upload(List<MultipartFile> files, String productId) {
        if (files == null || files.isEmpty()) {
            return;
        }
        for (MultipartFile file : files) {
            this.upload(file, productId);
        }
    }

    private String save(MultipartFile file) {
        // 1. Validate file is not empty
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        try {
            // 2. Sanitize filename (prevent path traversal attacks)
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            // 3. Generate unique filename to avoid overwriting
            String uniqueFilename = UUID.randomUUID() + "_" + originalFilename;
            // 4. Create upload directory if missing
            Path uploadPath = Paths.get("uploads/");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            // 5. Write file to disk
            Path targetPath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            System.out.println("Saving to: " + uploadPath.toAbsolutePath());
            return uniqueFilename; // return saved filename to store in DB
        } catch (Exception e) {
            throw new IllegalAccessError(e.getMessage());
        }
    }

    
    public Resource find(String imageId) {
        Media media = this.mediaRepository.findById(imageId)
                .orElseThrow(() -> new NotFoundException("media not found"));
        String imagetPath = media.getImagePath();
        System.out.println("path = " + imagetPath);
        Resource image = new FileSystemResource("uploads/" + imagetPath);
        if (!image.exists()) {
            throw new NotFoundException("image not found");
        }
        return image;
    }

    public List<Resource> findAllByProductId(String productId) {
        return this.mediaRepository.findAllByProductId(productId)
                .stream().map(media -> this.find(media.getId())).toList();
    }

    public List<MediaResponse> findAllMediaByProductId(String productId) {

        List<Media> mediaList = mediaRepository.findAllByProductId(productId);
        return mediaList.stream().map(media -> {
            try {
                Resource image = new FileSystemResource("uploads/" + media.getImagePath());
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

    private void deleteMediaFile(Media media) {
        if (media == null || media.getImagePath() == null || media.getImagePath().isBlank()) {
            throw new IllegalArgumentException("Invalid media or image path");
        }
        try {
            // 1. Sanitize filename to prevent path traversal
            String filename = StringUtils.cleanPath(media.getImagePath());
            // 2. Build path inside uploads directory
            Path uploadPath = Paths.get("uploads/");
            Path filePath = uploadPath.resolve(filename).normalize();
            // 3. Extra safety: ensure file is still inside uploads folder
            if (!filePath.startsWith(uploadPath.toAbsolutePath().normalize())) {
                //throw new SecurityException("Invalid file path detected");
            }
            // 4. Delete file if it exists
            boolean deleted = Files.deleteIfExists(filePath);
            if (!deleted) {
                System.out.println("File not found: " + filePath);
            } else {
                System.out.println("Deleted file: " + filePath);
            }
        } catch (Exception e) {
            //throw new IllegalStateException("Failed to delete file: " + e.getMessage(), e);
        }
    }

    public void deleteAllByProductId(String productId) {
        List<Media> mediaList = this.getAllMedia(productId);
        mediaList.forEach(this::deleteMediaFile);
        this.mediaRepository.deleteAllByProductId(productId);

    }

    public void delete(Media media) {
        this.mediaRepository.delete(media);
    }

    public List<Media> getAllMedia(String productId) {
        return this.mediaRepository.findAllByProductId(productId);
    }
}
