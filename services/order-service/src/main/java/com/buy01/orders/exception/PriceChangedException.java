package com.buy01.orders.exception;

import java.util.List;
import com.buy01.orders.model.dto.PriceChange;

public class PriceChangedException extends RuntimeException {
    private final List<PriceChange> changes;

    public PriceChangedException(List<PriceChange> changes) {
        super("One or more product prices have changed");
        this.changes = changes;
    }

    public List<PriceChange> getChanges() { return changes; }
}