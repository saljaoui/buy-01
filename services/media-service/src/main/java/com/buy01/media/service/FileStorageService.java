package com.buy01.media.service;

import com.buy01.media.exception.MediaNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${media.storage.path}")
    private String storageDir;

    public String store(MultipartFile file) {
        try {
            Path dir = Paths.get(storageDir);
            Files.createDirectories(dir);

            String extension = getExtension(file.getOriginalFilename());
            String filename = UUID.randomUUID() + extension;
            Path target = dir.resolve(filename);

            Files.copy(file.getInputStream(), target);
            return filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    public LoadedFile load(String imagePath) {
        try {
            Path file = Paths.get(storageDir).resolve(imagePath);
            if (!Files.exists(file)) {
                throw new MediaNotFoundException("Image file missing on disk: " + imagePath);
            }
            String contentType = Files.probeContentType(file);
            if (contentType == null) contentType = "application/octet-stream";
            return new LoadedFile(new FileSystemResource(file), contentType);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file", e);
        }
    }

    public void delete(String imagePath) {
        try {
            Files.deleteIfExists(Paths.get(storageDir).resolve(imagePath));
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file", e);
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf("."));
    }

    public record LoadedFile(Resource resource, String contentType) {}
}