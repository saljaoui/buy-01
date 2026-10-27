package com.buy01.products.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;


@NoArgsConstructor
@AllArgsConstructor
@Data
@Builder
public class ProductResponse {
    private String id;
    private String name;
    private String description;
    private Double price;
    private Integer quantity;
    private boolean owner;
}
