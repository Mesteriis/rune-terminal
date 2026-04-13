SHELL := /usr/bin/env bash

GO := ./scripts/go.sh
NPM := npm

APP_BIN := rterm-core
DIST_DIR := dist

MACOS_ARCH ?= arm64
LINUX_ARCH ?= amd64

.PHONY: help run build validate build-core build-frontend build-macos build-linux clean

help:
	@echo "Available targets:"
	@echo "  make run            - Launch desktop app in dev mode (Tauri)"
	@echo "  make build          - Build frontend + host Go core binary"
	@echo "  make validate       - Run full project validation pipeline"
	@echo "  make build-macos    - Build Go core binary for macOS ($(MACOS_ARCH))"
	@echo "  make build-linux    - Build Go core binary for Linux ($(LINUX_ARCH))"
	@echo "  make clean          - Remove dist artifacts"

run:
	$(NPM) run tauri:dev

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
