package com.buy01.media.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data

public class MediaResponse {
    private String id;
    private String base64Image;
    private String contentType;
}
