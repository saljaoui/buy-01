package com.buy01.orders.common;

import java.sql.Date;
import org.bson.types.Decimal128;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor 
@Data
@NoArgsConstructor 
public class Product {
    private String id;
    private String name;
    private Decimal128 price;
    private int quantity;
    private Date createdAt;
    private String cancelationReason;
}