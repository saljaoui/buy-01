package com.buy01.products.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import com.buy01.products.model.Product;


@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder

public class ProductResponseDto {
    private String id;
    private String name;
    private String description;
    private Double price;
    private int quantity;
    private boolean owner;

    public static ProductResponseDto toDto(Product product) {
        return ProductResponseDto.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .quantity(product.getQuantity())
                .build();
    }
}
