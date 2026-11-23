package com.buy01.orders.model.dto;

import com.buy01.orders.model.entity.Cart;

public record UpdateCartResponse(
    boolean success,
    String message,
    Cart cart
) {}
