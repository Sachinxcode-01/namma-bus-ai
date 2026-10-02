# NammaBus AI — REST API Standards and OpenAPI Documentation

## Base URL
All domain endpoints are prefixed with version 1:
```text
http://localhost:4000/api/v1
```

Root endpoints:
- `GET /health` — Liveness probe
- `GET /health/ready` — Readiness probe (database connectivity)
- `GET /docs` — Interactive Swagger UI

## Request Headers
| Header | Description | Required | Example |
| :--- | :--- | :--- | :--- |
| `X-Request-ID` | Client correlation ID (auto-generated if omitted) | No | `req_9e47bf1b2c7e47a9` |
| `Authorization` | Bearer JWT access token for authenticated routes | Conditional | `Bearer eyJhbGci...` |
| `Content-Type` | MIME type (`application/json`) | For POST/PUT/PATCH | `application/json` |

## Response Formats

### Standard Success Envelope
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-10-02T13:50:00.000Z",
    "uptime": 12.4,
    "version": "1.0.0"
  }
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed.",
    "requestId": "req_9e47bf1b2c7e47a9",
    "details": [
      "latitude must be a latitude coordinate",
      "longitude must be a longitude coordinate"
    ]
  }
}
```

## Standard Error Codes
| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 400 | Bad input payload or malformed query parameter |
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired JWT |
| `FORBIDDEN` | 403 | Authenticated user lacks permission for action |
| `NOT_FOUND` | 404 | Target resource does not exist |
| `CONFLICT` | 409 | Unique constraint violation or state conflict |
| `SERVICE_UNAVAILABLE`| 503 | Database or downstream critical service down |
| `INTERNAL_SERVER_ERROR`| 500 | Unhandled server exception (details masked) |
