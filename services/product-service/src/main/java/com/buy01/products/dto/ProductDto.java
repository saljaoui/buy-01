package com.buy01.products.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@Data
public class ProductDto {
    private String name;
    private String description;
    private Double price;
    private Integer quantity;
}
