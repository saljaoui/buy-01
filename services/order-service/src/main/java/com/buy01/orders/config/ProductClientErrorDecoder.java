package com.buy01.orders.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.Response;
import feign.codec.ErrorDecoder;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.springframework.stereotype.Component;
import com.buy01.events.exception.OutOfStockException;
import com.buy01.events.product.ReserveItemResponse;

@Component
public class ProductClientErrorDecoder implements ErrorDecoder {

    private final ObjectMapper objectMapper;
    private final ErrorDecoder defaultDecoder = new ErrorDecoder.Default();

    public ProductClientErrorDecoder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public Exception decode(String methodKey, Response response) {
        if (response.status() == 409) {
            try (InputStream body = response.body().asInputStream()) {
                List<ReserveItemResponse> items =
                        objectMapper.readValue(body, new TypeReference<List<ReserveItemResponse>>() {});
                return new OutOfStockException(items);
            } catch (IOException e) {
                return new IllegalStateException("Could not read stock error response", e);
            }
        }
        return defaultDecoder.decode(methodKey, response);   // 5xx etc. -> FeignException
    }
}
