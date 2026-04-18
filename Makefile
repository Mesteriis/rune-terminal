SHELL := /usr/bin/env bash

GO := ./scripts/go.sh
NPM := npm

APP_BIN := rterm-core
DIST_DIR := dist
LOCAL_BACKEND_HOST ?= 127.0.0.1
LOCAL_BACKEND_PORT ?= 8090
LOCAL_BACKEND_LISTEN ?= $(LOCAL_BACKEND_HOST):$(LOCAL_BACKEND_PORT)
LOCAL_BACKEND_URL ?= http://$(LOCAL_BACKEND_HOST):$(LOCAL_BACKEND_PORT)
LOCAL_FRONTEND_HOST ?= 127.0.0.1
LOCAL_FRONTEND_PORT ?= 5173
LOCAL_AUTH_TOKEN ?= runa-local-dev-token

MACOS_ARCH ?= arm64
LINUX_ARCH ?= amd64

.PHONY: help run run-backend run-frontend build validate build-core build-frontend build-macos build-linux clean

help:
	@echo "Available targets:"
	@echo "  make run            - Launch desktop app in dev mode (Tauri)"
	@echo "  make run-backend    - Launch standalone Go core on $(LOCAL_BACKEND_URL)"
	@echo "  make run-frontend   - Launch Vite frontend against $(LOCAL_BACKEND_URL)"
	@echo "  make build          - Build frontend + host Go core binary"
	@echo "  make validate       - Run full project validation pipeline"
	@echo "  make build-macos    - Build Go core binary for macOS ($(MACOS_ARCH))"
	@echo "  make build-linux    - Build Go core binary for Linux ($(LINUX_ARCH))"
	@echo "  make clean          - Remove dist artifacts"

run:
	$(NPM) run tauri:dev

run-backend:
	@echo "Starting standalone Go core at $(LOCAL_BACKEND_URL)"
	RTERM_AUTH_TOKEN=$(LOCAL_AUTH_TOKEN) $(GO) run ./cmd/rterm-core serve --listen $(LOCAL_BACKEND_LISTEN) --workspace-root . --state-dir ./state

run-frontend:
	@echo "Starting Vite frontend on http://$(LOCAL_FRONTEND_HOST):$(LOCAL_FRONTEND_PORT) -> $(LOCAL_BACKEND_URL)"
	VITE_RTERM_API_BASE=$(LOCAL_BACKEND_URL) VITE_RTERM_AUTH_TOKEN=$(LOCAL_AUTH_TOKEN) $(NPM) --prefix frontend run dev -- --host $(LOCAL_FRONTEND_HOST) --strictPort --port $(LOCAL_FRONTEND_PORT)

build: build-frontend build-core

validate:
	$(NPM) run validate

build-core:
	$(NPM) run build:core

build-frontend:
	$(NPM) run build:frontend

build-macos:
	@mkdir -p $(DIST_DIR)
	GOOS=darwin GOARCH=$(MACOS_ARCH) $(GO) build -o $(DIST_DIR)/$(APP_BIN)-darwin-$(MACOS_ARCH) ./cmd/rterm-core
	@echo "Built $(DIST_DIR)/$(APP_BIN)-darwin-$(MACOS_ARCH)"

build-linux:
	@mkdir -p $(DIST_DIR)
	GOOS=linux GOARCH=$(LINUX_ARCH) $(GO) build -o $(DIST_DIR)/$(APP_BIN)-linux-$(LINUX_ARCH) ./cmd/rterm-core
	@echo "Built $(DIST_DIR)/$(APP_BIN)-linux-$(LINUX_ARCH)"

clean:
	rm -rf $(DIST_DIR)
