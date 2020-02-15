package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aereal/qron/sleeper"
)

func main() {
	if err := run(os.Args); err != nil {
		log.Printf("! %s", err)
		os.Exit(1)
	}
}

func run(argv []string) error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	wait, err := parseArgv(argv)
	if err == flag.ErrHelp {
		return nil
	}
	if err != nil {
		return err
	}

	if time.Duration(wait).Seconds() == 0 {
		return fmt.Errorf("wait cannot be 0")
	}

	if err := sleeper.Run(ctx, wait); err != nil {
		return err
	}

	return nil
}

func parseArgv(argv []string) (wait sleeper.Duration, err error) {
	flgs := flag.NewFlagSet(argv[0], flag.ContinueOnError)
	flgs.Var(&wait, "wait", "wait duration")

	err = flgs.Parse(argv[1:])
	if err != nil {
		return wait, err
	}

	return wait, nil
}
