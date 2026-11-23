package com.buy01.orders.service;

import org.bson.types.Decimal128;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.buy01.orders.common.CartStatus;
import com.buy01.orders.model.entity.Cart;
import com.buy01.orders.model.entity.Order;
import com.buy01.orders.repository.OrderRepository;
import com.mongodb.client.result.UpdateResult;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import com.buy01.orders.client.ProductClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.naming.ServiceUnavailableException;

import com.buy01.orders.model.dto.PriceChange;
import com.buy01.orders.model.dto.ProductResponse;
import com.buy01.orders.model.dto.UpdateCartResponse;
import com.buy01.orders.common.Product;
import com.buy01.orders.common.Status;
import com.buy01.orders.exception.PriceChangedException;
import com.buy01.orders.exception.ProductNotFoundException;
import com.buy01.events.product.ReserveItem;
import com.buy01.events.product.ReserveItemResponse;
import com.buy01.events.exception.OutOfStockException;

@AllArgsConstructor
@Data
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartService cartService;
    private final ProductClient productClient;
    private final MongoTemplate mongoTemplate;
    public String createOrder(String username) {
        UpdateCartResponse updateCartResponse = this.cartService.makeCartCheckingOut(username);
        if (!updateCartResponse.success()) {
            this.cartService.releaseCart(username);
            return updateCartResponse.message();
        } else {
            Cart cart = updateCartResponse.cart();
            boolean success = this.compareProductsPrices(cart);
            if (success) {
                this.placeOrder(cart);
            }
            return "success";
        }
    }

    private List<ProductResponse> loadReservedProducts(Cart cart) {
        List<String> productIds = cart.getItems().stream().map(Product::getId)
                .toList();
        return this.productClient.getAllProducts(productIds);
    }

    private boolean compareProductsPrices(Cart cart) {
        List<ProductResponse> reservedProducts = this.loadReservedProducts(cart);
        List<PriceChange> priceChanges = new ArrayList<>();
        boolean success = true;
        for (ProductResponse product : reservedProducts) {
            BigDecimal oldPrice = cart.getItems().stream()
                                    .filter( p -> p.getId().equals(product.getId()))
                                    .findFirst()
                                    .map(p -> p.getPrice().bigDecimalValue())
                                    .orElseThrow(() -> new ProductNotFoundException("product not found with Id: "+ product.getId()));
            BigDecimal newPrice =  BigDecimal.valueOf(product.getPrice());
            BigDecimal difference = newPrice.subtract(oldPrice);
            PriceChange priceChange = new PriceChange(product.getId(),product.getName(),oldPrice, newPrice, difference);
            priceChanges.add(priceChange);
            if (difference.compareTo(BigDecimal.ZERO) != 0) {
                success = false;
            }
        }
        if (!success) {
            // create order with 'PENDDING' expired in a few minuts
            this.savePendingOrder(cart, reservedProducts);
            throw new PriceChangedException(priceChanges);
        }
        return true;
    }

    private void savePendingOrder(Cart cart, List<ProductResponse> products) {
        Order order = this.initalOrder(cart, products);
        order.setStatus(Status.PENDDING);
        this.orderRepository.save(order);

    }
    
    private void placeOrder(Cart cart) {
        List<ReserveItem> reserveItems = cart.getItems().stream()
        .map(p -> new ReserveItem(p.getId(), p.getQuantity()))
        .toList();
        this.reserve(reserveItems, cart.getUsername());
        Order order = this.initalOrder(cart);
        this.orderRepository.save(order);
    }

    private Order initalOrder(Cart cart, List<ProductResponse> products) {
        Order order = new Order();
        order.setStatus(Status.SHIPPED);
        order.setUserId(cart.getUsername());
        order.setCreatedAt(Date.from(Instant.now()));
        order.setItems(
            products.stream()
            .map(p -> Product.builder()
                .name(p.getName())
                .price(new Decimal128(BigDecimal.valueOf(p.getPrice())))
                .quantity(cart.getItems().stream().filter(cp -> cp.getId().equals(p.getId())).findFirst().map(Product::getQuantity).orElseThrow(() -> new ProductNotFoundException("product not found")))
                .id(p.getId())
                .build()
             ).toList()
        );
        return order;
    }

    private Order initalOrder(Cart cart) {
        Order order = new Order();
        order.setStatus(Status.SHIPPED);
        order.setUserId(cart.getUsername());
        order.setCreatedAt(Date.from(Instant.now()));
        order.setItems(cart.getItems());
        return order;
    }

    public void reserve(List<ReserveItem> items, String username) {
        try {
            productClient.reserve(items);
        } catch (OutOfStockException e) {
            cartService.releaseCart(username);
            throw e; // business failure -> map to 409 for the client
        } catch (Exception e) {
            cartService.releaseCart(username);
        }
    }
}
