# syntax = docker/dockerfile:experimental

FROM golang:1.15 as builder
ENV APP_DIR /go/src/github.com/aereal/qron
ENV GO111MODULE on
ENV CGO_ENABLED 0
WORKDIR ${APP_DIR}
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/src/github.com/aereal/qron/pkg/cache \
  go get -v all
COPY ./sleeper/sleeper.go ./sleeper/sleeper.go
COPY ./cmd/sleeper/main.go ./cmd/sleeper/main.go
RUN go build -o sleeper ./cmd/sleeper

FROM gcr.io/distroless/static
ENV APP_DIR /go/src/github.com/aereal/qron
COPY --from=builder ${APP_DIR}/sleeper .

ENTRYPOINT [ "./sleeper" ]
