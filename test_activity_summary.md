# User Activity Summary Testing Guide

## Overview
The user activity summary functionality provides comprehensive analytics about user behavior including:
- **total_actions**: Total number of activities performed
- **active_days**: Number of unique days with activity
- **last_activity**: Timestamp of the most recent activity
- **unique_actions**: Number of different types of actions performed
- **login_count**: Number of login activities
- **gaming_actions**: Number of gaming-related activities
- **financial_actions**: Number of financial transactions

## API Endpoint
```
GET /api/user/activity-summary
Authorization: Bearer <token>
```

## Test Scenarios

### 1. Login and Get Activity Summary
```bash
# Login as a user
curl -X POST 'https://backend.jackpotx.net/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "player1",
    "password": "secret123"
  }'

# Use the returned token to get activity summary
curl -X GET 'https://backend.jackpotx.net/api/user/activity-summary' \
  -H 'Authorization: Bearer <your_token>'
```

### 2. Perform Various Activities to Generate Data

#### A. Play Games
```bash
# Launch a game
curl -X POST 'https://backend.jackpotx.net/api/games/play' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"game_id": 1}'

# Record game play
curl -X POST 'https://backend.jackpotx.net/api/games/play/record' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"game_id": 1, "play_time_seconds": 300}'
```

#### B. Toggle Game Favorites
```bash
# Add game to favorites
curl -X POST 'https://backend.jackpotx.net/api/games/favorite' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"game_id": 1}'
```

#### C. Place Bets (if implemented)
```bash
# Place a bet
curl -X POST 'https://backend.jackpotx.net/api/games/bet' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "game_id": 1,
    "bet_amount": 10.00,
    "game_data": {}
  }'
```

### 3. Expected Response Format
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "username": "player1",
    "total_actions": 25,
    "active_days": 5,
    "last_activity": "2024-01-15T10:30:00Z",
    "unique_actions": 8,
    "login_count": 10,
    "gaming_actions": 12,
    "financial_actions": 3,
    "total_bets": 5,
    "total_wagered": 150.00,
    "total_won": 180.00,
    "games_played": 3,
    "total_transactions": 8,
    "deposit_count": 5,
    "withdrawal_count": 3,
    "total_deposited": 500.00,
    "total_withdrawn": 200.00,
    "total_sessions": 15,
    "current_level": "Silver",
    "current_points": 2500,
    "balance": 150.50
  }
}
```

## Activity Categories Tracked

### Authentication Activities
- `login` - User login
- `register` - User registration
- `logout` - User logout

### Gaming Activities
- `play_game` - Game played
- `launch_game` - Game launched
- `add_favorite` - Game added to favorites
- `remove_favorite` - Game removed from favorites
- `place_bet` - Bet placed
- `bet_win` - Bet won
- `bet_loss` - Bet lost

### Financial Activities
- `admin_balance_adjustment` - Admin balance adjustment
- `deposit` - Money deposited
- `withdrawal` - Money withdrawn

### Account Activities
- `admin_status_update` - Admin status update
- `profile_update` - Profile updated

## Database View
The system uses the `user_activity_summary` view which aggregates data from:
- `user_activity_logs` - Main activity tracking
- `bets` - Betting information
- `transactions` - Financial transactions
- `user_sessions` - Session information
- `user_level_progress` - Level information
- `user_balances` - Balance information

## Notes
- All activities are automatically logged when users perform actions
- The summary provides both basic activity metrics and detailed financial/gaming statistics
- The system handles cases where no activity exists by providing default values
- Activity logging includes metadata for detailed analysis 