# syntax=docker/dockerfile:1
# Build context is services/ so the reactor can build shared-events first (-am).

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY . .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q -pl product-service -am -DskipTests package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /build/product-service/target/product-service-*.jar app.jar
USER app

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
