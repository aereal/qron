package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
)

type duration time.Duration

func (d duration) String() string {
	return time.Duration(d).String()
}

func (d *duration) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	dur, err := time.ParseDuration(s)
	if err != nil {
		return err
	}
	*d = duration(dur)
	return nil
}

func (d duration) MarshalJSON() ([]byte, error) {
	return json.Marshal(time.Duration(d).String())
}

type Event struct {
	Wait duration
}

func sleep(ctx context.Context, event *Event) error {
	log.Printf("wait=%s", event.Wait)
	time.Sleep(time.Duration(event.Wait))
	return nil
}

func runLocally() error {
	var ev Event
	if err := json.NewDecoder(os.Stdin).Decode(&ev); err != nil {
		return fmt.Errorf("Failed to parse input: %w", err)
	}
	return sleep(context.Background(), &ev)
}

func main() {
	lambda.Start(sleep)
}
