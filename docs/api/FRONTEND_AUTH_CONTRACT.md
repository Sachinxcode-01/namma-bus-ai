# NammaBus AI — Frontend Authentication & RBAC API Contract

This document provides the canonical contract between the backend API (`apps/api`) and frontend clients (`apps/student-app`, `apps/driver-app`, `apps/admin-dashboard`, `apps/student-mobile`, `apps/driver-mobile`).

---

## 1. Base URL & Common Conventions

- **API Base URL**: `http://localhost:3000/api/v1` (Development) / `https://api.nammabus.example.com/api/v1` (Production)
- **Content-Type**: `application/json`
- **Authentication**: Bearer JWT token in the `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  ```

---

## 2. Standard Response Envelope

All API responses conform to a predictable envelope.

### Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-07T12:00:00.000Z",
    "requestId": "a1b2c3d4-e5f6-7890-1234-56789abcdef0"
  }
}
```

### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password",
    "requestId": "a1b2c3d4-e5f6-7890-1234-56789abcdef0",
    "details": []
  }
}
```

Common Error Codes:
- `VALIDATION_ERROR` (400) - Invalid payload, details contain array of field errors
- `UNAUTHORIZED` (401) - Expired or missing token, invalid credentials
- `FORBIDDEN` (403) - Insufficient RBAC permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Email or unique field already exists
- `TOO_MANY_REQUESTS` (429) - Rate limit exceeded (check `Retry-After` header)
- `INTERNAL_SERVER_ERROR` (500) - Unhandled server error

---

## 3. Endpoints

### 3.1 Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Auth Required**: No
- **Rate Limit**: 5 attempts / 60 seconds
- **Request Body**:
```json
{
  "email": "student@college.edu",
  "password": "Password123!"
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-v4",
      "email": "student@college.edu",
      "name": "Jane Doe",
      "role": "STUDENT",
      "phone": "+919876543210",
      "isActive": true
    },
    "tokens": {
      "accessToken": "eyJh...",
      "refreshToken": "40_byte_hex_string",
      "tokenType": "Bearer",
      "expiresIn": 900
    }
  }
}
```

---

### 3.2 Student Self-Registration
- **Endpoint**: `POST /api/v1/auth/register/student`
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "student@college.edu",
  "password": "Password123!",
  "name": "Jane Doe",
  "phone": "+919876543210",
  "usn": "1MS21CS001",
  "department": "Computer Science",
  "year": 3
}
```
- **Response** (201 Created): Same structure as Login response.

---

### 3.3 Driver Registration
- **Endpoint**: `POST /api/v1/auth/register/driver`
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "driver@college.edu",
  "password": "Password123!",
  "name": "John Driver",
  "phone": "+919876543211",
  "licenseNumber": "KA0120200001234"
}
```
- **Response** (201 Created): Same structure as Login response.

---

### 3.4 Token Refresh & Rotation
- **Endpoint**: `POST /api/v1/auth/refresh`
- **Auth Required**: No
- **Request Body**:
```json
{
  "refreshToken": "40_byte_hex_string"
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJh...",
      "refreshToken": "new_40_byte_hex_string",
      "tokenType": "Bearer",
      "expiresIn": 900
    }
  }
}
```
> **Security Notice**: Refresh tokens are single-use. Reusing a revoked token triggers automatic family revocation across all devices.

---

### 3.5 Logout
- **Endpoint**: `POST /api/v1/auth/logout`
- **Auth Required**: No
- **Request Body**:
```json
{
  "refreshToken": "40_byte_hex_string"
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

### 3.6 Logout All Sessions
- **Endpoint**: `POST /api/v1/auth/logout-all`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { "message": "All sessions revoked successfully" }
}
```

---

### 3.7 Change Password
- **Endpoint**: `POST /api/v1/auth/change-password`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Request Body**:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword456!"
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "data": { "message": "Password changed successfully. All sessions revoked." }
}
```
*(Automatically invalidates all other active refresh tokens)*

---

### 3.8 Current User Profile
- **Endpoint**: `GET /api/v1/auth/me`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "email": "user@college.edu",
    "name": "Jane Doe",
    "role": "STUDENT",
    "phone": "+919876543210",
    "isActive": true
  }
}
```

---

### 3.9 Admin User Provisioning
- **Endpoint**: `POST /api/v1/users`
- **Auth Required**: Yes (`@Roles(UserRole.ADMIN)`)
- **Request Body**:
```json
{
  "email": "newadmin@college.edu",
  "password": "AdminPassword123!",
  "name": "Admin Name",
  "role": "ADMIN",
  "phone": "+919876543299"
}
```
- **Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "email": "newadmin@college.edu",
    "name": "Admin Name",
    "role": "ADMIN",
    "isActive": true
  }
}
```

---

## 4. Role & Permission Matrix

| Role | Access |
|---|---|
| `STUDENT` | View bus locations, ETAs, own profile, change password, search routes. |
| `DRIVER` | Transmit GPS telemetry, update trip status, view assigned shifts, own profile, change password. |
| `ADMIN` | All endpoints, user management, route provisioning, stop creation, trip dispatching, audit viewing. |

---

## 5. Client Token Storage Guidelines

### Flutter Mobile (`apps/student-mobile`, `apps/driver-mobile`)
- Store `refreshToken` in `flutter_secure_storage` (Keychain on iOS, EncryptedSharedPreferences on Android).
- Keep `accessToken` in memory (state management / provider) with fallback to secure storage.
- Intercept 401 responses via Dio/HTTP interceptor to perform refresh token rotation automatically.

### Web Applications (`apps/student-app`, `apps/admin-dashboard`)
- Store `accessToken` in memory or session storage.
- Store `refreshToken` in secure storage or secure httpOnly cookie (when configured).
