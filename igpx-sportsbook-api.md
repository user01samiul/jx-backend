# IGPX Sportsbook API Integration Guide

_Last update: 2023/03/30_

---

## 01. Terms and Concepts

- **CLIENT** – The company integrating the sportsbook.
- **OPERATOR** – The company providing the sportsbook.

### CLIENT Provides

#### Staging
- Server IP address
- Callback URL
- Website URL
- Currency or currencies
- Supported languages

#### Production
- `<API_URL>` – URL used by CLIENT to interact with OPERATOR
- `<API_VERSION>`
- `<CLIENT_USERNAME>`
- `<CLIENT_PASSWORD>`
- `<SECURITY_HASH>`

### Integration Overview

This integration consists of two parts:
1. Requests that the CLIENT must make.
2. Requests from OPERATOR that must be handled by the CLIENT.

---

## 02. CLIENT Requests

### Auth

CLIENT must authenticate to get a token.

- **Method**: `POST`
- **Params**:
  - `username`: `<CLIENT_USERNAME>`
  - `password`: `<CLIENT_PASSWORD>`

#### Response

```json
{
  "token": "<string>",         // Used in subsequent requests
  "expires_in": <number>       // Token lifetime in seconds
}
```

---

## 03. Start Session

When a player opens the website, the CLIENT must call this to obtain a URL to open in an `<iframe>`.

- **Method**: `POST`
- **Params**:
  - `user_id` (String, required) – CLIENT-side player identifier
  - `currency` (required) – Player’s currency
  - `lang` (optional) – Language code

---

## 04. Transactions (Operator → Client)

Requests sent by OPERATOR to the CLIENT via `CallbackURL`.

- **Method**: `POST`
- **Headers**:
  - `X-Security-Hash`: SHA256 HMAC of the raw body using `<SECURITY_HASH>` as the secret.

### CLIENT Responsibilities

1. Verify the hash from the `X-Security-Hash` header.
2. Process the request only if the hashes match.
3. Return HTTP 200 and JSON response.

#### Response Format

```json
{
  "error": null | "<error_message>"
}
```

### Types of Requests

- `transaction`
- `transaction-rollback`

---

## 05. Transaction Request

### Request Fields

- `transaction_id` – OPERATOR-side unique ID
- `action` – `"bet"` or `"result"`
  - `"bet"` → Subtract amount from user balance
  - `"result"` → Add amount to user balance
- `user_id`, `currency` – From `/start-session`
- `amount` – Decimal
- `transaction_id` – CLIENT-side unique transaction ID

### Rules

- Each transaction must be handled only once.
- Duplicate `transaction_id` → Do not change balance; return the same response.
- Bet requests can be declined (e.g. banned user or insufficient balance).
- Result requests must **always be processed**.
- "Bet" is only sent once; "result" can be retried multiple times.

---

## 06. Transaction Rollback

### Request Fields

- `transaction_id` – New unique ID from OPERATOR
- `rollback_transaction_id` – The original transaction to rollback
- `action` – Always `"rollback"`
- `user_id`, `currency` – From `/start-session`
- `amount` – Decimal
- `transaction_id` – New CLIENT-side unique transaction ID

### Rules

- Each rollback must be handled only once.
- Duplicate `transaction_id` → Do not change balance; return the same response.
- If `rollback_transaction_id` doesn’t exist → Log the rollback but do **not** alter balance.
- Rollback requests can be sent multiple times, like "result".

---