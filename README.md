# Buy01 Microservices Backend

Buy01 is a Spring Boot microservices backend for an e-commerce platform. The system separates authentication, product management, media handling, service discovery, and API routing into small services that communicate through JWT, Eureka, and Kafka.

## What The Project Does

- Handles user registration and login with JWT-based authentication.
- Lets sellers create, update, and delete products.
- Stores media files for products and cleans them up when a product is deleted.
- Routes all client traffic through a single API gateway.
- Registers services in Eureka so they can find each other by name.
- Publishes product deletion events over Kafka so dependent services can react safely.

## Architecture

```
Client / Frontend
        |
        v
   API Gateway
        |
  -------------------------
  |           |           |
user-service  product-service  media-service
        \         |          /
                 Kafka
                  |
            shared-events
                  |
           discovery-service
              (Eureka)
```

## Tech Stack

- Java 17
- Spring Boot 3.5
- Spring Cloud Gateway
- Spring Security
- JWT
- Eureka Discovery
- Kafka and Zookeeper
- MongoDB
- Docker and Docker Compose
- Lombok
- Bean validation

## Services And Responsibilities

### `discovery-service`

- Runs Eureka.
- Registers the microservices and provides service discovery.

### `api-gateway`

- Exposes the public entry point for the backend.
- Routes requests to the right service.
- Validates JWTs on secured routes.
- Forwards user identity headers to downstream services.

### `user-service`

- Registers new users.
- Authenticates users and issues JWTs.
- Stores user accounts, roles, and profile data.

### `product-service`

- Manages product CRUD operations.
- Restricts product writes to sellers.
- Publishes `ProductDeletedEvent` messages to Kafka.

### `media-service`

- Stores and serves product media.
- Checks seller ownership before write operations.
- Removes media files when a product is deleted.
- Consumes product deletion events from Kafka.

### `shared-events`

- Contains the Kafka event contracts used by multiple services.

## Main Flows

### Authentication Flow

1. A user registers or logs in through `user-service`.
2. `user-service` issues a JWT.
3. The client sends the JWT to `api-gateway`.
4. `api-gateway` validates the token and forwards `X-User-Id` and `X-User-Role` headers.
5. Downstream services also keep their own JWT filters for direct service access.

### Product Deletion Flow

1. A seller deletes a product through `product-service`.
2. `product-service` deletes the record from MongoDB.
3. `product-service` publishes a `ProductDeletedEvent` to Kafka.
4. `media-service` consumes the event and removes the related media files.
5. If cleanup fails, the consumer sends the message to the dead-letter topic via the configured Kafka error handler.

### Gateway Routes

- `GET /api/auth/**` and `GET /api/users/**` -> `user-service`
- `GET /api/products/**` and write operations on products -> `product-service`
- `GET /api/media/**` and media write operations -> `media-service`

## How To Run Locally

Run the supporting infrastructure first:

```bash
docker compose up mongodb zookeeper kafka discovery-service
```

Then run the services from their module directories:

```bash
cd services/user-service && ./mvnw spring-boot:run
cd services/product-service && ./mvnw spring-boot:run
cd services/media-service && ./mvnw spring-boot:run
cd infrastructure/api-gateway && ./mvnw spring-boot:run
```

If you want to run the shared event module tests:

```bash
cd services/shared-events && mvn test
```

## How To Run With Docker

Start the full stack with one command:

```bash
docker compose up --build
```

## Why This Project Is Good For A CV

- It shows real microservice boundaries instead of a single monolith.
- It uses JWT, Spring Security, and gateway-based routing in a practical way.
- It includes event-driven cleanup with Kafka, which is a strong backend pattern.
- It uses Eureka service discovery, MongoDB, and Docker for a realistic deployment setup.
- It demonstrates ownership checks, file cleanup, and failure handling instead of just simple CRUD.

## Repository Layout

```text
infrastructure/
  discovery-service/
  api-gateway/

services/
  user-service/
  product-service/
  media-service/
  shared-events/

frontend/
docker-compose.yml
```
