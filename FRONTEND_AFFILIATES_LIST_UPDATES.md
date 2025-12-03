# Frontend Updates: Affiliates List Page

## Changes Required

### 1. Remove team fields from Affiliate interface (Line 35)

**REMOVE these lines:**
```typescript
team_name: string | null;
manager_username: string | null;
```

**Updated interface:**
```typescript
interface Affiliate {
  id: number;
  user_id: number;
  referral_code: string;
  display_name: string;
  is_active: boolean;
  total_referrals: number;
  total_commission_earned: number;
  commission_rate: number;
  username: string;
  email: string;
  affiliate_balance: number;
  affiliate_balance_locked: number;
  affiliate_total_earned: number;
  affiliate_total_redeemed: number;
  commission_count: number;
  pending_commissions: number;
  // team_name: string | null;  // ❌ REMOVE
  // manager_username: string | null;  // ❌ REMOVE
  created_at: string;
}
```

### 2. Remove Team column header (Line 354)

**REMOVE this line:**
```typescript
<TableHead>Team</TableHead>
```

**Updated TableHeader:**
```typescript
<TableHeader>
  <TableRow>
    <TableHead>Affiliate</TableHead>
    <TableHead>Referral Code</TableHead>
    <TableHead>Referrals</TableHead>
    <TableHead>Total Earned</TableHead>
    <TableHead>Balance</TableHead>
    <TableHead>Locked</TableHead>
    {/* <TableHead>Team</TableHead> */}  {/* ❌ REMOVE */}
    <TableHead>Status</TableHead>
    <TableHead>Actions</TableHead>
  </TableRow>
</TableHeader>
```

### 3. Remove Team cell from table body (Lines 395-401)

**REMOVE this TableCell:**
```typescript
<TableCell>
  {affiliate.team_name ? (
    <Badge variant="outline">{affiliate.team_name}</Badge>
  ) : (
    <span className="text-muted-foreground">No team</span>
  )}
</TableCell>
```

**Updated TableRow mapping:**
```typescript
{affiliates.map((affiliate) => (
  <TableRow key={affiliate.id}>
    <TableCell>
      <div>
        <div className="font-medium">{affiliate.display_name}</div>
        <div className="text-sm text-muted-foreground">
          {affiliate.email}
        </div>
      </div>
    </TableCell>
    <TableCell>
      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
        {affiliate.referral_code}
      </code>
    </TableCell>
    <TableCell>{affiliate.total_referrals}</TableCell>
    <TableCell className="font-semibold">
      {formatCurrency(affiliate.total_commission_earned)}
    </TableCell>
    <TableCell className="text-green-600">
      {formatCurrency(affiliate.affiliate_balance)}
    </TableCell>
    <TableCell className="text-yellow-600">
      <div className="flex items-center">
        <Lock className="h-3 w-3 mr-1" />
        {formatCurrency(affiliate.affiliate_balance_locked)}
      </div>
    </TableCell>
    {/* ❌ REMOVE Team cell */}
    {/* <TableCell>
      {affiliate.team_name ? (
        <Badge variant="outline">{affiliate.team_name}</Badge>
      ) : (
        <span className="text-muted-foreground">No team</span>
      )}
    </TableCell> */}
    <TableCell>{getStatusBadge(affiliate.is_active)}</TableCell>
    <TableCell>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          router.push(`/dashboard/affiliates/${affiliate.id}`)
        }
      >
        <Eye className="h-4 w-4" />
      </Button>
    </TableCell>
  </TableRow>
))}
```

## Complete Updated Code

### Updated Affiliate Interface
```typescript
interface Affiliate {
  id: number;
  user_id: number;
  referral_code: string;
  display_name: string;
  is_active: boolean;
  total_referrals: number;
  total_commission_earned: number;
  commission_rate: number;
  username: string;
  email: string;
  affiliate_balance: number;
  affiliate_balance_locked: number;
  affiliate_total_earned: number;
  affiliate_total_redeemed: number;
  commission_count: number;
  pending_commissions: number;
  created_at: string;
}
```

### Updated Table Headers
```typescript
<TableHeader>
  <TableRow>
    <TableHead>Affiliate</TableHead>
    <TableHead>Referral Code</TableHead>
    <TableHead>Referrals</TableHead>
    <TableHead>Total Earned</TableHead>
    <TableHead>Balance</TableHead>
    <TableHead>Locked</TableHead>
    <TableHead>Status</TableHead>
    <TableHead>Actions</TableHead>
  </TableRow>
</TableHeader>
```

### Updated Table Body
```typescript
<TableBody>
  {affiliates.map((affiliate) => (
    <TableRow key={affiliate.id}>
      <TableCell>
        <div>
          <div className="font-medium">{affiliate.display_name}</div>
          <div className="text-sm text-muted-foreground">
            {affiliate.email}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
          {affiliate.referral_code}
        </code>
      </TableCell>
      <TableCell>{affiliate.total_referrals}</TableCell>
      <TableCell className="font-semibold">
        {formatCurrency(affiliate.total_commission_earned)}
      </TableCell>
      <TableCell className="text-green-600">
        {formatCurrency(affiliate.affiliate_balance)}
      </TableCell>
      <TableCell className="text-yellow-600">
        <div className="flex items-center">
          <Lock className="h-3 w-3 mr-1" />
          {formatCurrency(affiliate.affiliate_balance_locked)}
        </div>
      </TableCell>
      <TableCell>{getStatusBadge(affiliate.is_active)}</TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push(`/dashboard/affiliates/${affiliate.id}`)
          }
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

## Summary

**Changes needed**: 3 removals
1. ❌ Remove `team_name` and `manager_username` from interface
2. ❌ Remove `<TableHead>Team</TableHead>`
3. ❌ Remove team name TableCell from body

**No other changes required** - The rest of the page works correctly without teams!
