# syntax=docker/dockerfile:1
# Build context is services/ so the reactor can build shared-events first (-am).

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY . .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q -pl media-service -am -DskipTests package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/uploads && chown app:app /app/uploads
COPY --from=build /build/media-service/target/media-service-*.jar app.jar
USER app

# media.storage.path is ./uploads, i.e. /app/uploads
VOLUME /app/uploads
EXPOSE 8083

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
