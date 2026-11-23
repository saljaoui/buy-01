package com.buy01.orders.service;

import org.springframework.stereotype.Service;
import com.buy01.orders.client.ProductClient;
import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor 
@Data
@Service 
public class ReserveOrderService {
    private final ProductClient productClient;
    
    
}