# NammaBus AI — ETA Engine & Arrival Prediction API Contract

**Version:** 1.0.0  
**Owner:** Sachin (Platform & Backend Lead)  
**Consumer:** Prem (Frontend / Mobile Lead), Admin Dashboard, Student App, Driver App  

---

## 1. REST Endpoints

### 1.1 Get Route-Aware Trip ETA

`GET /api/v1/trips/:tripId/eta`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stopId` | `UUIDv4` | Optional | When provided, returns focused prediction details for this specific stop alongside full route stop progression. If omitted, focuses on the immediate `nextStop`. |

**Headers:**
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

**Success Response (200 OK):**
```json
{
  "tripId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "busId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "routeId": "e16a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "lastUpdated": "2026-10-08T15:20:00.000Z",
  "currentDelayMinutes": 2,
  "stopId": "c3d4e5f6-a7b8-9012-cdef-1234567890ab",
  "etaMinutes": 14,
  "estimatedArrivalTime": "2026-10-08T15:34:00.000Z",
  "distanceRemainingMeters": 5850,
  "status": "AVAILABLE",
  "confidence": "HIGH",
  "calculatedAt": "2026-10-08T15:20:02.120Z",
  "nextStop": {
    "stopId": "b2c3d4e5-f6a7-8901-bcde-f1234567890a",
    "stopName": "Gadag Ring Road Junction",
    "stopCode": "STP-GRR",
    "sequenceOrder": 3
  },
  "stops": [
    {
      "stopId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "stopName": "Hulkoti Village Center",
      "stopCode": "STP-HLK",
      "sequenceOrder": 1,
      "latitude": 15.318,
      "longitude": 75.512,
      "estimatedMinutes": 0,
      "estimatedArrivalTime": "2026-10-08T15:20:00.000Z",
      "distanceRemainingMeters": 0,
      "status": "PASSED"
    },
    {
      "stopId": "b1c2d3e4-f5a6-7890-bcde-f12345678901",
      "stopName": "Rural Cross By-pass",
      "stopCode": "STP-RCB",
      "sequenceOrder": 2,
      "latitude": 15.352,
      "longitude": 75.545,
      "estimatedMinutes": 0,
      "estimatedArrivalTime": "2026-10-08T15:20:00.000Z",
      "distanceRemainingMeters": 0,
      "status": "PASSED"
    },
    {
      "stopId": "b2c3d4e5-f6a7-8901-bcde-f1234567890a",
      "stopName": "Gadag Ring Road Junction",
      "stopCode": "STP-GRR",
      "sequenceOrder": 3,
      "latitude": 15.39,
      "longitude": 75.58,
      "estimatedMinutes": 6,
      "estimatedArrivalTime": "2026-10-08T15:26:00.000Z",
      "distanceRemainingMeters": 2150,
      "status": "NEXT"
    },
    {
      "stopId": "c3d4e5f6-a7b8-9012-cdef-1234567890ab",
      "stopName": "Gadag Bus Terminal Central",
      "stopCode": "STP-GTC",
      "sequenceOrder": 4,
      "latitude": 15.424,
      "longitude": 75.62,
      "estimatedMinutes": 14,
      "estimatedArrivalTime": "2026-10-08T15:34:00.000Z",
      "distanceRemainingMeters": 5850,
      "status": "UPCOMING"
    },
    {
      "stopId": "d4e5f6a7-b8c9-0123-defa-234567890abc",
      "stopName": "Engineering College Main Gate",
      "stopCode": "STP-ENG",
      "sequenceOrder": 5,
      "latitude": 15.45,
      "longitude": 75.65,
      "estimatedMinutes": 22,
      "estimatedArrivalTime": "2026-10-08T15:42:00.000Z",
      "distanceRemainingMeters": 9100,
      "status": "UPCOMING"
    }
  ]
}
```

---

## 2. Real-Time Server-Sent Events (SSE) Stream

### 2.1 Subscribe to Trip ETA Stream

`GET /api/v1/trips/:tripId/eta/stream`

**Headers:**
```http
Accept: text/event-stream
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

**Stream Events:**

#### Event: `trip_eta_updated`
```json
event: trip_eta_updated
id: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d-1760000000
data: {
  "tripId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "busId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "routeId": "e16a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "etaMinutes": 14,
  "estimatedArrivalTime": "2026-10-08T15:34:00.000Z",
  "distanceRemainingMeters": 5850,
  "status": "AVAILABLE",
  "confidence": "HIGH",
  "calculatedAt": "2026-10-08T15:20:00.000Z",
  "nextStop": {
    "stopId": "b2c3d4e5-f6a7-8901-bcde-f1234567890a",
    "stopName": "Gadag Ring Road Junction",
    "stopCode": "STP-GRR",
    "sequenceOrder": 3
  }
}
```

#### Event: `ping` (Heartbeat every 15s)
```json
event: ping
data: {
  "timestamp": "2026-10-08T15:20:15.000Z"
}
```

---

## 3. Status Reference & UI Guidance

| Status | Meaning | Recommended UI Treatment |
|--------|---------|---------------------------|
| `AVAILABLE` | Valid live ETA on active route | Display `~14 min` or `Around 3:34 PM` |
| `APPROACHING` | Bus entered stop geofence | Highlight badge: **"Approaching your stop"** |
| `STOP_PASSED` | Bus has already passed this stop | Display: **"Bus has passed this stop"** |
| `STALE` | GPS older than 120s | Display: `~14 min` with warning icon: *"Updating delayed"* |
| `GPS_UNAVAILABLE` | No GPS or offline > 300s | Display: **"Live location unavailable"** |
| `NO_ACTIVE_TRIP` | Trip scheduled or completed | Display: **"Trip completed"** or **"Trip not started"** |

---

## 4. Confidence Tiers

| Tier | Meaning | Signal Conditions |
|------|---------|-------------------|
| `HIGH` | Highly reliable prediction | GPS age $\le 45$s, accuracy $\le 25$m, bus moving on route |
| `MEDIUM` | Acceptable approximation | GPS age $45$–$120$s, accuracy $25$–$60$m, or stationary fallback speed |
| `LOW` | Low reliability | Stale GPS ($> 120$s), off-route ($> 300$m), or low accuracy ($> 60$m) |
