# Frontend Validation Rules

Complete validation rules extracted from JackpotX Backend for frontend implementation.

---

## Table of Contents

1. [Authentication & Registration](#authentication--registration)
2. [User Profile Management](#user-profile-management)
3. [Admin User Management](#admin-user-management)
4. [Game Management](#game-management)
5. [Promotions](#promotions)
6. [Transactions & Payments](#transactions--payments)
7. [Common Enums & Constants](#common-enums--constants)
8. [Error Messages](#error-messages)

---

## Authentication & Registration

### Login
```typescript
{
  username: {
    type: "string",
    minLength: 3,
    required: true,
    errorMessage: "Invalid email or password"
  },
  password: {
    type: "string",
    optional: true,
    note: "Either password or auth_code required"
  },
  auth_code: {
    type: "string",
    optional: true,
    note: "Either password or auth_code required"
  },
  role_id: {
    type: "number",
    optional: true,
    description: "Optional role ID to login with specific role. Defaults to Player"
  }
}
```

### User Registration (Public)
```typescript
{
  username: {
    type: "string",
    minLength: 5,
    required: true,
    errorMessage: "Username minimum 5 characters"
  },
  email: {
    type: "string",
    format: "email",
    required: true,
    errorMessage: "Invalid email format"
  },
  password: {
    type: "string",
    minLength: 8,
    required: true,
    errorMessage: "Password minimum 8 characters"
  },
  type: {
    type: "string",
    minLength: 3,
    required: true,
    description: "Role type (e.g., Player, Admin, Support)",
    note: "Must match a role in the roles table"
  },
  captcha_id: {
    type: "string",
    minLength: 1,
    required: true,
    errorMessage: "Captcha ID is required"
  },
  captcha_text: {
    type: "string",
    minLength: 1,
    maxLength: 10,
    required: true,
    errorMessage: "Captcha text is required"
  },
  referral_code: {
    type: "string",
    optional: true,
    description: "Optional referral code for affiliate tracking"
  }
}
```

### Admin User Creation (No Captcha)
```typescript
{
  username: {
    type: "string",
    minLength: 3, // Relaxed for development (production: 5)
    required: true,
    errorMessage: "Username must be at least 3 characters"
  },
  email: {
    type: "string",
    format: "email",
    required: true,
    errorMessage: "Invalid email format"
  },
  password: {
    type: "string",
    minLength: 4, // Relaxed for development (production: 8)
    required: true,
    errorMessage: "Password must be at least 4 characters"
  },
  type: {
    type: "string",
    minLength: 3,
    required: true,
    errorMessage: "Role type must be at least 3 characters"
  },
  first_name: {
    type: "string",
    optional: true
  },
  last_name: {
    type: "string",
    optional: true
  },
  phone: {
    type: "string",
    optional: true
  },
  country: {
    type: "string",
    optional: true
  },
  timezone: {
    type: "string",
    optional: true
  },
  is_active: {
    type: "boolean",
    default: true
  },
  send_welcome_email: {
    type: "boolean",
    default: false
  }
}
```

---

## User Profile Management

### Update Profile
```typescript
{
  first_name: {
    type: "string",
    maxLength: 100,
    optional: true,
    note: "Empty string transforms to undefined"
  },
  last_name: {
    type: "string",
    maxLength: 100,
    optional: true
  },
  phone_number: {
    type: "string",
    maxLength: 20,
    optional: true
  },
  date_of_birth: {
    type: "string",
    format: "YYYY-MM-DD",
    optional: true,
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    errorMessage: "Date must be in YYYY-MM-DD format"
  },
  nationality: {
    type: "string",
    maxLength: 100,
    optional: true
  },
  country: {
    type: "string",
    maxLength: 100,
    optional: true
  },
  city: {
    type: "string",
    maxLength: 100,
    optional: true
  },
  address: {
    type: "string",
    maxLength: 500,
    optional: true
  },
  postal_code: {
    type: "string",
    maxLength: 20,
    optional: true
  },
  gender: {
    type: "enum",
    values: ["male", "female", "other"],
    optional: true
  },
  timezone: {
    type: "string",
    maxLength: 50,
    optional: true
  },
  language: {
    type: "string",
    maxLength: 10,
    optional: true
  },
  currency: {
    type: "string",
    maxLength: 3,
    optional: true
  }
}
```

### Change Password
```typescript
{
  current_password: {
    type: "string",
    minLength: 1,
    required: true,
    errorMessage: "Current password is required"
  },
  new_password: {
    type: "string",
    minLength: 8,
    required: true,
    errorMessage: "New password must be at least 8 characters"
  },
  confirm_password: {
    type: "string",
    minLength: 1,
    required: true,
    errorMessage: "Password confirmation is required",
    validation: "Must match new_password",
    customValidation: "data.new_password === data.confirm_password"
  }
}
```

### Skip 2FA
```typescript
{
  password: {
    type: "string",
    minLength: 1,
    required: true,
    errorMessage: "Password is required"
  }
}
```

---

## Admin User Management

### Update User Status
```typescript
{
  status: {
    type: "enum",
    values: ["Active", "Inactive", "Suspended", "Banned"],
    required: true
  },
  reason: {
    type: "string",
    optional: true
  }
}
```

### Update User Role
```typescript
{
  role_id: {
    type: "number",
    minimum: 1,
    required: true
  }
}
```

### Update User Balance
```typescript
{
  amount: {
    type: "number",
    required: true
  },
  type: {
    type: "enum",
    values: ["deposit", "withdrawal", "adjustment"],
    required: true
  },
  reason: {
    type: "string",
    optional: true
  },
  category: {
    type: "string",
    optional: true
  }
}
```

### User Filters (Search/List)
```typescript
{
  status: {
    type: "string",
    optional: true
  },
  role: {
    type: "string",
    optional: true
  },
  verification_level: {
    type: "number",
    minimum: 0,
    maximum: 2,
    optional: true
  },
  country: {
    type: "string",
    optional: true
  },
  search: {
    type: "string",
    optional: true
  },
  page: {
    type: "number",
    minimum: 1,
    optional: true
  },
  limit: {
    type: "number",
    minimum: 1,
    maximum: 100,
    optional: true
  }
}
```

### KYC Approval
```typescript
{
  document_id: {
    type: "number",
    minimum: 1,
    required: true
  },
  status: {
    type: "enum",
    values: ["approved", "rejected"],
    required: true
  },
  rejection_reason: {
    type: "string",
    optional: true
  }
}
```

---

## Game Management

### Create Game
```typescript
{
  name: {
    type: "string",
    minLength: 1,
    required: true
  },
  provider: {
    type: "string",
    minLength: 1,
    required: true
  },
  category: {
    type: "string",
    minLength: 1,
    required: true
  },
  subcategory: {
    type: "string",
    optional: true
  },
  image_url: {
    type: "string",
    format: "url",
    nullable: true,
    optional: true
  },
  thumbnail_url: {
    type: "string",
    format: "url",
    nullable: true,
    optional: true
  },
  game_code: {
    type: "string",
    minLength: 1,
    nullable: true,
    optional: true
  },
  rtp_percentage: {
    type: "number",
    minimum: 0,
    maximum: 100,
    optional: true
  },
  volatility: {
    type: "enum",
    values: ["low", "medium", "high"],
    optional: true
  },
  min_bet: {
    type: "number",
    minimum: 0.01,
    optional: true
  },
  max_bet: {
    type: "number",
    minimum: 0.01,
    optional: true
  },
  max_win: {
    type: "number",
    minimum: 0,
    optional: true
  },
  is_featured: {
    type: "boolean",
    optional: true
  },
  is_new: {
    type: "boolean",
    optional: true
  },
  is_hot: {
    type: "boolean",
    optional: true
  },
  is_active: {
    type: "boolean",
    optional: true
  },
  features: {
    type: "array",
    items: "string",
    optional: true
  },
  rating: {
    type: "number",
    minimum: 0,
    maximum: 5,
    optional: true
  },
  popularity: {
    type: "number",
    minimum: 0,
    maximum: 100,
    optional: true
  },
  description: {
    type: "string",
    optional: true
  }
}
```

### Game Filters
```typescript
{
  provider: {
    type: "string",
    optional: true
  },
  category: {
    type: "string",
    optional: true
  },
  is_active: {
    type: "boolean",
    optional: true
  },
  is_featured: {
    type: "boolean",
    optional: true
  },
  is_new: {
    type: "boolean",
    optional: true
  },
  is_hot: {
    type: "boolean",
    optional: true
  },
  search: {
    type: "string",
    optional: true
  },
  page: {
    type: "number",
    minimum: 1,
    optional: true
  },
  limit: {
    type: "number",
    minimum: 1,
    maximum: 100,
    optional: true
  }
}
```

### Place Bet
```typescript
{
  game_id: {
    type: "number",
    minimum: 1,
    required: true,
    errorMessage: "Game ID must be a positive number"
  },
  bet_amount: {
    type: "number",
    minimum: 0.01,
    required: true,
    errorMessage: "Bet amount must be positive"
  },
  game_data: {
    type: "any",
    optional: true,
    description: "Game-specific data"
  },
  user_id: {
    type: "number",
    minimum: 1,
    optional: true,
    description: "For admin operations"
  }
}
```

### Cancel Game Transaction
```typescript
{
  transaction_id: {
    type: "string",
    minLength: 1,
    required: true,
    errorMessage: "Transaction ID is required"
  },
  game_id: {
    type: "number",
    minimum: 1,
    optional: true
  },
  reason: {
    type: "string",
    maxLength: 500,
    optional: true
  }
}
```

### Toggle Game Favorite
```typescript
{
  game_id: {
    type: "number",
    minimum: 1,
    required: true,
    errorMessage: "Game ID must be a positive number"
  }
}
```

---

## Promotions

### Claim Promotion
```typescript
{
  promotion_id: {
    type: "number",
    minimum: 1,
    required: true,
    errorMessage: "Promotion ID must be a positive number"
  }
}
```

### Promotion Filters
```typescript
{
  type: {
    type: "enum",
    values: [
      "welcome_bonus",
      "deposit_bonus",
      "free_spins",
      "cashback",
      "reload_bonus",
      "tournament"
    ],
    optional: true
  },
  status: {
    type: "enum",
    values: ["active", "completed", "expired", "cancelled"],
    optional: true
  },
  limit: {
    type: "number",
    minimum: 1,
    maximum: 100,
    optional: true
  },
  offset: {
    type: "number",
    minimum: 0,
    optional: true
  }
}
```

### Create Promotion (Admin)
```typescript
{
  name: {
    type: "string",
    minLength: 1,
    required: true,
    errorMessage: "Promotion name is required"
  },
  description: {
    type: "string",
    optional: true
  },
  type: {
    type: "enum",
    values: [
      "welcome_bonus",
      "deposit_bonus",
      "free_spins",
      "cashback",
      "reload_bonus",
      "tournament"
    ],
    required: true
  },
  bonus_percentage: {
    type: "number",
    minimum: 0,
    optional: true
  },
  max_bonus_amount: {
    type: "number",
    minimum: 0,
    optional: true
  },
  min_deposit_amount: {
    type: "number",
    minimum: 0,
    optional: true
  },
  wagering_requirement: {
    type: "number",
    minimum: 0,
    optional: true
  },
  free_spins_count: {
    type: "number",
    minimum: 0,
    optional: true
  },
  start_date: {
    type: "string",
    optional: true
  },
  end_date: {
    type: "string",
    optional: true
  },
  is_active: {
    type: "boolean",
    optional: true
  },
  target_users: {
    type: "array",
    items: "number (positive)",
    optional: true
  },
  excluded_users: {
    type: "array",
    items: "number (positive)",
    optional: true
  },
  game_restrictions: {
    type: "array",
    items: "number (positive)",
    optional: true
  },
  user_level_restrictions: {
    type: "array",
    items: "number (positive)",
    optional: true
  }
}
```

---

## Transactions & Payments

### Payment Gateway Filters
```typescript
{
  type: {
    type: "enum",
    values: ["deposit", "withdrawal", "both"],
    optional: true
  },
  is_active: {
    type: "boolean",
    optional: true
  },
  supported_currency: {
    type: "string",
    optional: true
  },
  search: {
    type: "string",
    optional: true
  },
  page: {
    type: "number",
    minimum: 1,
    optional: true
  },
  limit: {
    type: "number",
    minimum: 1,
    maximum: 100,
    optional: true
  }
}
```

### Transaction Filters
```typescript
{
  user_id: {
    type: "number",
    minimum: 1,
    optional: true
  },
  type: {
    type: "enum",
    values: [
      "deposit",
      "withdrawal",
      "bet",
      "win",
      "bonus",
      "cashback",
      "refund",
      "adjustment"
    ],
    optional: true
  },
  status: {
    type: "enum",
    values: ["pending", "completed", "failed", "cancelled"],
    optional: true
  },
  payment_gateway: {
    type: "string",
    optional: true
  },
  start_date: {
    type: "string",
    optional: true
  },
  end_date: {
    type: "string",
    optional: true
  },
  min_amount: {
    type: "number",
    optional: true
  },
  max_amount: {
    type: "number",
    optional: true
  },
  page: {
    type: "number",
    minimum: 1,
    optional: true
  },
  limit: {
    type: "number",
    minimum: 1,
    maximum: 100,
    optional: true
  }
}
```

### Approve Transaction (Admin)
```typescript
{
  transaction_id: {
    type: "number",
    minimum: 1,
    required: true
  },
  status: {
    type: "enum",
    values: ["completed", "failed", "cancelled"],
    required: true
  },
  reason: {
    type: "string",
    optional: true
  },
  admin_notes: {
    type: "string",
    optional: true
  }
}
```

---

## Common Enums & Constants

### User Status
```typescript
type UserStatus = "Active" | "Inactive" | "Suspended" | "Banned";
```

### User Roles
```typescript
type UserRole = "Player" | "Admin" | "Support" | "Manager";
```

### Gender
```typescript
type Gender = "male" | "female" | "other";
```

### Transaction Types
```typescript
type TransactionType =
  | "deposit"
  | "withdrawal"
  | "bet"
  | "win"
  | "bonus"
  | "cashback"
  | "refund"
  | "adjustment";
```

### Transaction Status
```typescript
type TransactionStatus = "pending" | "completed" | "failed" | "cancelled";
```

### Payment Gateway Type
```typescript
type PaymentGatewayType = "deposit" | "withdrawal" | "both";
```

### Game Volatility
```typescript
type GameVolatility = "low" | "medium" | "high";
```

### Promotion Types
```typescript
type PromotionType =
  | "welcome_bonus"
  | "deposit_bonus"
  | "free_spins"
  | "cashback"
  | "reload_bonus"
  | "tournament";
```

### Promotion Status
```typescript
type PromotionStatus = "active" | "completed" | "expired" | "cancelled";
```

### Bet Outcome
```typescript
type BetOutcome = "win" | "lose";
```

### KYC Status
```typescript
type KYCStatus = "approved" | "rejected";
```

### Report Types
```typescript
type ReportType =
  | "user_activity"
  | "financial"
  | "gaming"
  | "kyc"
  | "transactions";
```

### Report Formats
```typescript
type ReportFormat = "json" | "csv" | "pdf";
```

---

## Error Messages

Standard error messages returned by the backend:

```typescript
const ErrorMessages = {
  USER_NOT_FOUND: "User not found.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  SERVER_ERROR: "Something went wrong. Please try again.",
  INTERNAL_SERVER_ERROR: "Internal server error. Please try again later.",
  INVALID_EMAIL: "Invalid email format",
  INVALID_USERNAME: "Username minimum 5 characters",
  INVALID_PASSWORD: "Password minimum 8 characters",
  EXPIRED_ACCESS_TOKEN: "Access token expired",
  INVALID_ACCESS_TOKEN: "Invalid access token",
  EXPIRED_REFRESH_TOKEN: "Refresh token expired",
  INVALID_REFRESH_TOKEN: "Invalid refresh token",
  INVALID_CAPTCHA: "Invalid captcha",
  CAPTCHA_EXPIRED: "Captcha has expired",
  CAPTCHA_REQUIRED: "Captcha is required",
  QR_GENERATION_FAILED: "Failed to generate QR code",
  INVALID_2FA_CODE: "Invalid 2FA authentication code",
  TWOFA_REQUIRED: "2FA authentication code is required"
};

const SuccessMessages = {
  USER_CREATED: "User created successfully.",
  REGISTER_SUCCESS: "Registered Successfully",
  LOGIN_SUCCESS: "Login Successfully"
};
```

---

## Implementation Examples

### React Hook Form + Zod Example

```typescript
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Login Form
const loginSchema = z.object({
  username: z.string().min(3, "Invalid email or password"),
  password: z.string().min(1, "Password is required"),
  role_id: z.number().optional()
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginComponent() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = (data: LoginForm) => {
    // Call API
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("username")} />
      {errors.username && <span>{errors.username.message}</span>}

      <input type="password" {...register("password")} />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Login</button>
    </form>
  );
}
```

### Yup Example

```typescript
import * as yup from "yup";

const registrationSchema = yup.object({
  username: yup.string()
    .min(5, "Username minimum 5 characters")
    .required("Username is required"),
  email: yup.string()
    .email("Invalid email format")
    .required("Email is required"),
  password: yup.string()
    .min(8, "Password minimum 8 characters")
    .required("Password is required"),
  type: yup.string()
    .min(3, "Role type must be at least 3 characters")
    .required("Role type is required"),
  captcha_id: yup.string()
    .min(1, "Captcha ID is required")
    .required(),
  captcha_text: yup.string()
    .min(1, "Captcha text is required")
    .max(10, "Captcha text is too long")
    .required(),
  referral_code: yup.string().optional()
});
```

---

## Notes

1. **Development vs Production**: Some validations are relaxed for development:
   - Admin user creation: username min 3 (prod: 5), password min 4 (prod: 8)

2. **Empty String Handling**: Some fields transform empty strings to `undefined`

3. **Date Formats**: All dates should be in `YYYY-MM-DD` format unless otherwise specified

4. **Currency Codes**: 3-letter ISO currency codes (e.g., USD, EUR, GBP)

5. **Language Codes**: 2-10 character language codes (e.g., en, en-US)

6. **Pagination**: Default `page` starts at 1, default `limit` varies by endpoint (usually 20-100)

7. **URLs**: All URL fields validate against standard URL format

8. **Phone Numbers**: Max 20 characters, no specific format enforced (supports international formats)

---

## API Response Format

All API endpoints return responses in this format:

```typescript
// Success Response
{
  success: true,
  data: any,
  message?: string
}

// Error Response
{
  success: false,
  error: string,
  details?: any
}
```

---

Generated from: JackpotX Backend v1.0.0
Date: 2025-11-14
Backend Repo: jx_backend
