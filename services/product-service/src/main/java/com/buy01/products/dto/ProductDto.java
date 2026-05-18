package com.buy01.products.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotNull;

@NoArgsConstructor
@Data
public class ProductDto {
    @NotNull
    private String name;
    @NotNull
    private String description;
    @NotNull
    private Double price;
    @NotNull
    private Integer quantity;
}
