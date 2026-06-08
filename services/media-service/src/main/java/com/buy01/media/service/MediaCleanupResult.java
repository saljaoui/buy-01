package com.buy01.media.service;

import java.util.List;

public record MediaCleanupResult(
        String productId,
        int deletedCount,
        int missingCount,
        List<String> failedFiles) {

    public boolean hasFailures() {
        return failedFiles != null && !failedFiles.isEmpty();
    }

    public String summary() {
        if (!hasFailures()) {
            return String.format(
                    "Cleanup completed for productId=%s (deleted=%d, missing=%d)",
                    productId,
                    deletedCount,
                    missingCount);
        }

        return String.format(
                "Cleanup partially failed for productId=%s (deleted=%d, missing=%d, failed=%s)",
                productId,
                deletedCount,
                missingCount,
                failedFiles);
    }
}
