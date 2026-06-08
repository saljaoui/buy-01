package com.buy01.media.config;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.util.backoff.FixedBackOff;

import com.buy01.events.ProductDeletedEvent;

@Configuration
public class KafkaListenerConfig {

    @Bean(name = "kafkaListenerContainerFactory")
    public ConcurrentKafkaListenerContainerFactory<String, ProductDeletedEvent> kafkaListenerContainerFactory(
            ConsumerFactory<String, ProductDeletedEvent> consumerFactory,
            KafkaTemplate<String, ProductDeletedEvent> kafkaTemplate) {
        ConcurrentKafkaListenerContainerFactory<String, ProductDeletedEvent> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.setCommonErrorHandler(new DefaultErrorHandler(
                new DeadLetterPublishingRecoverer(
                        kafkaTemplate,
                        (ConsumerRecord<?, ?> record, Exception ex) ->
                                new TopicPartition(record.topic() + ".DLT", record.partition())),
                new FixedBackOff(1000L, 2L)));
        return factory;
    }
}
