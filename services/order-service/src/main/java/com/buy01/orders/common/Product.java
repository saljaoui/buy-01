package com.buy01.orders.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor 
@Data
@NoArgsConstructor 
public class Product {
    private String id;
    private String name;
    private double price;
    private int quantity;
}