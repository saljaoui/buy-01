package com.buy01.products;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.kafka.core.KafkaTemplate;

import com.buy01.events.ProductDeletedEvent;

@SpringBootTest(properties = {
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration"
})
class ProductServiceApplicationTests {

    @MockBean
    private KafkaTemplate<String, ProductDeletedEvent> kafkaTemplate;

	@Test
	void contextLoads() {
	}

}
