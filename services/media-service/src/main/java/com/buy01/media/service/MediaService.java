package com.buy01.media.service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.buy01.media.dto.MediaResponse;
import com.buy01.media.model.Media;
import com.buy01.media.repository.MediaRepository;

import io.jsonwebtoken.io.IOException;
import jakarta.ws.rs.NotFoundException;
import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
@Service
public class MediaService {
    private final MediaRepository mediaRepository;

    public String upload(MultipartFile file, String productId) {
        String filePath = this.save(file);
        Media media = Media.builder()
                .productId(productId)
                .imagePath(filePath)
                .build();
        this.mediaRepository.save(media);
        return media.getImagePath();
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

    public List<MediaResponse> findAllByProductId2(String productId) {
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
}
