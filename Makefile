DIST_DIR = lambda-functions.dist

.PHONY: build
build: $(DIST_DIR)/sleep/sleep

$(DIST_DIR)/sleep/sleep: lambda-functions/sleep/main.go
	env GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o $(DIST_DIR)/sleep/sleep ./lambda-functions/sleep
