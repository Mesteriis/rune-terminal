SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

GO := ./scripts/go.sh
NPM := npm
FRONTEND_DIR := frontend
BACKEND_ENTRYPOINT := ./cmd/rterm-core
BACKEND_WORKSPACE_ROOT := .
BACKEND_STATE_DIR := ./state
DEV_SCRIPT := ./scripts/dev.sh
BACKEND_WATCH_SCRIPT := ./scripts/run-backend-watch.sh

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

SPLIT_DEV_ENV := LOCAL_BACKEND_LISTEN=$(LOCAL_BACKEND_LISTEN) LOCAL_BACKEND_URL=$(LOCAL_BACKEND_URL) LOCAL_FRONTEND_HOST=$(LOCAL_FRONTEND_HOST) LOCAL_FRONTEND_PORT=$(LOCAL_FRONTEND_PORT) LOCAL_AUTH_TOKEN=$(LOCAL_AUTH_TOKEN)
BACKEND_WATCH_ENV := LOCAL_BACKEND_LISTEN=$(LOCAL_BACKEND_LISTEN) LOCAL_BACKEND_URL=$(LOCAL_BACKEND_URL) LOCAL_AUTH_TOKEN=$(LOCAL_AUTH_TOKEN)
BACKEND_RUN_ENV := RTERM_AUTH_TOKEN=$(LOCAL_AUTH_TOKEN)
FRONTEND_RUN_ENV := VITE_RTERM_API_BASE=$(LOCAL_BACKEND_URL) VITE_RTERM_AUTH_TOKEN=$(LOCAL_AUTH_TOKEN)
FRONTEND_DEV_ARGS := --host $(LOCAL_FRONTEND_HOST) --strictPort --port $(LOCAL_FRONTEND_PORT)

.PHONY: \
	help \
	run \
	dev \
	run-backend \
	run-backend-watch \
	run-frontend \
	build \
	build-core \
	build-frontend \
	build-macos \
	build-linux \
	validate \
	clean

help:
	@echo "Available targets:"
	@echo "  make run            - Launch desktop app in dev mode (Tauri)"
	@echo "  make dev            - Launch backend watcher + Vite frontend for split local dev"
	@echo "  make run-backend    - Launch standalone Go core on $(LOCAL_BACKEND_URL)"
	@echo "  make run-backend-watch - Launch standalone Go core with Go live reload via air"
	@echo "  make run-frontend   - Launch Vite frontend against $(LOCAL_BACKEND_URL)"
	@echo "  make build          - Build frontend + host Go core binary"
	@echo "  make validate       - Run full project validation pipeline"
	@echo "  make build-macos    - Build Go core binary for macOS ($(MACOS_ARCH))"
	@echo "  make build-linux    - Build Go core binary for Linux ($(LINUX_ARCH))"
	@echo "  make clean          - Remove dist artifacts"

# Supported desktop entrypoint.
run:
	$(NPM) run tauri:dev

# Supported split browser/test loop.
dev:
	$(SPLIT_DEV_ENV) $(DEV_SCRIPT)

run-backend:
	@echo "Starting standalone Go core at $(LOCAL_BACKEND_URL)"
	$(BACKEND_RUN_ENV) $(GO) run $(BACKEND_ENTRYPOINT) serve --listen $(LOCAL_BACKEND_LISTEN) --workspace-root $(BACKEND_WORKSPACE_ROOT) --state-dir $(BACKEND_STATE_DIR)

run-backend-watch:
	$(BACKEND_WATCH_ENV) $(BACKEND_WATCH_SCRIPT)

run-frontend:
	@echo "Starting Vite frontend on http://$(LOCAL_FRONTEND_HOST):$(LOCAL_FRONTEND_PORT) -> $(LOCAL_BACKEND_URL)"
	$(FRONTEND_RUN_ENV) $(NPM) --prefix $(FRONTEND_DIR) run dev -- $(FRONTEND_DEV_ARGS)

build: build-frontend build-core

validate:
	$(NPM) run validate

build-core:
	$(NPM) run build:core

build-frontend:
	$(NPM) run build:frontend

build-macos:
	@mkdir -p $(DIST_DIR)
	GOOS=darwin GOARCH=$(MACOS_ARCH) $(GO) build -o $(DIST_DIR)/$(APP_BIN)-darwin-$(MACOS_ARCH) $(BACKEND_ENTRYPOINT)
	@echo "Built $(DIST_DIR)/$(APP_BIN)-darwin-$(MACOS_ARCH)"

build-linux:
	@mkdir -p $(DIST_DIR)
	GOOS=linux GOARCH=$(LINUX_ARCH) $(GO) build -o $(DIST_DIR)/$(APP_BIN)-linux-$(LINUX_ARCH) $(BACKEND_ENTRYPOINT)
	@echo "Built $(DIST_DIR)/$(APP_BIN)-linux-$(LINUX_ARCH)"

clean:
	rm -rf $(DIST_DIR)
