package com.buy01.events.product;
public record ReserveItemResponse(String productId, int quantity, boolean success, String message) {
}
