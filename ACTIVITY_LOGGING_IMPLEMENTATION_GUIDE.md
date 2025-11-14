# Activity Logging Implementation Guide

## Overview
This guide explains how to implement comprehensive activity logging across the entire admin platform.

## Files Created

1. **Middleware**: `src/middlewares/activity-logger.ts`
   - Core logging functions
   - Automatic logging middleware
   - Post-response logging helpers

2. **Service**: `src/services/activity/activity-logger.service.ts`
   - Centralized logging methods for all modules
   - Type-safe logging functions
   - Categorized by module (Users, Games, RTP, etc.)

3. **Example**: `src/api/admin/admin.controller.with-logging.example.ts`
   - Complete examples of how to integrate logging
   - Patterns for different operation types

## Quick Start

### Step 1: Add Import to Controller

```typescript
import ActivityLoggerService from '../../services/activity/activity-logger.service';
```

### Step 2: Add Logging After Successful Operations

```typescript
// Example: After creating a game
const game = await createGameService(gameData);
await ActivityLoggerService.logGameCreated(req, game.id, game.name, game.provider);
res.status(201).json({ success: true, data: game });
```

## Logging Patterns

### Pattern 1: Create Operations
```typescript
export const createResource = async (req: Request, res: Response) => {
  try {
    const data = req.validated?.body;
    const resource = await createResourceService(data);

    // LOG AFTER SUCCESS
    await ActivityLoggerService.logResourceCreated(req, resource.id, resource.name);

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### Pattern 2: Update Operations
```typescript
export const updateResource = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.validated?.body;

    // Get old data for comparison
    const oldResource = await getResourceByIdService(id);
    const newResource = await updateResourceService(id, data);

    // LOG EACH CHANGED FIELD
    Object.keys(data).forEach(async (field) => {
      if (oldResource[field] !== data[field]) {
        await ActivityLoggerService.logResourceUpdated(
          req, id, field, oldResource[field], data[field]
        );
      }
    });

    res.status(200).json({ success: true, data: newResource });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### Pattern 3: Delete Operations
```typescript
export const deleteResource = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    // Get resource before deletion
    const resource = await getResourceByIdService(id);
    await deleteResourceService(id);

    // LOG AFTER SUCCESS
    await ActivityLoggerService.logResourceDeleted(req, id, resource.name);

    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### Pattern 4: Status Change Operations
```typescript
export const changeStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.validated?.body;

    const oldResource = await getResourceByIdService(id);
    const newResource = await updateStatusService(id, status);

    // LOG STATUS CHANGE
    await ActivityLoggerService.logResourceStatusChanged(
      req, id, oldResource.status, newResource.status
    );

    res.status(200).json({ success: true, data: newResource });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

## Available Logging Methods

### User Management
- `logUserCreated(req, userId, username, role)`
- `logUserUpdated(req, userId, field, oldValue, newValue)`
- `logUserDeleted(req, userId, username)`
- `logUserStatusChanged(req, userId, oldStatus, newStatus)`
- `logUserBalanceAdjusted(req, userId, amount, type, reason)`

### Game Management
- `logGameCreated(req, gameId, gameName, provider)`
- `logGameUpdated(req, gameId, field, oldValue, newValue)`
- `logGameStatusChanged(req, gameId, oldStatus, newStatus)`
- `logGameDeleted(req, gameId, gameName)`

### RTP & Settings
- `logRTPSettingsUpdated(req, setting, oldValue, newValue)`
- `logRTPAutoAdjustmentTriggered(req, adjustments)`
- `logSystemSettingsUpdated(req, setting, oldValue, newValue)`

### Promotions
- `logPromotionCreated(req, promotionId, name, type)`
- `logPromotionUpdated(req, promotionId, field, oldValue, newValue)`
- `logPromotionStatusChanged(req, promotionId, oldStatus, newStatus)`
- `logPromotionDeleted(req, promotionId, name)`

### KYC
- `logKYCApproved(req, userId, documentType)`
- `logKYCRejected(req, userId, documentType, reason)`

### Transactions
- `logTransactionApproved(req, transactionId, amount, type)`
- `logTransactionRejected(req, transactionId, amount, type, reason)`

### Affiliates
- `logAffiliateCreated(req, affiliateId, username)`
- `logAffiliatePayoutProcessed(req, payoutId, affiliateId, amount)`

### Banners
- `logBannerCreated(req, bannerId, title)`
- `logBannerUpdated(req, bannerId, field, oldValue, newValue)`
- `logBannerDeleted(req, bannerId, title)`

### Authentication
- `logAdminLogin(req, username, role)` - Already implemented in auth.service.ts!
- `logAdminLogout(req, username)`

### Generic
- `logGenericAction(req, action, details, module)` - For custom actions

## Files to Update

### High Priority (Core Admin Actions)
1. ✅ `src/services/auth/auth.service.ts` - Admin login logging (DONE)
2. `src/api/admin/admin.controller.ts` - Game & User management
3. `src/api/admin/admin.promotion.controller.ts` - Promotions
4. `src/api/admin/admin.kyc.controller.ts` - KYC approvals
5. `src/api/admin/admin.game-management.controller.ts` - Game status changes

### Medium Priority
6. `src/rtpAuto.ts` - RTP auto-adjustment
7. `src/api/admin/system-reset.controller.ts` - System resets
8. `src/services/admin/payment-gateway.service.ts` - Payment gateways

### Lower Priority
9. `src/api/admin/admin.category.controller.ts` - Categories
10. `src/services/affiliate/enhanced-affiliate.service.ts` - Affiliates

## Testing

After implementation, test by:

1. **Login as Admin**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

2. **Check admin_activities Table**
   ```sql
   SELECT * FROM admin_activities ORDER BY created_at DESC LIMIT 10;
   ```

3. **Perform Admin Actions** in the admin panel and verify they appear in logs

## Database Schema

```sql
CREATE TABLE admin_activities (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Best Practices

1. **Always log AFTER successful operations**, not before
2. **Include meaningful details** in the details JSON
3. **Don't break the main flow** - logging errors should be caught and logged, not thrown
4. **Be consistent** with action names (use snake_case: user_created, game_updated)
5. **Include old and new values** for update operations
6. **Add module name** to help categorize activities

## Example Implementation Checklist

- [ ] Import ActivityLoggerService
- [ ] Add logging to Create operations
- [ ] Add logging to Update operations
- [ ] Add logging to Delete operations
- [ ] Add logging to Status change operations
- [ ] Add logging to Bulk operations
- [ ] Test each endpoint
- [ ] Verify logs appear in database
- [ ] Verify logs appear in admin panel

## Next Steps

1. Update remaining controllers with logging
2. Test all endpoints
3. Monitor admin_activities table growth
4. Consider adding cleanup/archival for old logs (optional)
5. Add activity log export feature (optional)

## Support

For questions or issues:
- Check example file: `admin.controller.with-logging.example.ts`
- Review this guide
- Check console logs for `[ActivityLogger]` messages
