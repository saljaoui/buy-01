package com.buy01.orders.service;

import java.math.BigDecimal;
import java.util.ArrayList;

import org.bson.types.Decimal128;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import com.buy01.orders.repository.CartRepository;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import com.buy01.orders.client.ProductClient;
import com.buy01.orders.model.dto.CartUpdateRequest;
import com.buy01.orders.model.dto.ProductResponse;
import com.buy01.orders.model.dto.UpdateCartResponse;

import lombok.Data;

import com.buy01.orders.exception.CartNotFoundException;
import com.buy01.orders.exception.ProductExistsInCartException;
import com.buy01.orders.exception.ProductNotFoundException;
import com.buy01.orders.model.entity.Cart;
import com.buy01.orders.common.CartStatus;
import com.buy01.orders.common.Product;
@AllArgsConstructor
@Data
@Service 
public class CartService {
    private final CartRepository cartRepository;
    private final ProductClient productClient;
    private final MongoTemplate mongoTemplate;

    public void addToCart(String username, String productId) {
        System.out.println("Adding product to cart: " + productId + " for user: " + username);
        if (isProductInCart(productId, username)) {
            throw new ProductExistsInCartException("Product is already in the cart");
        }

        ProductResponse product = productClient.getProduct(productId).orElseThrow(() -> new ProductNotFoundException("Product not found"));
        Cart cart = cartRepository.findByUsername(username).orElseGet(Cart::new);
        cart.setUsername(username);
        
        Product cartItem = new Product();
        cartItem.setId(product.getId());
        cartItem.setName(product.getName());
        cartItem.setPrice(new Decimal128(BigDecimal.valueOf(product.getPrice())));
        if (cart.getItems() == null) {
            cart.setItems(new ArrayList<>());
        }
        cartItem.setQuantity(1);
        cart.getItems().add(cartItem);
        cartRepository.save(cart);
    }

    public Cart getSubjectCart(String username) {
        return cartRepository.findByUsername(username).orElse(null);
    }

    public Cart getCartByUserId(String userId) {
        return cartRepository.findById(userId).orElse(new Cart());
    }
    public boolean isProductInCart(String productId, String username) {
        return cartRepository.existsByUsernameAndProductId(username, productId);
    }

    public boolean isCartOwner(String cartId, String username) {
        return cartRepository.existsByIdAndUsername(cartId, username);
    }

    public void removeFromCart(String userId, String productId) {
        Cart cart = cartRepository.findById(userId).orElseThrow(() -> new CartNotFoundException("Cart not found"));
        if (!cart.getItems().removeIf(item -> item.getId().equals(productId))) {
            throw new ProductNotFoundException("Product not found in the cart");
        } else {
            cartRepository.save(cart);
        }
    }

    public void updateCart(String id, CartUpdateRequest request, String username) {
        Cart cart = cartRepository.findById(id).orElseThrow(() -> new CartNotFoundException("Cart not found"));
        Product productToUpdate = cart.getItems().stream()
                .filter(item -> item.getId().equals(request.getProductId()))
                .findFirst()
                .orElseThrow(() -> new ProductNotFoundException("Product not found in the cart"));
        productToUpdate.setQuantity(request.getQuantity());
        cartRepository.save(cart);
    }

    public void clearCart(String username) {
        Cart cart = cartRepository.findByUsername(username).orElseThrow(() -> new CartNotFoundException("Cart not found"));
        cart.getItems().clear();
        cartRepository.save(cart);
    }

    public void releaseCart(String username) {
        Cart cart = cartRepository.findByUsername(username).orElseThrow(() -> new CartNotFoundException("Cart not found"));
        cart.setStatus(CartStatus.AVAILABLE);
        cartRepository.save(cart);
    }

    public UpdateCartResponse makeCartCheckingOut(String username) {
        Query q = new Query(Criteria.where("username").is(username)
                .and("status").is(CartStatus.AVAILABLE));
        Update u = new Update()
                .set("status", CartStatus.CHECKING_OUT);
        Cart cart = mongoTemplate.findAndModify(q, u,
                FindAndModifyOptions.options().returnNew(true), Cart.class);
        if (cart != null) {
            if (cart.getItems().isEmpty()) {
                return new UpdateCartResponse(false,  "Cart is empty.", null);
            }
            return new UpdateCartResponse(true,"Cart status updated to CHECKING_OUT", cart);
        } else {
            return new UpdateCartResponse(false, "No available cart found for user: " + username, null);
            
        }
    }
}
