package com.buy01.media.controller;

import com.buy01.media.dto.MediaResponse;
import com.buy01.media.service.FileStorageService;
import com.buy01.media.service.MediaService;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    @PostMapping
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<MediaResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("productId") String productId,
            Authentication authentication) {

        String userId = authentication.getName();
        MediaResponse saved = mediaService.upload(file, productId, userId);
        return ResponseEntity.status(201).body(saved);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> getImage(@PathVariable String id) {
        FileStorageService.LoadedFile loaded = mediaService.loadFile(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(loaded.contentType()))
                .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic())
                .body(loaded.resource());
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<MediaResponse>> getByProduct(@PathVariable String productId) {
        return ResponseEntity.ok(mediaService.findByProductId(productId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SELLER')")
    public ResponseEntity<Void> delete(
            @PathVariable String id,
            Authentication authentication) {

        String userId = authentication.getName();
        mediaService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}