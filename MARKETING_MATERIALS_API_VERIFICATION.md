# Marketing Materials Page API Verification Report

**Date**: 2025-11-30
**Frontend Path**: /dashboard/affiliates/marketing-materials
**Status**: ❌ **CRITICAL - ALL ENDPOINTS MISSING**

---

## 🚨 Critical Issues Found

### Issue Summary: Complete Marketing Materials System Missing from API

**Database**: ✅ Table exists with data (3 materials)
**Service Layer**: ✅ Partial function exists (`getMarketingMaterials()`)
**Controller Layer**: ❌ **DOES NOT EXIST**
**Routes Layer**: ❌ **DOES NOT EXIST**

The marketing materials functionality has **database + minimal service** but has **NO API endpoints** exposed to the frontend.

---

## Missing Endpoints

### 1. GET /api/affiliate/marketing-materials ❌

**Frontend Expects**:
```
GET /api/affiliate/marketing-materials?page=1&limit=10&type=banner
```

**Backend Has**:
- ✅ Service function exists: `AffiliateService.getMarketingMaterials()`
- ❌ **NO CONTROLLER**
- ❌ **NO ROUTE**

**Service Function** (line 731):
```typescript
static async getMarketingMaterials(): Promise<any[]> {
  const result = await pool.query(
    'SELECT * FROM affiliate_marketing_materials WHERE is_active = true ORDER BY created_at DESC'
  );
  return result.rows;
}
```

**Limitations**:
- Only returns active materials
- No pagination support
- No type filtering
- No category filtering

**Problem**: Frontend cannot fetch any marketing materials

**Impact**:
- ❌ Page shows empty state
- ❌ Cannot view any materials
- ❌ All tabs (banners, text links, etc.) are empty

---

### 2. GET /api/affiliate/marketing-materials/stats ❌

**Frontend Expects**:
```
GET /api/affiliate/marketing-materials/stats
```

**Backend Has**: ❌ **DOES NOT EXIST**

**Problem**: No endpoint to get material statistics

**Impact**:
- ❌ Statistics cards show 0 for everything
- ❌ Cannot see total materials, active count, type breakdown

---

### 3. POST /api/affiliate/admin/marketing-materials ❌

**Frontend Expects**:
```json
POST /api/affiliate/admin/marketing-materials
{
  "name": "Summer Promotion Banner",
  "description": "Banner for summer promo",
  "type": "banner",
  "content": "<img src='...' />",
  "target_url": "https://jackpotx.net/promo",
  "image_url": "https://...",
  "is_active": true
}
```

**Backend Has**: ❌ **DOES NOT EXIST**

**Problem**: Admins cannot create new materials via API

**Impact**:
- ❌ "Add Material" button does nothing
- ❌ Create dialog submits but fails

---

### 4. PUT /api/affiliate/admin/marketing-materials/:id ❌

**Frontend Expects**:
```json
PUT /api/affiliate/admin/marketing-materials/123
{
  "name": "Updated Banner",
  "description": "...",
  "is_active": false
}
```

**Backend Has**: ❌ **DOES NOT EXIST**

**Problem**: Admins cannot update existing materials

**Impact**:
- ❌ Edit button does nothing
- ❌ Cannot activate/deactivate materials

---

### 5. DELETE /api/affiliate/admin/marketing-materials/:id ❌

**Frontend Expects**:
```
DELETE /api/affiliate/admin/marketing-materials/123
```

**Backend Has**: ❌ **DOES NOT EXIST**

**Problem**: Admins cannot delete materials

**Impact**:
- ❌ Delete button does nothing

---

## Database Schema ✅

The `affiliate_marketing_materials` table exists and is properly structured:

```sql
CREATE TABLE affiliate_marketing_materials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,         -- banner|text_link|landing_page|email_template|social_media
  content TEXT,
  image_url VARCHAR(500),
  target_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER DEFAULT 1
);
```

**Type Constraint**:
```sql
CHECK (type IN ('banner', 'text_link', 'landing_page', 'email_template', 'social_media'))
```

**Current Data**: 3 materials in database

---

## Frontend Interface Expectations

### MarketingMaterial Object:
```typescript
interface MarketingMaterial {
  id: number;
  name: string;
  description: string;
  type: "banner" | "text_link" | "email_template" | "landing_page";
  content: string;
  image_url: string | null;
  target_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**All fields match database schema** ✅

### MaterialStats Object:
```typescript
interface MaterialStats {
  total_materials: string;
  active_materials: string;
  inactive_materials: string;
  banner_count: string;
  text_link_count: string;
  landing_page_count: string;
  email_template_count: string;
  social_media_count: string;  // ⚠️ Frontend expects but not used in UI
}
```

---

## What Needs to Be Created 🛠️

### 1. Controller Functions (Create new file or add to existing)

Recommended location: `src/api/admin/affiliate-admin.controller.ts`

#### getMarketingMaterials
```typescript
export const getMarketingMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Type filter
    if (type && type !== 'all') {
      conditions.push(`type = $` + paramIndex++);
      params.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM affiliate_marketing_materials ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get materials
    const result = await pool.query(
      `SELECT * FROM affiliate_marketing_materials
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $` + paramIndex + ` OFFSET $` + (paramIndex + 1) + ``,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      success: true,
      data: {
        materials: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
```

#### getMarketingMaterialStats
```typescript
export const getMarketingMaterialStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*)::TEXT as total_materials,
        COUNT(*) FILTER (WHERE is_active = true)::TEXT as active_materials,
        COUNT(*) FILTER (WHERE is_active = false)::TEXT as inactive_materials,
        COUNT(*) FILTER (WHERE type = 'banner')::TEXT as banner_count,
        COUNT(*) FILTER (WHERE type = 'text_link')::TEXT as text_link_count,
        COUNT(*) FILTER (WHERE type = 'landing_page')::TEXT as landing_page_count,
        COUNT(*) FILTER (WHERE type = 'email_template')::TEXT as email_template_count,
        COUNT(*) FILTER (WHERE type = 'social_media')::TEXT as social_media_count
       FROM affiliate_marketing_materials`
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
```

#### createMarketingMaterial
```typescript
export const createMarketingMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, type, content, target_url, image_url, is_active } = req.body;
    const adminId = (req as any).user.userId;

    // Validate required fields
    if (!name || !type || !content || !target_url) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, type, content, target_url'
      });
    }

    // Validate type
    const validTypes = ['banner', 'text_link', 'landing_page', 'email_template', 'social_media'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be one of: ' + validTypes.join(', ')
      });
    }

    const result = await pool.query(
      `INSERT INTO affiliate_marketing_materials (
        name, description, type, content, target_url, image_url, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING *`,
      [name, description, type, content, target_url, image_url, is_active !== false, adminId]
    );

    res.json({
      success: true,
      message: 'Marketing material created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
```

#### updateMarketingMaterial
```typescript
export const updateMarketingMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, type, content, target_url, image_url, is_active } = req.body;
    const adminId = (req as any).user.userId;

    // Check if material exists
    const checkResult = await pool.query(
      'SELECT id FROM affiliate_marketing_materials WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marketing material not found'
      });
    }

    const result = await pool.query(
      `UPDATE affiliate_marketing_materials
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           type = COALESCE($3, type),
           content = COALESCE($4, content),
           target_url = COALESCE($5, target_url),
           image_url = COALESCE($6, image_url),
           is_active = COALESCE($7, is_active),
           updated_at = NOW(),
           updated_by = $8
       WHERE id = $9
       RETURNING *`,
      [name, description, type, content, target_url, image_url, is_active, adminId, id]
    );

    res.json({
      success: true,
      message: 'Marketing material updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
```

#### deleteMarketingMaterial
```typescript
export const deleteMarketingMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if material exists
    const checkResult = await pool.query(
      'SELECT id FROM affiliate_marketing_materials WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marketing material not found'
      });
    }

    await pool.query(
      'DELETE FROM affiliate_marketing_materials WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Marketing material deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
```

### 2. Routes Registration

**Option 1**: Add to existing `affiliate.routes.ts` (for /api/affiliate path)
```typescript
// In affiliate.routes.ts imports
import {
  getMarketingMaterials,
  getMarketingMaterialStats,
  createMarketingMaterial,
  updateMarketingMaterial,
  deleteMarketingMaterial
} from '../api/admin/affiliate-admin.controller';

// Routes
router.get('/marketing-materials', authenticate, getMarketingMaterials);
router.get('/marketing-materials/stats', authenticate, getMarketingMaterialStats);

// Admin routes (with path /api/affiliate/admin/*)
router.post('/admin/marketing-materials', authenticate, authorize(['Admin']), createMarketingMaterial);
router.put('/admin/marketing-materials/:id', authenticate, authorize(['Admin']), updateMarketingMaterial);
router.delete('/admin/marketing-materials/:id', authenticate, authorize(['Admin']), deleteMarketingMaterial);
```

**Full Paths**:
- `GET /api/affiliate/marketing-materials`
- `GET /api/affiliate/marketing-materials/stats`
- `POST /api/affiliate/admin/marketing-materials`
- `PUT /api/affiliate/admin/marketing-materials/:id`
- `DELETE /api/affiliate/admin/marketing-materials/:id`

---

## Implementation Priority

### Must Have (Critical) 🔴

1. **GET /api/affiliate/marketing-materials** - View materials
2. **GET /api/affiliate/marketing-materials/stats** - View statistics

### Should Have 🟡

3. **POST /api/affiliate/admin/marketing-materials** - Create materials
4. **PUT /api/affiliate/admin/marketing-materials/:id** - Update materials
5. **DELETE /api/affiliate/admin/marketing-materials/:id** - Delete materials

---

## Summary

### ❌ What's Missing (Backend)
1. **5 critical endpoints** - None exist
2. **5 controller functions** - Need to be created
3. **Route registrations** - Need to be added
4. **Pagination/filtering** - Existing service function lacks these

### ✅ What Exists (Backend)
1. Database table with 3 materials
2. Basic service function (no pagination/filtering)
3. Database schema is correct

### 🛠️ Required Actions

**Backend** (HIGH PRIORITY):
1. Create `getMarketingMaterials` controller function (with pagination + filtering)
2. Create `getMarketingMaterialStats` controller function
3. Create `createMarketingMaterial` controller function
4. Create `updateMarketingMaterial` controller function
5. Create `deleteMarketingMaterial` controller function
6. Register routes in affiliate.routes.ts

**Frontend** (NONE):
- ✅ No changes needed - all paths are correct

**Estimated Time**: 2-3 hours for complete implementation

---

## Current Status

**Page Status**: ❌ **COMPLETELY NON-FUNCTIONAL** - All endpoints missing
**Priority**: 🔴 **HIGH** - Important affiliate feature for marketing
**Blocker**: Backend endpoints must be created before frontend can work
**Data**: ✅ Database has 3 materials ready to display once endpoints exist

---

## Frontend Code Analysis

### Frontend Expects Statistics Calculation:
```typescript
// This calculation will fail if stats are not properly structured:
{formatNumber(
  stats.banner_count +
    stats.text_link_count +
    stats.email_template_count +
    stats.landing_page_count,
)}
```

**Issue**: String concatenation instead of addition!

**Fix**: Backend should return numbers as strings (consistent), frontend needs `parseNumeric` helper or backend should return as numbers. Recommend backend returns strings (for consistency with other endpoints), frontend adds parseNumeric helper.

---

## Additional Notes

1. **Category Filter**: Frontend has category filter UI but API doesn't support it. Either:
   - Add `category` column to database table
   - Or remove category filter from frontend

2. **Stats Calculation**: Frontend calculates "Total Clicks" by adding all type counts, which doesn't make sense. Should probably track actual click counts per material.

3. **Download Feature**: Frontend tries to download images via fetch + blob. Works if image URLs are accessible.

---

## Recommendation

**Immediate Action Required**:
1. Create all 5 missing endpoints
2. Test with existing 3 materials in database
3. Consider adding category column to database (optional)
4. Add parseNumeric helper to frontend for stats calculations

This feature is currently completely non-functional and needs backend implementation before it can be used.
