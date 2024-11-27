#!/bin/bash

set -e 
set -o pipefail 

# Utility function for error handling
error_exit() {
    echo "ERROR: $1" >&2
    exit 1
}

build_frontend() {
    local package_manager=""

    # Prefer bun, then npm, then yarn
    if command -v bun &> /dev/null; then
        package_manager="bun"
    elif command -v npm &> /dev/null; then
        package_manager="npm"
    elif command -v yarn &> /dev/null; then
        package_manager="yarn"
    else
        error_exit "No compatible package manager found. Please install bun, npm, or yarn."
    fi

    echo "INFO: Using $package_manager for frontend build"
    cd ./frontend || error_exit "Cannot change to frontend directory"

    # Install dependencies
    $package_manager install || error_exit "Frontend dependency installation failed"

    # Build frontend
    $package_manager run build || error_exit "Frontend build failed"

    cd .. # Return to project root
}

build_backend() {
    if ! command -v cargo &> /dev/null; then
        error_exit "Rust (cargo) is not installed. Please install Rust from https://rustup.rs"
    fi

    echo "INFO: Building backend with cargo"
    cargo build --release || error_exit "Backend build failed"
}

main() {
    # Ensure script is run from project root
    if [[ ! -d "./frontend" || ! -d "./.git" ]]; then
        error_exit "Script must be run from project root directory"
    fi

    build_frontend

    build_backend

    # Copy frontend to backend
    echo "INFO: Copying frontend build to backend"
    mkdir -p ./target/release/frontend
    cp -r ./frontend/dist ./target/release/frontend || error_exit "Failed to copy frontend build"

    echo "BUILD COMPLETE: Frontend and backend successfully built and integrated"
}

main
