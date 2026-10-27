# syntax=docker/dockerfile:1
# Build context is services/ (same as the other services, so all three share one .dockerignore).

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY . .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q -pl user-service -am -DskipTests package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /build/user-service/target/user-service-*.jar app.jar
USER app

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
