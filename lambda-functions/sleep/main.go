package main

import (
	"context"
	"log"
	"time"

	"github.com/aereal/neocron/sleeper"
	"github.com/aws/aws-lambda-go/lambda"
)

type Event struct {
	Wait sleeper.Duration
}

func sleep(ctx context.Context, event *Event) error {
	log.Printf("wait=%s", event.Wait)
	time.Sleep(time.Duration(event.Wait))
	return nil
}

func main() {
	lambda.Start(sleep)
}
