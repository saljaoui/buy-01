package com.buy01.media.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.buy01.media.model.Media;

public interface MediaRepository extends MongoRepository<Media, String> {
    List<Media> findAllByProductId(String productId);
}
