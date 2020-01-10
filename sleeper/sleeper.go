package sleeper

import (
	"context"
	"encoding/json"
	"log"
	"time"
)

type Duration time.Duration

func (d *Duration) Set(val string) error {
	dur, err := time.ParseDuration(val)
	if err != nil {
		return err
	}
	*d = Duration(dur)
	return nil
}

func (d Duration) String() string {
	return time.Duration(d).String()
}

func (d *Duration) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	return d.Set(s)
}

func (d Duration) MarshalJSON() ([]byte, error) {
	return json.Marshal(time.Duration(d).String())
}

func Run(ctx context.Context, wait Duration) error {
	log.Printf("wait=%s", wait)
	time.Sleep(time.Duration(wait))
	return nil
}
