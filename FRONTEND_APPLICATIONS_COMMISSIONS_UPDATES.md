# Frontend Updates: Applications & Commissions Pages

## Applications Page - 5 Changes Required ❌

### 1. Remove teamId and managerId from approveForm state (Lines ~105-108)

**REMOVE these fields:**
```typescript
const [approveForm, setApproveForm] = useState({
  commissionRate: 5.0,
  teamId: "",      // ❌ REMOVE
  managerId: "",   // ❌ REMOVE
  adminNotes: "",
});
```

**Updated state:**
```typescript
const [approveForm, setApproveForm] = useState({
  commissionRate: 5.0,
  adminNotes: "",
});
```

### 2. Remove teamId and managerId from handleApprove API call (Lines ~175-180)

**REMOVE these fields:**
```typescript
body: JSON.stringify({
  commissionRate: approveForm.commissionRate,
  teamId: approveForm.teamId ? parseInt(approveForm.teamId) : undefined,      // ❌ REMOVE
  managerId: approveForm.managerId ? parseInt(approveForm.managerId) : undefined,  // ❌ REMOVE
  adminNotes: approveForm.adminNotes || undefined,
}),
```

**Updated API call:**
```typescript
body: JSON.stringify({
  commissionRate: approveForm.commissionRate,
  adminNotes: approveForm.adminNotes || undefined,
}),
```

### 3. Remove teamId and managerId from form reset (Line ~200)

**REMOVE these fields:**
```typescript
setApproveForm({
  commissionRate: 5.0,
  teamId: "",      // ❌ REMOVE
  managerId: "",   // ❌ REMOVE
  adminNotes: "",
});
```

**Updated reset:**
```typescript
setApproveForm({
  commissionRate: 5.0,
  adminNotes: "",
});
```

### 4. Remove Team ID input field from Approve Dialog (Lines ~725-735)

**REMOVE entire div:**
```typescript
{/* ❌ REMOVE THIS ENTIRE SECTION */}
<div className="grid gap-2">
  <Label htmlFor="teamId">Team ID (optional)</Label>
  <Input
    id="teamId"
    type="number"
    value={approveForm.teamId}
    onChange={(e) =>
      setApproveForm({ ...approveForm, teamId: e.target.value })
    }
    placeholder="Leave empty to assign later"
  />
</div>
```

### 5. Remove Manager ID input field from Approve Dialog (Lines ~736-746)

**REMOVE entire div:**
```typescript
{/* ❌ REMOVE THIS ENTIRE SECTION */}
<div className="grid gap-2">
  <Label htmlFor="managerId">Manager ID (optional)</Label>
  <Input
    id="managerId"
    type="number"
    value={approveForm.managerId}
    onChange={(e) =>
      setApproveForm({ ...approveForm, managerId: e.target.value })
    }
    placeholder="Leave empty to assign later"
  />
</div>
```

---

## Updated Approve Dialog Section

**Complete updated dialog content:**
```typescript
<Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Approve Application</DialogTitle>
      <DialogDescription>
        Set initial commission rate for {selectedApplication?.display_name}
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="commissionRate">Commission Rate (%) *</Label>
        <Input
          id="commissionRate"
          type="number"
          step="0.1"
          value={approveForm.commissionRate}
          onChange={(e) =>
            setApproveForm({
              ...approveForm,
              commissionRate: parseFloat(e.target.value),
            })
          }
          placeholder="5.0"
        />
      </div>
      {/* ❌ REMOVED: Team ID input */}
      {/* ❌ REMOVED: Manager ID input */}
      <div className="grid gap-2">
        <Label htmlFor="adminNotes">Admin Notes</Label>
        <Textarea
          id="adminNotes"
          value={approveForm.adminNotes}
          onChange={(e) =>
            setApproveForm({ ...approveForm, adminNotes: e.target.value })
          }
          placeholder="Optional notes for this approval"
        />
      </div>
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setShowApproveDialog(false)}
      >
        Cancel
      </Button>
      <Button onClick={handleApprove}>Approve Application</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Commissions Page - ✅ No Changes Required

The Commissions page is **completely clean** - no team or manager references found!

All filters, tables, and functionality are commission-specific only:
- ✅ Status filters (pending, approved, paid, cancelled)
- ✅ Type filters (deposit, bet, loss, ngr)
- ✅ Date range filters
- ✅ Affiliate and referred user columns
- ✅ Commission amount and status tracking

**No action needed for Commissions page.**

---

## Summary

### Applications Page:
**Changes needed**: 5 removals
1. ❌ Remove `teamId` and `managerId` from state initialization
2. ❌ Remove `teamId` and `managerId` from API call body
3. ❌ Remove `teamId` and `managerId` from form reset
4. ❌ Remove Team ID input field from dialog
5. ❌ Remove Manager ID input field from dialog

### Commissions Page:
✅ **Perfect - no changes needed!**

---

## Backend Compatibility Note

The backend `/api/admin/affiliate-applications/:id/approve` endpoint has been updated to:
- **No longer require** `teamId` or `managerId` parameters
- Only requires: `commissionRate` (number) and optional `adminNotes` (string)

The updated frontend will send:
```json
{
  "commissionRate": 5.0,
  "adminNotes": "Optional notes"
}
```

This matches the updated backend that no longer has team/manager support!
