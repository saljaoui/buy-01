# Buy01 – Microservices E-Commerce Platform

## Project Overview

Buy01 is a microservices-based e-commerce platform built using **Spring Boot** for the backend and **Angular** for the frontend.

Users can register as **CLIENT** or **SELLER**.  
Clients browse products, while sellers manage products and upload media.

---

# Technologies Used

## Backend
- Spring Boot
- Spring Cloud Gateway
- Eureka Discovery Service
- Spring Security + JWT
- MongoDB

## Frontend
- Angular
- Angular Guards
- Angular Interceptors
- Reactive Forms
- Angular Material / Bootstrap

---

# Architecture

```
Angular Frontend
        |
        v
API Gateway
        |
-----------------------------
|           |               |
User       Product         Media
Service    Service         Service
        |
      MongoDB
```

---

# Project Structure

```
buy01/
│
├── README.md
├── docker-compose.yml
│
├── infrastructure/
│   ├── discovery-service/
│   └── api-gateway/
│
├── services/
│   ├── user-service/
│   ├── product-service/
│   └── media-service/
│
└── frontend/
    └── buy01-ui/
```

---

# Discovery Service

Handles **service registration and discovery** using Eureka.

```
discovery-service/
├── Dockerfile
├── pom.xml
└── src/main/java/com/buy01/discovery
    ├── DiscoveryServiceApplication.java
    └── config/EurekaConfig.java
```

---

# API Gateway

Acts as the **single entry point** to all services.

Responsibilities:
- Routing requests
- JWT validation
- CORS configuration

```
api-gateway/
├── Dockerfile
├── pom.xml
└── src/main/java/com/buy01/gateway
    ├── GatewayApplication.java
    ├── config/
    ├── filter/JwtAuthenticationFilter.java
    └── security/JwtUtil.java
```

---

# User Service

Handles **authentication and user management**.

Responsibilities:
- Register users
- Login users
- Manage profiles
- Role management (CLIENT / SELLER)

Passwords are stored using **BCrypt hashing**.

```
user-service/
├── Dockerfile
├── pom.xml
└── src/main/java/com/buy01/users
    ├── UserServiceApplication.java
    ├── controller/
    ├── service/
    ├── repository/
    ├── domain/
    ├── dto/
    ├── security/
    └── exception/
```

---

# Product Service

Handles **product CRUD operations**.

Responsibilities:
- Create products
- Update products
- Delete products
- List products

Only **SELLER users** can manage products.

```
product-service/
├── Dockerfile
├── pom.xml
└── src/main/java/com/buy01/products
    ├── ProductServiceApplication.java
    ├── controller/
    ├── service/
    ├── repository/
    ├── domain/
    ├── dto/
    └── exception/
```

---

# Media Service

Handles **image upload and retrieval**.

Rules:
- File type must be **image/**
- Maximum file size **2MB**

Responsibilities:
- Upload images
- Validate file type
- Validate file size
- Serve images

```
media-service/
├── Dockerfile
├── pom.xml
└── src/main/java/com/buy01/media
    ├── MediaServiceApplication.java
    ├── controller/
    ├── service/
    ├── repository/
    ├── domain/
    ├── dto/
    └── validation/
```

---

# Angular Frontend

Provides the **user interface** for the platform.

Features:
- User registration and login
- Public product browsing
- Seller dashboard
- Media upload interface

```
buy01-ui/
├── angular.json
├── package.json
└── src/app
    ├── core/
    │   ├── guards/
    │   ├── interceptors/
    │   └── services/
    │
    ├── features/
    │   ├── auth/
    │   ├── products/
    │   ├── seller/
    │   └── media/
    │
    ├── shared/
    ├── app-routing.module.ts
    └── app.module.ts
```

---

# Running the Project

Start all services:

```
docker-compose up --build
```

---

# Access Services

Frontend: http://localhost:4200  
API Gateway: http://localhost:8080  
Eureka Dashboard: http://localhost:8761  

---

# Security

The application includes:

- JWT authentication
- BCrypt password hashing
- Role-based authorization
- Input validation
- File upload validation
- CORS configuration

---

# Error Handling

Standard responses:

- `400 Bad Request` → invalid input  
- `401 Unauthorized` → authentication required  
- `403 Forbidden` → insufficient permissions  
- `404 Not Found` → resource not found  

---

# Conclusion

Buy01 demonstrates a **secure and scalable microservices architecture** using Spring Boot and Angular.

The platform supports:

- User authentication
- Role-based access control
- Product management
- Media uploads
- Responsive frontend UI
