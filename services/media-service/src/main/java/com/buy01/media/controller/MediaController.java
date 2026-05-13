package com.buy01.media.controller;

import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.buy01.media.dto.MediaResponse;
import com.buy01.media.service.MediaService;
import lombok.AllArgsConstructor;
import java.util.Map;


@AllArgsConstructor
@RestController
@RequestMapping("/api/media")
public class MediaController {
    private final MediaService mediaService;

    @PostMapping(value = "/upload",
    consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestPart("images") List<MultipartFile> files,
            @RequestPart("productId") String productId) {
                this.mediaService.upload(files, productId);
        return ResponseEntity.ok(Map.of("message","media added succesfuly"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> find(@PathVariable("id") String id) {
        Resource resource = this.mediaService.find(id);
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
}
