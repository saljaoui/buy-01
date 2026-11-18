package com.buy01.orders.model.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor 
@Data 
@NoArgsConstructor
public class CartUpdateRequest {
    private String productId;
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 5, message = "Quantity cannot exceed 5")
    private int quantity;
    private String cartId;
}
