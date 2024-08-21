FROM rust:1.79 as build

RUN USER=root cargo new --bin rist
WORKDIR /rist

COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml

RUN cargo build --release
RUN rm src/*.rs

COPY ./src ./src

RUN rm ./target/release/deps/rist*
RUN cargo build --release

FROM rust:1.79

COPY --from=build /rist/target/release/rist .
COPY ./frontend ./frontend

CMD ["./rist"]
