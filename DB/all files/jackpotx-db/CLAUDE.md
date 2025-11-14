# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a MongoDB database dump for the JackpotX gaming platform. The database contains BSON data files and metadata JSON files exported using `mongodump` (version 100.13.0) from MongoDB 7.0.23.

## Database Collections

### Core Gaming Collections

- **games** - Game definitions and configurations
- **bets** - Individual bet records with outcomes and user associations
  - Indexes: `user_id`, `game_id`, `outcome`, `transaction_id`, `placed_at`, compound `user_id_outcome`

### Financial Collections

- **transactions** - All financial transactions (deposits, withdrawals, bets, wins)
  - Indexes: `user_id`, `type`, `status`, `created_at`, `external_reference`, `metadata.game_id`, `metadata.session_id`
  - Compound indexes for querying by user, type, status, and amount with timestamps

- **categorybalances** - Legacy balance tracking by category
- **user_category_balances** - Per-user balance tracking by category
  - Unique compound index on `user_id` and `category`

- **profit_tracking** - Tracks profit/loss metrics
- **daily_profit_summary** - Aggregated daily profit summaries
- **rtp_adjustment_log** - Return-to-Player (RTP) adjustment history

### Utility Collections

- **sequences** - Auto-incrementing ID sequences for various entities

## Working with this Database

### Restoring the Database

```bash
# Restore entire database
mongorestore --db jackpotx .

# Restore specific collection
mongorestore --db jackpotx --collection bets bets.bson
```

### Exporting/Dumping

```bash
# Export entire database
mongodump --db jackpotx --out ./jackpotx-db

# Export specific collection
mongodump --db jackpotx --collection transactions
```

### Querying Key Data

```bash
# View bets by user and outcome
mongosh jackpotx --eval 'db.bets.find({user_id: "USER_ID", outcome: "win"})'

# Check transaction history
mongosh jackpotx --eval 'db.transactions.find({user_id: "USER_ID", type: "bet"}).sort({created_at: -1})'

# View user category balances
mongosh jackpotx --eval 'db.user_category_balances.find({user_id: "USER_ID"})'
```

## Data Architecture

### Transaction Flow
1. Transactions are created with `external_reference` for idempotency
2. Bets reference transactions via `transaction_id`
3. User balances are tracked per category in `user_category_balances`
4. Profit tracking aggregates results in `profit_tracking` and `daily_profit_summary`

### RTP Management
The system tracks and adjusts Return-to-Player percentages:
- RTP adjustments are logged in `rtp_adjustment_log`
- Adjustments affect game behavior and profit targets
- Historical data enables RTP analysis and compliance reporting

### Balance Categories
User balances are segregated by category (likely bonus, real money, promotional, etc.) with unique constraints ensuring one balance record per user per category.
