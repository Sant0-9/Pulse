# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum* ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /node-simulator .

# Runtime stage
FROM alpine:3.20

# Add non-root user for security
RUN addgroup -g 1000 pulse && \
    adduser -u 1000 -G pulse -s /bin/sh -D pulse

# Install wget for health checks
RUN apk add --no-cache wget

WORKDIR /app

# Copy binary from builder
COPY --from=builder /node-simulator .

# Set ownership
RUN chown -R pulse:pulse /app

# Switch to non-root user
USER pulse

# Expose metrics port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:8080/health || exit 1

# Run the application
ENTRYPOINT ["./node-simulator"]
