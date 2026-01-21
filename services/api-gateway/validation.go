package main

import (
	"log/slog"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
)

// Validation constants
const (
	MaxBodySize    = 1 << 20 // 1MB
	MaxStringLen   = 1000
	MaxIDLen       = 64
	MaxQueryLen    = 500
	MaxMessageLen  = 10000
)

var (
	// Safe patterns for various inputs
	safeIDPattern      = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	safeNamePattern    = regexp.MustCompile(`^[a-zA-Z0-9_\-\s\.]+$`)
	dangerousPatterns  = []string{
		"<script", "</script>",
		"javascript:", "onerror=",
		"onclick=", "onload=",
		"eval(", "document.",
		"window.", "alert(",
	}
)

// ValidationError represents a validation failure
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidateID validates an ID parameter
func ValidateID(id string) *ValidationError {
	if id == "" {
		return &ValidationError{Field: "id", Message: "ID is required"}
	}
	if len(id) > MaxIDLen {
		return &ValidationError{Field: "id", Message: "ID exceeds maximum length"}
	}
	if !safeIDPattern.MatchString(id) {
		return &ValidationError{Field: "id", Message: "ID contains invalid characters"}
	}
	return nil
}

// ValidateName validates a name field
func ValidateName(name string) *ValidationError {
	if name == "" {
		return &ValidationError{Field: "name", Message: "Name is required"}
	}
	if len(name) > MaxStringLen {
		return &ValidationError{Field: "name", Message: "Name exceeds maximum length"}
	}
	if !safeNamePattern.MatchString(name) {
		return &ValidationError{Field: "name", Message: "Name contains invalid characters"}
	}
	return nil
}

// ValidateMessage validates user message input (for AI chat)
func ValidateMessage(msg string) *ValidationError {
	if msg == "" {
		return &ValidationError{Field: "message", Message: "Message is required"}
	}
	if len(msg) > MaxMessageLen {
		return &ValidationError{Field: "message", Message: "Message exceeds maximum length"}
	}
	if !utf8.ValidString(msg) {
		return &ValidationError{Field: "message", Message: "Message contains invalid UTF-8"}
	}
	return nil
}

// SanitizeString removes potentially dangerous content
func SanitizeString(s string) string {
	result := s

	// Remove null bytes
	result = strings.ReplaceAll(result, "\x00", "")

	// Check for dangerous patterns (XSS prevention)
	lower := strings.ToLower(result)
	for _, pattern := range dangerousPatterns {
		if strings.Contains(lower, pattern) {
			slog.Warn("Dangerous pattern detected in input", "pattern", pattern)
			// Remove the dangerous content
			result = strings.ReplaceAll(strings.ToLower(result), pattern, "")
		}
	}

	// Trim excessive whitespace
	result = strings.TrimSpace(result)

	return result
}

// ValidateQueryParam validates a query parameter
func ValidateQueryParam(param string) *ValidationError {
	if len(param) > MaxQueryLen {
		return &ValidationError{Field: "query", Message: "Query parameter exceeds maximum length"}
	}
	return nil
}

// InputValidationMiddleware provides basic input validation for all requests
func InputValidationMiddleware(c *fiber.Ctx) error {
	// Check content length for POST/PUT requests
	if c.Method() == "POST" || c.Method() == "PUT" {
		if len(c.Body()) > MaxBodySize {
			slog.Warn("Request body too large",
				"size", len(c.Body()),
				"max", MaxBodySize,
				"path", c.Path(),
			)
			return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{
				"error": "Request body too large",
				"max":   MaxBodySize,
			})
		}
	}

	// Validate path parameters
	params := c.AllParams()
	for key, value := range params {
		if key == "id" || key == "name" {
			if err := ValidateID(value); err != nil {
				slog.Warn("Invalid path parameter",
					"param", key,
					"value", value,
					"error", err.Message,
				)
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": err.Message,
					"field": err.Field,
				})
			}
		}
	}

	return c.Next()
}

// ValidateJobRequest validates job creation request
type JobRequest struct {
	Name            string `json:"name"`
	Partition       string `json:"partition"`
	Priority        int    `json:"priority"`
	CPUs            int    `json:"cpus"`
	GPUs            int    `json:"gpus"`
	MemoryGB        int    `json:"memory_gb"`
	WallTimeMinutes int    `json:"wall_time_minutes"`
}

func (j *JobRequest) Validate() []ValidationError {
	var errors []ValidationError

	if err := ValidateName(j.Name); err != nil {
		errors = append(errors, *err)
	}

	if j.Partition != "" {
		validPartitions := map[string]bool{
			"gpu": true, "cpu": true, "highmem": true, "debug": true,
		}
		if !validPartitions[j.Partition] {
			errors = append(errors, ValidationError{
				Field:   "partition",
				Message: "Invalid partition. Must be one of: gpu, cpu, highmem, debug",
			})
		}
	}

	if j.Priority < 0 || j.Priority > 1000 {
		errors = append(errors, ValidationError{
			Field:   "priority",
			Message: "Priority must be between 0 and 1000",
		})
	}

	if j.CPUs < 0 || j.CPUs > 1024 {
		errors = append(errors, ValidationError{
			Field:   "cpus",
			Message: "CPUs must be between 0 and 1024",
		})
	}

	if j.GPUs < 0 || j.GPUs > 64 {
		errors = append(errors, ValidationError{
			Field:   "gpus",
			Message: "GPUs must be between 0 and 64",
		})
	}

	if j.MemoryGB < 0 || j.MemoryGB > 4096 {
		errors = append(errors, ValidationError{
			Field:   "memory_gb",
			Message: "Memory must be between 0 and 4096 GB",
		})
	}

	if j.WallTimeMinutes < 0 || j.WallTimeMinutes > 43200 {
		errors = append(errors, ValidationError{
			Field:   "wall_time_minutes",
			Message: "Wall time must be between 0 and 43200 minutes (30 days)",
		})
	}

	return errors
}

// ValidateChatRequest validates AI chat request
type ChatRequest struct {
	Message        string `json:"message"`
	ConversationID string `json:"conversation_id"`
	IncludeContext bool   `json:"include_context"`
}

func (c *ChatRequest) Validate() []ValidationError {
	var errors []ValidationError

	if err := ValidateMessage(c.Message); err != nil {
		errors = append(errors, *err)
	}

	if c.ConversationID != "" {
		if err := ValidateID(c.ConversationID); err != nil {
			err.Field = "conversation_id"
			errors = append(errors, *err)
		}
	}

	return errors
}
