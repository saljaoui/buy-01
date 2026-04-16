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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.buy01.media.dto.MediaResponse;
import com.buy01.media.service.MediaService;
import lombok.AllArgsConstructor;

@AllArgsConstructor
@RestController
@RequestMapping("/api/media")
public class MediaController {
    private final MediaService mediaService;

    @PostMapping("/upload")
    public ResponseEntity<String> upload(@RequestParam("image") MultipartFile file,
            @RequestParam("productId") String productId) {
        return ResponseEntity.ok("file name : " + this.mediaService.upload(file, productId));
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
                .body(this.mediaService.findAllByProductId2(id));
    }
}
