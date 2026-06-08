package com.buy01.media.controller;

import java.util.List;
import java.util.Map;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.buy01.media.dto.MediaResponse;
import com.buy01.media.service.MediaService;

import lombok.AllArgsConstructor;

@AllArgsConstructor
@RestController
@RequestMapping("/api/media")
public class MediaController {
    private final MediaService mediaService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('ROLE_SELLER')")
    public ResponseEntity<?> upload(
            @RequestPart("images") List<MultipartFile> files,
            @RequestPart("productId") String productId,
            Authentication authentication,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        requireSeller(authentication);
        this.mediaService.upload(files, productId, authorization);
        return ResponseEntity.ok(Map.of("message", "media added successfully"));
    }

    @GetMapping("/primary/product/{id}")
    public ResponseEntity<Resource> find(@PathVariable("id") String id) {
        Resource resource = this.mediaService.findPrimaryImage(id);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(resource);
    }

    @GetMapping("/product/{id}")
    public ResponseEntity<List<MediaResponse>> findAllByProductId(@PathVariable("id") String id) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(this.mediaService.findAllMediaByProductId(id));
    }

    @PutMapping(value = "/product", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('ROLE_SELLER')")
    public ResponseEntity<?> updateMedia(
            @RequestPart("images") List<MultipartFile> files,
            @RequestPart("productId") String productId,
            Authentication authentication,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        requireSeller(authentication);
        this.mediaService.replaceMedia(files, productId, authorization);
        return ResponseEntity.ok(Map.of("message", "media updated successfully"));
    }

    @DeleteMapping("/product/{productId}")
    @PreAuthorize("hasAuthority('ROLE_SELLER')")
    public ResponseEntity<?> deleteMedia(
            @PathVariable String productId,
            Authentication authentication,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        requireSeller(authentication);
        this.mediaService.deleteAllByProductIdForOwner(productId, authorization);
        return ResponseEntity.ok(Map.of("message", "media deleted successfully"));
    }

    private void requireSeller(Authentication authentication) {
        boolean seller = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_SELLER".equals(authority.getAuthority()));
        if (!seller) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seller role required");
        }
    }
}
