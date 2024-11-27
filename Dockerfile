FROM rust:1.79 AS frontend-build
WORKDIR /app/frontend

# Install Node.js and package managers
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get update \
    && apt-get install -y nodejs \
    && npm install -g bun yarn

# Detect and use available package manager
COPY ./frontend/package.json ./
RUN if command -v bun >/dev/null 2>&1; then \
        bun install; \
    elif command -v npm >/dev/null 2>&1; then \
        npm install; \
    elif command -v yarn >/dev/null 2>&1; then \
        yarn install; \
    else \
        echo "No package manager found" && exit 1; \
    fi

# Build frontend
RUN if command -v bun >/dev/null 2>&1; then \
        bun run build; \
    elif command -v npm >/dev/null 2>&1; then \
        npm run build; \
    elif command -v yarn >/dev/null 2>&1; then \
        yarn build; \
    else \
        echo "No package manager found" && exit 1; \
    fi

FROM rust:1.79 AS backend-build
WORKDIR /rist
COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml
RUN cargo build --release
RUN rm src/*.rs
COPY ./src ./src
RUN rm ./target/release/deps/rist*
RUN cargo build --release

FROM rust:1.79
WORKDIR /app
COPY --from=backend-build /rist/target/release/rist .
COPY --from=frontend-build /app/frontend/dist ./frontend
CMD ["./rist"]
