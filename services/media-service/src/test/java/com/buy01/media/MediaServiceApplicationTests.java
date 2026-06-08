package com.buy01.media;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;

import com.buy01.events.ProductDeletedEvent;

@SpringBootTest(properties = {
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration",
        "spring.kafka.listener.auto-startup=false"
})
class MediaServiceApplicationTests {

    @MockBean
    private ConsumerFactory<String, ProductDeletedEvent> consumerFactory;

    @MockBean
    private KafkaTemplate<String, ProductDeletedEvent> kafkaTemplate;

	@Test
	void contextLoads() {
	}

}
