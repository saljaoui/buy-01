package com.buy01.orders.common;

import org.bson.types.Decimal128;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;

@AllArgsConstructor 
@Data
@NoArgsConstructor
@Builder
public class Product {
    private String id;
    private String name;
    private Decimal128 price;
    private int quantity;
   
}