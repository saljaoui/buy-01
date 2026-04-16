package com.buy01.media.model;

import org.springframework.data.annotation.Id;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NonNull;

@Data
@NoArgsConstructor
@Builder
@AllArgsConstructor
@NonNull
public class Media {
    @Id
    private String id;
    private String imagePath;
    private String productId;
}
