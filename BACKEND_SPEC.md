# Backend Integration Specification - MediaOps

This document provides the requirements for the NestJS backend supporting the MediaOps frontend.

## 🏗️ Core Architecture
- **Framework:** NestJS
- **Auth Strategy:** HTTP-only Cookies (Sessions or JWT)
- **Database:** PostgreSQL (recommended)
- **Billing:** Stripe Integration

---

## 🔐 1. Authentication Module
The frontend uses a custom `useAuth` hook that expects the following endpoints.

### POST `/api/auth/register`
- **Body:** `{ name, email, password }`
- **Behavior:** Create user, hash password, set session cookie.
- **Rules:** Email unique, name min 2 chars, password min 8 chars.

### POST `/api/auth/login`
- **Body:** `{ email, password }`
- **Behavior:** Validate credentials, set HTTP-only cookie.
- **Cookie Requirements:** `HttpOnly`, `Secure` (production), `SameSite: Lax`, `Path: /`.

### GET `/api/auth/me`
- **Behavior:** Returns current authenticated user session.
- **Response Shape:**
  ```json
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "url",
    "plan": "free" | "pro"
  }
  ```

### POST `/api/auth/logout`
- **Behavior:** Clear the authorization cookie.

### POST `/api/auth/forgot-password`
- **Body:** `{ email }`
- **Behavior:** Send recovery email with reset link.

---

## 💳 2. Billing & Subscription Module (Stripe)
The frontend implements a Two-Plan system: **Free** and **Pro ($19/mo)**.

### POST `/api/billing/create-checkout-session`
- **Body:** `{ plan: "pro" }`
- **Behavior:** Initialize Stripe Checkout session.
- **Response:** `{ "checkoutUrl": "https://checkout.stripe.com/..." }`
- **Success URL:** `/billing/success`
- **Cancel URL:** `/billing/cancel`

### GET `/api/billing/portal-session`
- **Behavior:** Create a Stripe Customer Portal session for subscription management.
- **Response:** `{ "portalUrl": "https://billing.stripe.com/p/..." }`

### Webhook: Stripe Events
- `checkout.session.completed`: Update user `plan` to `"pro"`.
- `customer.subscription.deleted`: Revert user `plan` to `"free"`.

---

## 🤖 3. Autopilot Module (Pro Gated)
The frontend gates this feature via the `plan` field in `GET /api/auth/me`.

### GET `/api/autopilot/jobs`
- **Behavior:** Return list of scheduled jobs for the user.

### POST `/api/autopilot/jobs`
- **Body:** `{ topic, scrapingFrequency, generationFrequency }`
- **Behavior:** Save a new scheduled job.

### PATCH `/api/autopilot/jobs/:id`
- **Body:** `{ active: boolean }`
- **Behavior:** Toggle job status.

---

## 📊 4. Core Features (Library & Explore)

### GET `/api/library`
- **Behavior:** Returns user's generated Reels and Sessions.
- **Pagination:** Supported.

### GET `/api/explore`
- **Behavior:** Returns global trending/public reels for inspiration.

---

## 🛠️ Middleware & Security
1. **CORS:** Must allow the frontend domain with `credentials: true`.
2. **Global Prefix:** All routes prefixed with `/api`.
3. **Guards:** All routes (except login/register/forgot-password) must be protected by an `AuthGuard` that validates the session cookie.
4. **Validation:** Use `class-validator` and `ValidationPipe` to enforce Zod-equivalent rules on the backend.
