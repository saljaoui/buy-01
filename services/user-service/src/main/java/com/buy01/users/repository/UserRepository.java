package com.buy01.users.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.buy01.users.model.User;

public interface UserRepository extends MongoRepository<User, String> {

    /** Case-insensitive so accounts saved before emails were lower-cased are still matched. */
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);
}
