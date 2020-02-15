EXAMPLE_DIR = ./packages/example
SLEEP_PKG_DIR = $(EXAMPLE_DIR)/lambda-functions/sleep
DIST_DIR = $(EXAMPLE_DIR)/lambda-functions.dist
SLEEP_DIST = $(DIST_DIR)/sleep/sleep

.PHONY: build
build: $(SLEEP_DIST)

$(SLEEP_DIST): $(SLEEP_PKG_DIR)/main.go
	env GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o $(SLEEP_DIST) $(SLEEP_PKG_DIR)
