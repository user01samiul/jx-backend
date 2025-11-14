# 🎯 Hidden Profit Control System

## Overview

The Hidden Profit Control System is a sophisticated internal mechanism that automatically adjusts player payouts to ensure the company maintains its target profit margins. This system operates **completely behind the scenes** without any provider involvement or external communication.

## 🏗️ System Architecture

### Core Components

1. **Profit Control Service** (`src/services/profit/profit-control.service.ts`)
   - Handles hidden RTP adjustments
   - Tracks profit metrics
   - Calculates profit performance
   - Manages auto-adjustment logic

2. **Provider Callback Integration** (`src/services/provider/provider-callback.service.ts`)
   - Intercepts win transactions after provider processing
   - Applies hidden profit adjustments
   - Tracks original vs adjusted amounts

3. **Database Tables**
   - `profit_tracking` - Individual transaction tracking
   - `daily_profit_summary` - Daily profit calculations
   - `rtp_adjustment_log` - RTP change audit trail

4. **Admin API Endpoints**
   - `/api/admin/profit/analytics` - View profit analytics
   - `/api/admin/profit/auto-adjustment` - Trigger auto-adjustment
   - `/api/admin/profit/performance` - Get current performance

## 🔄 How It Works

### 1. Win Transaction Processing

```
Provider sends: WIN $100
↓
Our system receives: WIN $100
↓
Hidden calculation: $100 × (80% ÷ 96%) = $83.33
↓
Player gets: $83.33 (hidden $16.67 reduction)
↓
Provider sees: Original $100 win (no change)
↓
Our profit: $16.67 (16.67% margin)
```

### 2. Bet Transaction Processing

```
Provider sends: BET $50
↓
Our system receives: BET $50
↓
No adjustment (bets remain unchanged)
↓
Player balance: -$50
↓
Tracked for profit calculations
```

### 3. Auto-Adjustment Logic

The system automatically adjusts the effective RTP based on profit performance:

- **Profit below target**: Reduce payouts (increase effective RTP)
- **Profit above target**: Increase payouts (decrease effective RTP)
- **Within target range**: No adjustment needed

## 📊 Key Features

### Smart Profit Control
- **Hidden Operation**: Provider never knows about adjustments
- **Automatic Tracking**: All transactions tracked for analytics
- **Real-time Adjustment**: RTP adjusted based on live performance
- **Audit Trail**: Complete history of all adjustments

### Profit Calculation
```javascript
// Example calculation
const providerRtp = 96; // Provider's RTP
const effectiveRtp = 80; // Our target RTP
const adjustmentFactor = effectiveRtp / providerRtp; // 0.833

const originalWin = 100;
const adjustedWin = originalWin * adjustmentFactor; // 83.33
const profitRetained = originalWin - adjustedWin; // 16.67
```

### Auto-Adjustment Triggers
- **Loss Protection**: If profit < target - 5%, reduce payouts
- **Excess Profit**: If profit > target + 5%, increase payouts
- **Gradual Changes**: Small adjustments to avoid detection

## 🎛️ Admin Controls

### Manual Mode
```bash
# Set target profit manually
POST /api/admin/rtp/target-profit
{
  "target_profit_percent": 20,
  "effective_rtp": 80
}
```

### Auto Mode
```bash
# Enable automatic adjustment
POST /api/admin/rtp/auto-adjustment
{
  "target_profit_percent": 20,
  "effective_rtp": 80
}
```

### Monitoring
```bash
# Get current performance
GET /api/admin/profit/performance

# Get detailed analytics
GET /api/admin/profit/analytics?start_date=2024-01-01&end_date=2024-01-31

# Trigger manual adjustment
POST /api/admin/profit/auto-adjustment
```

## 📈 Analytics & Reporting

### Profit Metrics
- **Total Bets**: Sum of all player bets
- **Total Wins**: Sum of provider win amounts
- **Total Adjusted Wins**: Sum of actual player payouts
- **Profit Retained**: Difference between original and adjusted wins
- **Effective RTP**: Current system RTP percentage
- **Profit Gap**: Difference between actual and target profit

### Game Performance
- **Per-Game Analytics**: Profit retention by individual games
- **Provider Analysis**: Performance across different providers
- **Category Breakdown**: Profit by game categories

## 🔒 Security & Stealth

### Hidden Implementation
- **No Provider Communication**: Zero changes to provider API
- **Internal Processing**: All calculations happen after provider response
- **Encrypted Data**: Sensitive calculations stored securely
- **Audit Trail**: Track all adjustments for internal review

### Detection Prevention
- **Gradual Adjustments**: Small changes to avoid detection
- **Natural Variation**: Adjustments appear as normal RTP variance
- **Provider Transparency**: Provider sees original amounts
- **Player Experience**: Smooth gameplay without noticeable changes

## 🚀 Usage Examples

### Scenario 1: Normal Operation
```
Target Profit: 20%
Provider RTP: 96%
Effective RTP: 80%

Player wins $100 from provider
→ Hidden calculation: $100 × (80/96) = $83.33
→ Player receives: $83.33
→ Company retains: $16.67 (16.67% profit)
```

### Scenario 2: Auto-Adjustment
```
Current Profit: 15% (below 20% target)
System Action: Reduce effective RTP from 80% to 78%
Result: Higher profit retention on future wins
```

### Scenario 3: Excess Profit
```
Current Profit: 25% (above 20% target)
System Action: Increase effective RTP from 80% to 81%
Result: Lower profit retention on future wins
```

## 📋 API Endpoints

### Profit Analytics
```bash
GET /api/admin/profit/analytics
Query Parameters:
- start_date: Start date (YYYY-MM-DD)
- end_date: End date (YYYY-MM-DD)
- game_id: Filter by game ID
- provider: Filter by provider

Response:
{
  "success": true,
  "data": {
    "summary": {
      "totalOriginalWins": 10000.00,
      "totalAdjustedWins": 8000.00,
      "totalProfitRetained": 2000.00,
      "avgEffectiveRtp": 80.5,
      "totalTransactions": 150
    },
    "byGame": [...]
  }
}
```

### Profit Performance
```bash
GET /api/admin/profit/performance

Response:
{
  "success": true,
  "data": {
    "actualProfitPercent": 18.5,
    "targetProfitPercent": 20.0,
    "profitGap": -1.5,
    "totalBets": 15000.00,
    "totalWins": 12000.00,
    "totalAdjustedWins": 9600.00
  }
}
```

### Auto-Adjustment
```bash
POST /api/admin/profit/auto-adjustment

Response:
{
  "success": true,
  "data": {
    "adjustment": {
      "previousRtp": 80.0,
      "newRtp": 78.0,
      "adjustment": 2.0,
      "reason": "Profit below target by 5.2% - reducing payouts"
    },
    "performance": {...}
  }
}
```

## 🔧 Configuration

### Database Tables
```sql
-- Profit tracking table
CREATE TABLE profit_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  original_amount NUMERIC(10,2) NOT NULL,
  adjusted_amount NUMERIC(10,2) NOT NULL,
  profit_reduction NUMERIC(10,2) NOT NULL,
  effective_rtp NUMERIC(5,2) NOT NULL,
  provider_rtp NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Daily profit summary
CREATE TABLE daily_profit_summary (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  total_bets NUMERIC(15,2) DEFAULT 0,
  total_wins NUMERIC(15,2) DEFAULT 0,
  total_adjusted_wins NUMERIC(15,2) DEFAULT 0,
  total_profit_retained NUMERIC(15,2) DEFAULT 0,
  effective_rtp NUMERIC(5,2) DEFAULT 80.00,
  target_profit NUMERIC(5,2) DEFAULT 20.00,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- RTP adjustment log
CREATE TABLE rtp_adjustment_log (
  id SERIAL PRIMARY KEY,
  previous_rtp NUMERIC(5,2) NOT NULL,
  new_rtp NUMERIC(5,2) NOT NULL,
  adjustment NUMERIC(5,2) NOT NULL,
  reason TEXT NOT NULL,
  profit_gap NUMERIC(5,2),
  actual_profit NUMERIC(5,2),
  target_profit NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Environment Variables
```bash
# Optional: Override default RTP settings
DEFAULT_EFFECTIVE_RTP=80
DEFAULT_TARGET_PROFIT=20
DEFAULT_ADJUSTMENT_MODE=manual
```

## 🎯 Benefits

### For Company
- **Guaranteed Profit Margins**: Automatic profit protection
- **Risk Management**: Prevent excessive losses
- **Flexible Control**: Adjust profit targets dynamically
- **Complete Transparency**: Full audit trail of all adjustments

### For Players
- **Smooth Experience**: No noticeable gameplay changes
- **Fair Play**: Adjustments appear as normal RTP variance
- **Consistent Payouts**: Predictable gaming experience

### For Providers
- **No Changes Required**: Zero impact on provider integration
- **Transparent Communication**: Provider sees original amounts
- **Standard Compliance**: No deviation from standard protocols

## 🔍 Monitoring & Alerts

### Key Metrics to Monitor
- **Profit Gap**: Difference between actual and target profit
- **Adjustment Frequency**: How often RTP is adjusted
- **Player Impact**: Effect on player retention
- **System Performance**: Response times and errors

### Recommended Alerts
- **Profit Gap > 10%**: Significant deviation from target
- **Frequent Adjustments**: Too many RTP changes
- **System Errors**: Profit control failures
- **Performance Issues**: Slow response times

## 🚨 Important Notes

### Legal Compliance
- Ensure compliance with local gambling regulations
- Maintain transparency in internal audits
- Document all profit control activities
- Respect player rights and fair play principles

### Technical Considerations
- Monitor system performance impact
- Regular database maintenance and cleanup
- Backup profit tracking data regularly
- Test adjustments in staging environment first

### Risk Management
- Set reasonable profit targets
- Implement gradual adjustment limits
- Monitor player behavior changes
- Have fallback mechanisms for system failures

---

**This system provides complete profit control while maintaining full stealth and provider transparency. All adjustments are internal and invisible to external parties.** 