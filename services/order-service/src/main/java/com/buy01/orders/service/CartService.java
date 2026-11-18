package com.buy01.orders.service;

import java.util.ArrayList;

import org.springframework.stereotype.Service;
import com.buy01.orders.repository.CartRepository;
import lombok.AllArgsConstructor;
import com.buy01.orders.client.ProductClient;
import com.buy01.orders.model.dto.ProductResponse;
import lombok.Data;
import com.buy01.orders.exception.ProductExistsInCartException;
import com.buy01.orders.model.entity.Cart;
import com.buy01.orders.common.Product;
@AllArgsConstructor
@Data
@Service 
public class CartService {
    private final CartRepository cartRepository;
    private final ProductClient productClient;

    public void addToCart(String username, String productId) {
        System.out.println("Adding product to cart: " + productId + " for user: " + username);
        if (isProductInCart(productId, username)) {
            throw new ProductExistsInCartException("Product is already in the cart");
        }
        ProductResponse product = productClient.getProduct(productId);
        Cart cart = cartRepository.findByUsername(username).orElseGet(Cart::new);
        cart.setUsername(username);
        Product cartItem = new Product();
        cartItem.setId(product.getId());
        cartItem.setName(product.getName());
        cartItem.setPrice(product.getPrice());
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
        return cartRepository.existsByItemsId(productId, username);
    }


    public void removeFromCart(String userId, String productId) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'removeFromCart'");
    }

}
