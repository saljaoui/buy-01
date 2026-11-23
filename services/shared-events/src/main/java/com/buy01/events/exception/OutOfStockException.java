package com.buy01.events.exception;

import java.lang.RuntimeException;
import java.util.List;
import com.buy01.events.product.ReserveItemResponse;

public class OutOfStockException extends RuntimeException {
    private final List<ReserveItemResponse> items;

    public OutOfStockException(List<ReserveItemResponse> items) {
        super("Some products are out of stock");
        this.items = items;
    }

    public List<ReserveItemResponse> getItems() { return items; }
}
