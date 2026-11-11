package com.buy01.orders.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@AllArgsConstructor
@NoArgsConstructor
@Data
public class CartItemDTO {
    private String userId;
    private String productId;  
}
