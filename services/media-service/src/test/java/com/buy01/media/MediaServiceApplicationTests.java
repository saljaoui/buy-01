package com.buy01.media;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration",
        "spring.kafka.listener.auto-startup=false"
})
class MediaServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
