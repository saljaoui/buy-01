package com.buy01.orders.model.dto;

import org.bson.types.Decimal128;

public record ReservedProduct(
    String id,
    Decimal128 price
) {}
