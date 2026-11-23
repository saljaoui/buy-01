package com.buy01.orders.model.dto;

import java.math.BigDecimal;

public record PriceChange(
        String productId,
        String name,
        BigDecimal oldPrice,
        BigDecimal newPrice,
        BigDecimal difference   // newPrice - oldPrice
) {}
