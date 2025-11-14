# Innova TimelessTech SDK - Production Credentials

## Overview
JackpotX is now integrated with Innova TimelessTech for:
- **Campaigns** (Free Spins / Bonus Management)
- **Jackpots** (Progressive Jackpots with Widgets)
- **Tournaments** (Player Competitions with Leaderboards)

---

## Production Credentials

### Operator Information
- **Entity Group**: `thinkcode_group`
- **Entity**: `thinkcode`
- **Operator ID**: `thinkcode`
- **External Reference**: `thinkcode`

### API Keys
- **Secret Key**: `2aZWQ93V8aT1sKrA`
- **API Key (same as Operator ID)**: `thinkcode`

### Callback URL
- **Callback URL**: `https://backend.jackpotx.net/api/innova/`

---

## Production API Endpoints

### Game Integration
- **Game List**: `https://air.gameprovider.org/api/generic/games/list/all`
- **Lobby List**: `https://air.gameprovider.org/api/generic/lobbies/list/all`
- **Game Launch Host**: `https://gamerun-eu.gaminguniverse.fun`
- **Hand History**: `https://hh.gameprovider.org/api/generic/handHistory/`

### Widget SDK
- **SDK URL**: `https://ttlive.me/app/sdk/index.js`
- **API Host**: `https://ttlive.me`

---

## Backoffice Access

### TimelessTech Backoffice (for managing Campaigns, Jackpots, Tournaments)
- **URL**: `https://backoffice.timelesstech.org/login`
- **Username**: `thinkcode_bo`
- **Password**: `39ByzDV3`

Use this backoffice to:
- Create and manage Free Spins campaigns
- Configure jackpot schedules and prizes
- Set up tournaments with prize pools
- View real-time statistics and reports
- Configure webhooks for events

---

## Environment Configuration

### Backend (.env)
```bash
# Innova SDK Configuration (Campaigns, Jackpots, Tournaments)
INNOVA_OPERATOR_ID=thinkcode
INNOVA_SECRET_KEY=2aZWQ93V8aT1sKrA
INNOVA_API_HOST=https://ttlive.me
INNOVA_PLATFORM_ID=thinkcode
INNOVA_GROUP=thinkcode_group
```

### Frontend (.env)
```bash
# Innova SDK Configuration for Widgets (Jackpots & Tournaments)
REACT_APP_INNOVA_OPERATOR_ID=thinkcode
REACT_APP_INNOVA_PLATFORM_ID=thinkcode
REACT_APP_INNOVA_SDK_URL=https://ttlive.me/app/sdk/index.js
```

---

## API Routes Implemented

### Backend API (https://backend.jackpotx.net/api)

#### Jackpots
- `GET /jackpots/active` - Get all active jackpots (public)
- `GET /jackpots/schedules` - List jackpot schedules (admin)
- `POST /jackpots/schedules` - Create new jackpot (admin)
- `PUT /jackpots/schedules/:id` - Update jackpot (admin)
- `DELETE /jackpots/schedules/:id` - Delete jackpot (admin)
- `POST /jackpots/instances/start/:scheduleId` - Start jackpot instance (admin)
- `POST /jackpots/instances/trigger-win` - Trigger jackpot win (admin/testing)
- `GET /jackpots/history` - Get jackpot win history (public)

#### Tournaments
- `GET /tournaments/active` - Get active tournaments (public)
- `GET /tournaments` - List all tournaments (admin)
- `POST /tournaments` - Create tournament (admin)
- `PUT /tournaments/:id` - Update tournament (admin)
- `DELETE /tournaments/:id` - Delete tournament (admin)
- `POST /tournaments/:id/start` - Start tournament instance (admin)
- `POST /tournaments/:id/finish` - Finish tournament and distribute prizes (admin)
- `GET /tournaments/:instanceId/leaderboard` - Get tournament leaderboard (public)

#### Campaigns (Free Spins)
- `GET /campaigns/vendors` - List supported vendors (admin)
- `GET /campaigns/game-limits` - Get game betting limits (admin)
- `POST /campaigns/sync-limits/:vendor` - Sync limits from platform (admin)
- `GET /campaigns` - List campaigns with filters (admin)
- `POST /campaigns` - Create new campaign (admin)
- `POST /campaigns/:code/cancel` - Cancel campaign (admin)
- `POST /campaigns/:code/players/add` - Add players to campaign (admin)
- `POST /campaigns/:code/players/remove` - Remove players from campaign (admin)
- `GET /campaigns/user/:userId` - Get user's active campaigns (player)

---

## Database Schema

### Jackpots
- `jackpot_schedules` - Jackpot configurations
- `jackpot_instances` - Active/past jackpot instances
- `jackpot_contributions` - Player contributions to jackpots
- `jackpot_winners` - Jackpot win records

### Tournaments
- `tournament_schedules` - Tournament configurations
- `tournament_instances` - Active/past tournament instances
- `tournament_players` - Player participation and points
- `tournament_games` - Eligible games for tournaments

### Campaigns
- `campaign_vendors` - Supported vendors (Pragmatic, 3Oaks, Amigo Gaming)
- `campaigns` - Free spins campaigns
- `campaign_players` - Player participation
- `campaign_games` - Eligible games
- `campaign_game_limits` - Betting limits per game

### Webhooks
- `integration_webhooks` - Webhook configurations for events

---

## Frontend Integration

### Homepage Widgets (https://jackpotx.net/home)
1. **Jackpot Widget** - Displays all active jackpots with real-time updates
2. **Tournament Widget** - Shows active tournaments with leaderboards

### Widget Features
- Real-time prize pool updates
- Live leaderboards
- Player position tracking
- Auto-refresh functionality
- Dark theme optimized for casino aesthetic

---

## Webhook Events (Innova → JackpotX)

**IMPORTANT**: Innova sends jackpots and tournaments TO US via webhooks!
We receive notifications, NOT create them manually.

### Webhook Endpoints to Provide to Innova

- **Jackpot Webhooks**: `https://backend.jackpotx.net/api/innova/webhooks/jackpot`
- **Tournament Webhooks**: `https://backend.jackpotx.net/api/innova/webhooks/tournament`

### Jackpot Events (Received from Innova)
- `NEW_INSTANCE` - Innova created new jackpot instance → We store it in database
- `INSTANCE_WIN` - Player won jackpot → We record the win
- `UPDATE_SIZE` - Jackpot amount increased → We update current_amount

### Tournament Events (Received from Innova)
- `NEW_INSTANCE` - Innova created new tournament → We store it in database
- `UPDATE_STATUS` - Tournament status changed (PENDING → ACTIVE → FINISHED)

---

## Testing

### Test Jackpot Creation
```bash
curl -X POST https://backend.jackpotx.net/api/jackpots/schedules \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mega Jackpot",
    "type": "CASINO",
    "currency_code": "USD",
    "seed_amount": 10000,
    "contribution_percentage": 1.0
  }'
```

### Test Tournament Creation
```bash
curl -X POST https://backend.jackpotx.net/api/tournaments \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekend Slots Championship",
    "description": "Compete for $5000 prize pool",
    "currency_code": "USD",
    "prize_pool": 5000,
    "min_bet": 1.00,
    "start_time": "2025-11-15T00:00:00Z",
    "end_time": "2025-11-17T23:59:59Z"
  }'
```

### Test Campaign Creation
```bash
curl -X POST https://backend.jackpotx.net/api/campaigns \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_code": "WELCOME50",
    "vendor_name": "Pragmatic Play",
    "currency_code": "USD",
    "freespins_per_player": 50,
    "begins_at": "2025-11-10T00:00:00Z",
    "expires_at": "2025-12-10T23:59:59Z"
  }'
```

---

## Next Steps

1. ✅ **Backend Integration** - COMPLETED
   - Services implemented (JackpotService, TournamentService, CampaignsService)
   - API routes created and registered
   - Database schema deployed

2. ✅ **Player Frontend** - COMPLETED
   - Jackpot Widget on homepage
   - Tournament Widget with leaderboards
   - SDK integration with WidgetFactory

3. 🔄 **Admin Panel UI** - PENDING
   - Campaigns management interface
   - Jackpots configuration UI
   - Tournaments setup and control panel

4. 🔄 **Testing** - PENDING
   - Create test jackpots via backoffice
   - Launch test tournaments
   - Test free spins campaigns with real players

---

## Support Contacts

For technical support with Innova SDK:
- **Backoffice**: https://backoffice.timelesstech.org/login
- **Documentation**: Available in `/var/www/html/backend.jackpotx.net/InnovaSDK/`

---

**Last Updated**: November 9, 2025
**Status**: Production Ready - Backend & Player Frontend Completed
