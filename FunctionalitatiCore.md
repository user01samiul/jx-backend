# 🎰 JackpotX Casino Backend - Funcționalități Complete

## 📊 Statistici Generale

- **Total Endpoint-uri API**: 200+
- **Total Tabele Database**: 60+
- **Total Fișiere Service**: 78+
- **Total Module Route**: 44
- **Total Controllers**: 26
- **Linii de Cod**: ~50,000+
- **Tehnologii**: TypeScript (95%), JavaScript (5%)

---

## 🏗️ 1. ARHITECTURĂ CORE

### 1.1 Server & Configurare
- **Framework**: Node.js + Express.js + TypeScript
- **Port Production**: 3004
- **Entry Point**: `/src/index.ts`
- **Application**: `/src/app.ts`
- **WebSocket Support**: Socket.IO pentru real-time features
- **CORS**: Activat pentru jackpotx.net, admin.jackpotx.net
- **Process Manager**: PM2

### 1.2 Baze de Date
**PostgreSQL (Primary Database)**
- Host: localhost:5432
- Database: jackpotx-db
- Utilizare: Date tranzacționale, useri, jocuri, plăți
- Connection pooling activat

**MongoDB (Secondary Database)**
- URI: mongodb://localhost:27017/jackpotx
- Utilizare: Analytics, caching, istoric bet-uri
- Real-time data storage

### 1.3 Middleware Stack
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Compression**: Response compression
- **Morgan**: HTTP request logging
- **Cookie Parser**: Cookie handling
- **Rate Limiting**: Cu suport Cloudflare
- **Circuit Breaker**: Pattern pentru resilience
- **Error Tracking**: Comprehensive error handling
- **Health Monitoring**: System health checks

---

## 👤 2. SISTEM UTILIZATORI

### 2.1 Autentificare & Autorizare
**Endpoint-uri**: `/src/routes/auth.routes.ts`

#### Funcționalități:
- ✅ Login cu suport 2FA (TOTP)
- ✅ Register cu QR code pentru 2FA
- ✅ Token refresh (JWT-based)
- ✅ Role-based access control
- ✅ CAPTCHA generation
- ✅ Session management
- ✅ Device tracking

#### API Endpoints:
```
POST   /api/auth/login           - Login utilizator
POST   /api/auth/register        - Înregistrare nouă
POST   /api/auth/refresh         - Refresh JWT token
GET    /api/auth/user-roles      - Obține roluri utilizator
GET    /api/auth/captcha         - Generează CAPTCHA
POST   /api/auth/logout          - Logout
```

### 2.2 Gestionare Profil
**Controller**: `/src/api/user/user.controller.ts`

#### Funcționalități:
- ✅ Profil complet utilizator
- ✅ Update profil (nume, email, telefon, etc.)
- ✅ Schimbare parolă
- ✅ Avatar upload
- ✅ Preferințe utilizator
- ✅ Istoric activitate
- ✅ Jocuri favorite
- ✅ Balance management

#### API Endpoints:
```
GET    /api/user/profile              - Profil complet
PUT    /api/user/profile/update       - Actualizare profil
PUT    /api/user/password/change      - Schimbare parolă
GET    /api/user/balance              - Balance utilizator
GET    /api/user/transactions         - Istoric tranzacții
GET    /api/user/bets                 - Istoric pariuri
GET    /api/user/activity             - Activitate recentă
GET    /api/user/favorite-games       - Jocuri favorite
GET    /api/user/category-balances    - Multi-wallet balances
POST   /api/user/transfer             - Transfer între wallets
```

### 2.3 Autentificare 2FA (Two-Factor)
**Service**: `/src/services/user/2fa.service.ts`

#### Funcționalități:
- ✅ TOTP (Time-based One-Time Password)
- ✅ QR code generation (Google Authenticator compatible)
- ✅ Backup codes generation
- ✅ Enable/Disable 2FA
- ✅ Skip 2FA setup (delayed activation)

#### API Endpoints:
```
GET    /api/user/2fa/status      - Status 2FA
POST   /api/user/2fa/enable      - Activare 2FA
POST   /api/user/2fa/disable     - Dezactivare 2FA
POST   /api/user/2fa/skip        - Skip setup 2FA
POST   /api/user/2fa/verify      - Verificare cod 2FA
```

### 2.4 Roluri & Permisiuni
**Tabele**: `roles`, `user_roles`, `statuses`

#### Roluri Disponibile:
- **Player** - Jucător regulat
- **Admin** - Acces complet sistem
- **Support** - Suport clienți
- **Manager** - Manager afiliați
- **VIP** - Privilegii VIP

#### Permisiuni Granulare:
- `can_login` - Poate face login
- `can_deposit` - Poate depune bani
- `can_withdraw` - Poate retrage bani
- `can_play` - Poate juca jocuri
- `can_receive_marketing` - Poate primi marketing

---

## 🎮 3. SISTEM JOCURI

### 3.1 Management Jocuri
**Controller**: `/src/api/game/game.controller.ts`
**Service**: `/src/services/game/game.service.ts`

#### Funcționalități Browse Jocuri:
- ✅ Listare toate jocurile cu filtrare avansată
- ✅ Detalii joc individual
- ✅ Categorii jocuri (Slots, Table Games, Live Casino, etc.)
- ✅ Provideri jocuri
- ✅ Jocuri featured (promovate)
- ✅ Jocuri noi (new releases)
- ✅ Jocuri hot (trending)
- ✅ Jocuri populare (most played)
- ✅ Statistici jocuri (RTP, volatilitate, etc.)
- ✅ Search & Filter (nume, categorie, provider)

#### API Endpoints:
```
GET    /api/games                    - Toate jocurile
GET    /api/games/:id                - Detalii joc
GET    /api/games/categories         - Categorii disponibile
GET    /api/games/providers          - Provideri jocuri
GET    /api/games/featured           - Jocuri featured
GET    /api/games/new                - Jocuri noi
GET    /api/games/hot                - Jocuri trending
GET    /api/games/popular            - Cele mai jucate
GET    /api/games/statistics         - Statistici generale
GET    /api/games/search             - Căutare jocuri
```

### 3.2 Interacțiune cu Jocurile
**Service**: `/src/services/game/game-interaction.service.ts`

#### Funcționalități:
- ✅ Toggle favorite (add/remove)
- ✅ Launch game (demo & real money)
- ✅ Place bet (plasare pariu)
- ✅ Process bet result (win/loss)
- ✅ Cancel game session
- ✅ Game history tracking
- ✅ Recent games

#### API Endpoints:
```
POST   /api/games/favorite           - Toggle favorite
POST   /api/games/play               - Launch joc
POST   /api/games/bet                - Plasare pariu
POST   /api/games/bet-result         - Rezultat pariu
POST   /api/games/cancel             - Cancel sesiune
GET    /api/games/history            - Istoric jocuri
GET    /api/games/recent             - Jocuri recente
```

### 3.3 Provideri Jocuri

#### **Innova Gaming (Provider Principal)**
**Integration**: `/src/services/game/provider-callback.service.ts`

**Credențiale Production:**
- Operator ID: `thinkcode`
- Secret Key: `2aZWQ93V8aT1sKrA`
- API Host: `https://air.gameprovider.org`
- Launch Host: `https://gamerun-eu.gaminguniverse.fun`
- Pragmatic Launch: `https://run.games378.com`
- Callback URL: `https://backend.jackpotx.net/api/innova/`

**Callback Operations:**
- `getBalance` - Obține balansul jucătorului
- `changeBalance` - Procesează pariuri/câștiguri
- `refund` - Procesează refund-uri
- `cancelBet` - Anulează pariu
- GGR filtering (control profit)
- Balance consistency tracking

**Callback Endpoints:**
```
POST   /api/innova/getBalance        - Get player balance
POST   /api/innova/changeBalance     - Process bet/win
POST   /api/innova/refund            - Process refund
POST   /api/innova/cancelBet         - Cancel bet
```

#### **JxOriginals (Jocuri Interne)**
**Location**: `/var/www/html/backend.jackpotx.net/JxOriginalGames/`

**Configurare:**
- Base URL: `https://backend.jackpotx.net/JxOriginalGames`
- WebSocket URL: `wss://backend.jackpotx.net:8443`
- Secret Key: `jxoriginals_secret_key_2024`
- Operator ID: `jackpotx_operator`
- Full source code control

**Jocuri Disponibile:**
- Custom slots (cod sursă complet)
- Table games personalizate
- Mini-games proprietare

### 3.4 Categorii Jocuri
**Service**: `/src/services/admin/admin.category.service.ts`

#### Categorii Standard:
- **Slots** - Slot machines
- **Table Games** - Blackjack, Roulette, Baccarat
- **Live Casino** - Live dealer games
- **Video Poker** - Video poker variants
- **Jackpots** - Progressive jackpots
- **New Games** - Latest releases
- **Popular** - Most played

---

## 💰 4. SISTEM PLĂȚI

### 4.1 Payment Gateway Integration
**Service**: `/src/services/payment/payment-integration.service.ts`

#### Gateway-uri Suportate:
- **Stripe** - Plăți cu card (Visa, Mastercard, Amex)
- **PayPal** - Wallet digital
- **Razorpay** - Piață India & Asia
- **OxaPay** - Cryptocurrency (18 monede)
- **IGPX** - Sportsbook integration
- **Generic Crypto** - Custom crypto implementation

#### Operațiuni Payment:
- ✅ Create payment/deposit
- ✅ Create withdrawal
- ✅ Check payment status
- ✅ Process webhooks
- ✅ Test gateway connection
- ✅ Gateway statistics
- ✅ Transaction history
- ✅ Refund processing

#### API Endpoints:
```
POST   /api/payment/deposit          - Creare depunere
POST   /api/payment/withdraw         - Creare retragere
GET    /api/payment/status/:id       - Status plată
POST   /api/payment/webhook/:gateway - Webhook processing
GET    /api/payment/gateways         - Gateway-uri disponibile
GET    /api/payment/history          - Istoric plăți
```

### 4.2 Cryptocurrency Support (OxaPay)
**18 Cryptocurrencies Suportate:**

| Crypto | Symbol | Decimal Places |
|--------|--------|----------------|
| Bitcoin | BTC | 8 |
| Ethereum | ETH | 8 |
| Tether | USDT | 2 |
| USD Coin | USDC | 2 |
| BNB | BNB | 8 |
| Dogecoin | DOGE | 8 |
| Polygon | POL | 8 |
| Litecoin | LTC | 8 |
| Solana | SOL | 8 |
| Tron | TRX | 6 |
| Shiba Inu | SHIB | 8 |
| Toncoin | TON | 8 |
| Monero | XMR | 8 |
| DAI | DAI | 8 |
| Bitcoin Cash | BCH | 8 |
| NotCoin | NOT | 8 |
| Dogs | DOGS | 8 |
| Ripple | XRP | 6 |

### 4.3 Sistem Retrageri
**Service**: `/src/services/withdrawal/withdrawal.service.ts`
**Controller**: `/src/controllers/withdrawal.controller.ts`

#### Funcționalități:
- ✅ Creare cerere retragere
- ✅ KYC verification checks
- ✅ Balance verification
- ✅ Limite min/max
- ✅ Calcul taxe
- ✅ Auto-processing (cron job la 15 min)
- ✅ Manual approval/reject
- ✅ Status tracking
- ✅ Email notifications
- ✅ Transaction history

#### Status-uri Retragere:
- **PENDING** - În așteptare
- **APPROVED** - Aprobată
- **PROCESSING** - În procesare
- **COMPLETED** - Finalizată
- **REJECTED** - Respinsă
- **CANCELLED** - Anulată

#### API Endpoints:
```
POST   /api/withdrawals                     - Creare retragere
GET    /api/withdrawals                     - Retragerile mele
GET    /api/withdrawals/:id                 - Detalii retragere
DELETE /api/withdrawals/:id                 - Anulare retragere
GET    /api/withdrawals/admin/all           - Toate retragerile (Admin)
POST   /api/withdrawals/admin/:id/approve   - Aprobare (Admin)
POST   /api/withdrawals/admin/:id/reject    - Respingere (Admin)
GET    /api/withdrawals/admin/statistics    - Statistici (Admin)
```

#### Cron Job Retrageri:
**Frecvență**: La fiecare 15 minute
**Funcții**:
- Procesare automată retrageri eligibile
- Verificare KYC level
- Verificare limite zilnice/lunare
- Integrare cu payment gateways
- Notificări email

### 4.4 Tranzacții
**Service**: `/src/services/transaction/transaction.service.ts`

#### Tipuri Tranzacții:
- **DEPOSIT** - Depunere
- **WITHDRAWAL** - Retragere
- **BET** - Pariu plasat
- **WIN** - Câștig
- **REFUND** - Rambursare
- **BONUS** - Bonus primit
- **TRANSFER** - Transfer între wallets
- **FEE** - Taxă
- **COMMISSION** - Comision afiliat

#### API Endpoints:
```
GET    /api/transactions                - Toate tranzacțiile
GET    /api/transactions/:id            - Detalii tranzacție
GET    /api/transactions/summary        - Sumar tranzacții
GET    /api/admin/transactions          - Toate (Admin)
POST   /api/admin/transactions/:id/approve - Aprobare (Admin)
```

### 4.5 Balance Management
**Service**: `/src/services/user/balance-mongo.service.ts`

#### Funcționalități:
- ✅ Unified wallet system
- ✅ Multi-wallet support (Casino, Sports, Poker)
- ✅ Balance categories
- ✅ Real balance vs Bonus balance
- ✅ Transfer între categorii
- ✅ Transaction integrity checks
- ✅ Automatic reconciliation
- ✅ Balance history

#### API Endpoints:
```
GET    /api/user/balance               - Balance complet
GET    /api/user/balance/category/:cat - Balance categorie
POST   /api/user/balance/transfer      - Transfer între categorii
GET    /api/user/balance/history       - Istoric balance
```

---

## 🎁 5. SISTEM PROMOȚII & BONUSURI

### 5.1 Gestionare Promoții
**Controller**: `/src/api/promotion/promotion.controller.ts`
**Service**: `/src/services/promotion/promotion.service.ts`

#### Tipuri Promoții:
- **Welcome Bonus** - Bonus la înregistrare
- **Deposit Bonus** - Bonus la depunere (50%, 100%, 200%)
- **Free Spins** - Rotiri gratuite
- **Cashback** - Returnare pierderi (5-20%)
- **Reload Bonus** - Bonus reload periodic
- **Tournament Entry** - Acces la turnee
- **Promo Codes** - Coduri promoționale
- **Daily Spin** - Spin zilnic gratuit
- **VIP Rewards** - Recompense VIP
- **Birthday Bonus** - Bonus zi naștere

#### Funcționalități:
- ✅ Claim promoție
- ✅ Wagering requirements tracking
- ✅ Bonus balance management
- ✅ Transfer bonus → main balance
- ✅ Expiration management
- ✅ Eligibility rules
- ✅ Country restrictions
- ✅ Game restrictions
- ✅ Max bet restrictions

#### API Endpoints (User):
```
GET    /api/promotions                      - Promoții disponibile
POST   /api/promotions/claim                - Claim promoție
GET    /api/promotions/my                   - Promoțiile mele
GET    /api/promotions/daily-spin           - Status daily spin
POST   /api/promotions/daily-spin/perform   - Efectuează spin
GET    /api/promotions/wagering-progress    - Progress wagering
GET    /api/promotions/bonus-balance        - Balance bonus
POST   /api/promotions/transfer-bonus       - Transfer bonus → main
POST   /api/promotions/code/redeem          - Redeem promo code
```

#### API Endpoints (Admin):
```
GET    /api/admin/promotions                - Toate promoțiile
POST   /api/admin/promotions                - Creare promoție
PUT    /api/admin/promotions/:id            - Update promoție
DELETE /api/admin/promotions/:id            - Ștergere promoție
GET    /api/admin/promotions/stats          - Statistici promoții
GET    /api/admin/promotions/claims         - Claim-uri promoții
```

---

## 👥 6. SISTEM AFILIAȚI

### 6.1 Program Afiliați
**Service**: `/src/services/affiliate/affiliate.service.ts`
**Enhanced Service**: `/src/services/affiliate/enhanced-affiliate.service.ts`

#### Funcționalități:
- ✅ Înregistrare ca afiliat
- ✅ Dashboard afiliat
- ✅ Tracking referrals
- ✅ Commission tracking
- ✅ Multi-level marketing (MLM) - 5 niveluri
- ✅ Commission tiers per level
- ✅ Performance bonuses
- ✅ Retragere comisioane
- ✅ Generate tracking links
- ✅ Marketing materials
- ✅ Statistici detaliate

#### Structură MLM:
- **Level 1**: 30% comision
- **Level 2**: 15% comision
- **Level 3**: 10% comision
- **Level 4**: 5% comision
- **Level 5**: 2% comision

#### API Endpoints:
```
POST   /api/affiliate/register             - Înregistrare afiliat
GET    /api/affiliate/dashboard            - Dashboard afiliat
GET    /api/affiliate/referrals            - Utilizatori referați
GET    /api/affiliate/commissions          - Istoric comisioane
GET    /api/affiliate/stats                - Statistici
POST   /api/affiliate/withdraw             - Retragere comisioane
GET    /api/affiliate/tracking-links       - Generate link-uri
GET    /api/affiliate/materials            - Materiale marketing
```

### 6.2 Manager Afiliați
**Routes**: `/src/routes/manager.routes.ts`

#### Funcționalități Admin:
- ✅ Gestionare toți afiliații
- ✅ Aprobare/respingere afiliați
- ✅ Vizualizare comisioane toate nivelurile
- ✅ Setare rate comisioane custom
- ✅ Statistici globale afiliați
- ✅ Performance reports
- ✅ Fraud detection

#### API Endpoints:
```
GET    /api/manager/affiliates             - Toți afiliații
PUT    /api/manager/affiliate/:id/status   - Update status afiliat
GET    /api/manager/commissions            - Overview comisioane
GET    /api/manager/analytics              - Analytics afiliați
POST   /api/manager/affiliate/:id/bonus    - Bonus performance
```

---

## 🏆 7. GAMIFICATION & ENGAGEMENT

### 7.1 Sistem Turnee
**Service**: `/src/services/tournament/TournamentService.ts`

#### Funcționalități:
- ✅ Tournament schedules
- ✅ Prize pools
- ✅ Leaderboards real-time
- ✅ Scoring system
- ✅ Winner distribution automată
- ✅ Tournament types (Points, Wagering, Spins)
- ✅ Entry fees
- ✅ Re-buy options

#### API Endpoints:
```
GET    /api/tournaments                    - Toate turneele
POST   /api/tournaments                    - Creare turneu (Admin)
PUT    /api/tournaments/:id                - Update turneu (Admin)
POST   /api/tournaments/:id/start          - Start turneu (Admin)
POST   /api/tournaments/:id/finish         - Finish turneu (Admin)
GET    /api/tournaments/:id/leaderboard    - Leaderboard
POST   /api/tournaments/:id/join           - Join turneu
GET    /api/tournaments/:id/my-position    - Poziția mea
```

### 7.2 Sistem Jackpot
**Service**: `/src/services/jackpot/JackpotService.ts`

#### Tipuri Jackpot:
- **Fixed Jackpots** - Jackpot fix
- **Progressive Jackpots** - Jackpot progresiv
- **Daily Jackpots** - Jackpot zilnic (trebuie câștigat în 24h)
- **Hourly Jackpots** - Jackpot pe oră

#### Funcționalități:
- ✅ Jackpot schedules
- ✅ Contribution tracking (% din fiecare bet)
- ✅ Winner selection (random/triggered)
- ✅ Prize distribution automată
- ✅ Historical data
- ✅ Multi-currency support

#### API Endpoints:
```
GET    /api/jackpots/schedules             - Jackpot schedules
POST   /api/jackpots/schedules             - Creare schedule (Admin)
GET    /api/jackpots/instances             - Instanțe active
POST   /api/jackpots/instances/start       - Start instanță (Admin)
POST   /api/jackpots/instances/trigger-win - Trigger câștig (Admin)
GET    /api/jackpots/winners               - Câștigători recenți
GET    /api/jackpots/contributions         - Contribuții mele
```

### 7.3 Sistem Loialitate
**Service**: `/src/services/loyalty/LoyaltyService.ts`

#### Funcționalități:
- ✅ Points accumulation (1 EUR = 10 points)
- ✅ Level progression (10 niveluri)
- ✅ Rewards catalog
- ✅ Cashback system
- ✅ VIP tiers (Bronze, Silver, Gold, Platinum, Diamond)
- ✅ Tier benefits
- ✅ Birthday bonuses
- ✅ Level-up bonuses

#### VIP Tiers:
| Tier | Points Required | Cashback | Benefits |
|------|----------------|----------|----------|
| Bronze | 0 | 1% | Basic |
| Silver | 10,000 | 2% | Enhanced support |
| Gold | 50,000 | 3% | Faster withdrawals |
| Platinum | 100,000 | 5% | Personal manager |
| Diamond | 500,000 | 10% | Exclusive events |

#### API Endpoints:
```
GET    /api/loyalty/points                 - Points utilizator
GET    /api/loyalty/level                  - Level utilizator
GET    /api/loyalty/rewards                - Recompense disponibile
POST   /api/loyalty/rewards/:id/claim      - Claim recompensă
GET    /api/loyalty/history                - Istoric points
GET    /api/loyalty/tier                   - VIP tier
```

### 7.4 Sistem Challenges
**Service**: `/src/services/challenges/ChallengesService.ts`

#### Tipuri Challenges:
- **Daily Challenges** - Challenge-uri zilnice
- **Weekly Challenges** - Challenge-uri săptămânale
- **Achievement System** - Sistemul de realizări
- **Progressive Challenges** - Challenge-uri cu pași multipli

#### Funcționalități:
- ✅ Progress tracking automat
- ✅ Reward distribution
- ✅ Challenge categories
- ✅ Streak bonuses
- ✅ Notification on completion

#### API Endpoints:
```
GET    /api/challenges/daily               - Daily challenges
GET    /api/challenges/weekly              - Weekly challenges
GET    /api/challenges/achievements        - Achievements
GET    /api/challenges/progress/:id        - Progress challenge
POST   /api/challenges/:id/claim           - Claim reward
```

### 7.5 Mini Games
**Service**: `/src/services/mini-games/MiniGamesService.ts`

#### Jocuri Disponibile:
- **Wheel of Fortune** - Roată norocului
- **Scratch Cards** - Carduri de răzuit
- **Coin Flip** - Aruncare monedă
- **Dice Roll** - Aruncarea zarurilor

#### API Endpoints:
```
GET    /api/mini-games/available           - Jocuri disponibile
POST   /api/mini-games/wheel/spin          - Spin wheel
POST   /api/mini-games/scratch/:id         - Răzuire card
POST   /api/mini-games/coin-flip           - Coin flip
POST   /api/mini-games/dice-roll           - Dice roll
GET    /api/mini-games/history             - Istoric mini-games
```

### 7.6 Personal Jackpots
**Routes**: `/src/routes/personal-jackpots.routes.ts`

#### Funcționalități:
- ✅ Jackpot-uri personalizate per utilizator
- ✅ Progress tracking individual
- ✅ Personalized prizes
- ✅ Trigger conditions custom

---

## 🛡️ 8. ENTERPRISE & COMPLIANCE

### 8.1 Responsible Gaming (Joc Responsabil)
**Routes**: `/src/routes/responsible-gaming.routes.ts`
**Services**:
- `/src/services/responsible-gaming/deposit-limits.service.ts`
- `/src/services/responsible-gaming/self-exclusion.service.ts`

#### **Deposit Limits (Limite Depunere)**

**Funcționalități:**
- ✅ DAILY limits (zilnice)
- ✅ WEEKLY limits (săptămânale)
- ✅ MONTHLY limits (lunare)
- ✅ Compliance: Decrease immediate, increase delayed (24-72h)
- ✅ Automatic reset on period end
- ✅ Complete audit history
- ✅ Currency support
- ✅ Overflow protection

**API Endpoints:**
```
POST   /api/responsible-gaming/deposit-limits        - Creare limită
GET    /api/responsible-gaming/deposit-limits        - Limitele mele
PUT    /api/responsible-gaming/deposit-limits/:id    - Update limită
DELETE /api/responsible-gaming/deposit-limits/:id    - Ștergere limită
GET    /api/responsible-gaming/deposit-limits/check  - Verificare depunere
```

#### **Self-Exclusion (Auto-Excludere)**

**Tipuri:**
- **TEMPORARY** - Excludere temporară
- **PERMANENT** - Excludere permanentă
- **TIMEOUT** - Pauză scurtă (24h-7d)
- **COOLING_OFF** - Cooling off period (6 săptămâni)

**Durate Disponibile:**
- 1 day, 3 days, 7 days, 14 days
- 30 days, 60 days, 90 days
- 180 days, 365 days
- PERMANENT (fără dată expirare)

**Funcționalități:**
- ✅ Cooling period enforcement
- ✅ Cannot revoke before cooling period expires
- ✅ Automatic account lock
- ✅ Email notifications
- ✅ Admin override capability
- ✅ Audit trail complet

**API Endpoints:**
```
POST   /api/responsible-gaming/self-exclusion        - Activare auto-excludere
GET    /api/responsible-gaming/self-exclusion        - Status auto-excludere
POST   /api/responsible-gaming/self-exclusion/revoke - Revocare (cu cooling period)
GET    /api/responsible-gaming/self-exclusion/history - Istoric auto-excluderi
```

#### **Reality Checks**
**Funcționalități:**
- ✅ Popup-uri periodice cu timp jucat
- ✅ Session tracking
- ✅ Spending alerts
- ✅ Time limits

### 8.2 Multilanguage System
**Routes**: `/src/routes/multilanguage.routes.ts`
**Services**: `/src/services/multilanguage/translation.service.ts`

#### **10 Limbi Suportate:**
- 🇬🇧 English (EN) - Default
- 🇪🇸 Spanish (ES)
- 🇵🇹 Portuguese (PT)
- 🇮🇹 Italian (IT)
- 🇩🇪 German (DE)
- 🇫🇷 French (FR)
- 🇷🇴 Romanian (RO)
- 🇵🇱 Polish (PL)
- 🇹🇷 Turkish (TR)
- 🇷🇺 Russian (RU)

#### Funcționalități:
- ✅ 100+ traduceri comune pre-configurate
- ✅ Category-based organization (common, games, errors, etc.)
- ✅ In-memory caching (30-min TTL)
- ✅ RTL support (pentru limbi RTL)
- ✅ User preference sync
- ✅ Search translations
- ✅ Bulk import/export

#### API Endpoints:
```
GET    /api/multilanguage/languages                - Toate limbile
GET    /api/multilanguage/translations/:lang       - Traduceri pentru limbă
POST   /api/multilanguage/translations/:lang/:key  - Creare/update traducere
DELETE /api/multilanguage/translations/:lang/:key  - Ștergere traducere
POST   /api/multilanguage/translations/bulk        - Import bulk traduceri
POST   /api/multilanguage/translations/cache/clear - Clear cache
POST   /api/multilanguage/user/preferred-language  - Setare limbă preferată
```

### 8.3 Metadata APIs
**Routes**: `/src/routes/metadata.routes.ts`

#### **Currencies (33 Total)**

**FIAT Currencies (15):**
- USD, EUR, GBP, RON, CAD
- AUD, JPY, CNY, INR, BRL
- MXN, ZAR, TRY, RUB, PLN

**Cryptocurrencies (18):**
- BTC, ETH, USDT, USDC, BNB
- DOGE, POL, LTC, SOL, TRX
- SHIB, TON, XMR, DAI, BCH
- NOT, DOGS, XRP

#### **Countries (150+)**
- ISO codes (code, code3)
- Phone codes
- Flags (emoji)
- Geo-blocking support
- Currency mapping

#### **Mobile Prefixes**
- Country-based prefixes
- Carrier information
- International dialing codes

#### API Endpoints:
```
GET    /api/metadata/currencies              - Toate valutele
GET    /api/metadata/currencies/fiat         - Doar FIAT
GET    /api/metadata/currencies/crypto       - Doar Crypto
GET    /api/metadata/currencies/:code        - Detalii valută
GET    /api/metadata/countries               - Toate țările
GET    /api/metadata/countries/:code         - Detalii țară
GET    /api/metadata/mobile-prefixes         - Toate prefixele
GET    /api/metadata/mobile-prefixes/:code   - Prefixe țară
```

### 8.4 CMS System
**Routes**: `/src/routes/api.ts` (CMS section)

#### **CMS Pages**

**Template-uri Disponibile:**
- `default` - Template standard
- `full_width` - Full width (fără sidebar)
- `sidebar_left` - Sidebar stânga
- `sidebar_right` - Sidebar dreapta
- `landing_page` - Landing page special

**Funcționalități:**
- ✅ Dynamic page creation
- ✅ SEO metadata (title, description, keywords)
- ✅ Draft/Published status
- ✅ Featured image support
- ✅ Content versioning
- ✅ Slug management

**API Endpoints:**
```
GET    /api/cms/pages                - Toate paginile
GET    /api/cms/pages/:slug          - Pagină după slug
POST   /api/cms/pages                - Creare pagină (Admin)
PUT    /api/cms/pages/:id            - Update pagină (Admin)
DELETE /api/cms/pages/:id            - Ștergere pagină (Admin)
POST   /api/cms/pages/:id/publish    - Publicare pagină (Admin)
```

#### **CMS Banners**

**Poziții Disponibile:**
- `homepage_hero` - Banner mare homepage
- `homepage_middle` - Banner mijloc homepage
- `sidebar` - Sidebar banner
- `footer` - Footer banner
- `modal` - Modal popup banner
- `games_page` - Pagina jocuri
- `promotions_page` - Pagina promoții

**Funcționalități:**
- ✅ Multiple positions
- ✅ Category-based targeting
- ✅ Click tracking
- ✅ A/B testing support
- ✅ Schedule (start/end date)
- ✅ Priority ordering
- ✅ Target URL

**API Endpoints:**
```
GET    /api/cms/banners              - Bannere active
GET    /api/cms/banners/:id          - Detalii banner
POST   /api/cms/banners              - Creare banner (Admin)
PUT    /api/cms/banners/:id          - Update banner (Admin)
DELETE /api/cms/banners/:id          - Ștergere banner (Admin)
POST   /api/cms/banners/:id/click    - Track click
```

### 8.5 IP Tracking & Security
**Middleware**: `/src/middlewares/ip-tracking.middleware.ts`

#### Funcționalități:
- ✅ Automatic IP logging pe toate request-urile
- ✅ Geo-location tracking
- ✅ Suspicious activity detection
- ✅ Blocked IP management
- ✅ Geo-restriction enforcement
- ✅ VPN detection (planned)
- ✅ Proxy detection
- ✅ Fraud pattern recognition

#### API Endpoints (Admin):
```
GET    /api/admin/ip-tracking/logs              - Toate log-urile IP
GET    /api/admin/ip-tracking/logs/user/:id     - Log-uri per utilizator
GET    /api/admin/ip-tracking/suspicious        - Activități suspecte
POST   /api/admin/ip-tracking/block/:ip         - Blocare IP
DELETE /api/admin/ip-tracking/block/:ip         - Deblocare IP
GET    /api/admin/ip-tracking/blocked           - IP-uri blocate
```

---

## 👨‍💼 9. ADMIN PANEL

### 9.1 Gestionare Utilizatori
**Controller**: `/src/api/admin/admin.controller.ts`

#### Funcționalități:
- ✅ Listare toți utilizatorii cu filtre avansate
- ✅ Update status utilizator (active, suspended, banned)
- ✅ Update balance manual
- ✅ Creare utilizator nou
- ✅ Vizualizare sesiuni utilizator
- ✅ Reset parolă
- ✅ Verificare KYC
- ✅ Istoric complet utilizator

#### API Endpoints:
```
GET    /api/admin/users                    - Toți utilizatorii
GET    /api/admin/users/:id                - Detalii utilizator
PUT    /api/admin/users/:id/status         - Update status
PUT    /api/admin/users/:id/balance        - Update balance
POST   /api/admin/users                    - Creare utilizator
GET    /api/admin/users/:id/sessions       - Sesiuni utilizator
POST   /api/admin/users/:id/reset-password - Reset parolă
GET    /api/admin/users/:id/history        - Istoric complet
```

### 9.2 Gestionare Jocuri (Admin)
**Service**: `/src/services/admin/admin.games.service.ts`

#### Funcționalități:
- ✅ Listare toate jocurile cu status
- ✅ Creare joc nou manual
- ✅ Update detalii joc (RTP, volatilitate, etc.)
- ✅ Ștergere joc
- ✅ Change game status (active/inactive)
- ✅ Bulk status update per categorie
- ✅ Import jocuri de la provider (Innova)
- ✅ Update RTP per joc
- ✅ Featured games management

#### API Endpoints:
```
GET    /api/admin/games                        - Toate jocurile
POST   /api/admin/games                        - Creare joc
PUT    /api/admin/games/:id                    - Update joc
DELETE /api/admin/games/:id                    - Ștergere joc
PUT    /api/admin/games/:id/status             - Change status
PUT    /api/admin/games/category/:cat/status   - Bulk status update
POST   /api/admin/games/import                 - Import de la provider
PUT    /api/admin/games/:id/rtp                - Update RTP
```

### 9.3 Gestionare Categorii
**Service**: `/src/services/admin/admin.category.service.ts`

#### API Endpoints:
```
GET    /api/admin/categories               - Toate categoriile
POST   /api/admin/categories               - Creare categorie
PUT    /api/admin/categories/:id           - Update categorie
DELETE /api/admin/categories/:id           - Ștergere categorie
GET    /api/admin/categories/stats         - Statistici categorii
```

### 9.4 Gestionare Provideri
**Service**: `/src/services/admin/admin.provider.service.ts`

#### API Endpoints:
```
GET    /api/admin/providers                - Toți providerii
POST   /api/admin/providers                - Adăugare provider
PUT    /api/admin/providers/:id            - Update provider
POST   /api/admin/providers/:id/activate   - Activare provider
GET    /api/admin/providers/:id/games      - Jocuri provider
```

### 9.5 Gestionare Tranzacții (Admin)

#### API Endpoints:
```
GET    /api/admin/transactions             - Toate tranzacțiile
GET    /api/admin/transactions/:id         - Detalii tranzacție
POST   /api/admin/transactions/:id/approve - Aprobare tranzacție
POST   /api/admin/transactions/:id/reject  - Respingere tranzacție
GET    /api/admin/transactions/suspicious  - Tranzacții suspecte
```

### 9.6 RTP (Return to Player) Management
**Service**: `/src/services/rtp/rtp.service.ts`

#### Funcționalități:
- ✅ RTP settings per joc
- ✅ RTP analytics & rapoarte
- ✅ Bulk RTP update
- ✅ Auto-adjustment based on targets
- ✅ RTP tracking în timp real

#### API Endpoints:
```
GET    /api/admin/rtp/settings             - RTP settings
PUT    /api/admin/rtp/settings             - Update RTP settings
GET    /api/admin/rtp/analytics            - RTP analytics
POST   /api/admin/rtp/bulk-update          - Bulk RTP update
GET    /api/admin/rtp/report               - RTP report
POST   /api/admin/rtp/auto-adjust          - Trigger auto-adjustment
```

### 9.7 Profit Control
**Service**: `/src/services/profit-control/profit-control.service.ts`

#### Funcționalități:
- ✅ Real-time profit tracking
- ✅ Auto RTP adjustment based on targets
- ✅ Daily/weekly/monthly profit reports
- ✅ Game-level profit analysis
- ✅ Provider-level profit analysis
- ✅ Automated alerts

#### Cron Job:
**Frecvență**: Daily at midnight
**Funcții**:
- Monitorizează RTP actual vs target
- Ajustează GGR filtering automat
- Generează rapoarte profit
- Trimite alerte admin

---

## 📊 10. CRM & SUPPORT

### 10.1 CRM Features
**Routes**: `/src/routes/crm.routes.ts`

#### Funcționalități:
- ✅ Player 360 View (profil complet jucător)
- ✅ Behavior analysis
- ✅ Segmentation (RFM, Custom)
- ✅ Churn prediction
- ✅ Lifecycle stage tracking
- ✅ Campaign targeting
- ✅ Personalization engine

#### API Endpoints:
```
GET    /api/admin/crm/player/:id           - Player 360 view
GET    /api/admin/crm/behavior             - Player behavior
GET    /api/admin/crm/segmentation         - Player segments
GET    /api/admin/crm/churn-prediction     - Churn analysis
GET    /api/admin/crm/lifecycle            - Lifecycle stages
```

### 10.2 Live Chat System
**Service**: `/src/services/chat/chat-socket.service.ts`

#### Funcționalități:
- ✅ Real-time messaging (Socket.IO)
- ✅ Support ticket creation din chat
- ✅ Chat history
- ✅ File attachments
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Agent assignment
- ✅ Canned responses

#### WebSocket Events:
```
chat:message       - Mesaj nou
chat:typing        - User typing
chat:read          - Mesaj citit
chat:agent-join    - Agent joined
chat:agent-leave   - Agent left
```

#### API Endpoints:
```
GET    /api/chat/conversations             - Conversații utilizator
POST   /api/chat/send                      - Trimitere mesaj
GET    /api/chat/history/:conversationId   - Istoric chat
POST   /api/chat/ticket                    - Creare ticket din chat
GET    /api/chat/agents                    - Agenți disponibili
```

### 10.3 Support Ticket System
**Routes**: `/src/routes/support-ticket.routes.ts`

#### Priority Levels:
- **LOW** - Prioritate scăzută
- **MEDIUM** - Prioritate medie
- **HIGH** - Prioritate ridicată
- **URGENT** - Urgent

#### Status-uri:
- **OPEN** - Deschis
- **ASSIGNED** - Asignat
- **IN_PROGRESS** - În lucru
- **WAITING_CUSTOMER** - Așteaptă răspuns client
- **RESOLVED** - Rezolvat
- **CLOSED** - Închis

#### API Endpoints:
```
POST   /api/support/tickets                - Creare ticket
GET    /api/support/tickets                - Ticket-urile mele
GET    /api/support/tickets/:id            - Detalii ticket
POST   /api/support/tickets/:id/reply      - Răspuns la ticket
PUT    /api/support/tickets/:id/close      - Închidere ticket
GET    /api/admin/support/tickets          - Toate ticket-urile (Admin)
PUT    /api/admin/support/tickets/:id/assign - Asignare agent (Admin)
```

### 10.4 Dashboard & Analytics
**Routes**: `/src/routes/dashboard.routes.ts`

#### Metrici Dashboard:
- Real-time player count
- Revenue analytics (daily, weekly, monthly)
- User analytics (registrations, active users)
- Game performance
- Transaction statistics
- Conversion rates
- Top games
- Top players

#### API Endpoints:
```
GET    /api/admin/dashboard/stats          - Statistici dashboard
GET    /api/admin/dashboard/realtime       - Date real-time
GET    /api/admin/dashboard/revenue        - Revenue analytics
GET    /api/admin/dashboard/users          - User analytics
GET    /api/admin/dashboard/games          - Game performance
GET    /api/admin/dashboard/transactions   - Transaction stats
```

---

## 📈 11. ADVANCED ANALYTICS

### 11.1 Player Behavior Analytics
**Controller**: `/src/api/admin/admin.analytics.controller.ts`

#### Funcționalități:
- ✅ Session tracking detaliată
- ✅ Event tracking (clicks, games played, etc.)
- ✅ Behavior scoring (engagement score)
- ✅ Top engaged players
- ✅ Session heatmap
- ✅ Path analysis
- ✅ Funnel analysis

#### API Endpoints:
```
GET    /api/admin/analytics/behavior              - Player behavior
POST   /api/admin/analytics/behavior/calculate    - Calculate scores
GET    /api/admin/analytics/engaged-players       - Top engaged
GET    /api/admin/analytics/session-heatmap       - Session heatmap
GET    /api/admin/analytics/funnel                - Funnel analysis
```

### 11.2 RFM Segmentation
**Service**: `/src/services/segmentation/segmentationService.ts`

#### Segmente RFM:
- **Champions** - High value, recent, frequent
- **Loyal Customers** - Loyal, high frequency
- **Potential Loyalists** - Recent, good frequency
- **At Risk** - Was valuable, not recent
- **Can't Lose Them** - High value, long time ago
- **Hibernating** - Low value, long time ago
- **About to Sleep** - Below average, recent
- **Lost** - Lowest scores

#### API Endpoints:
```
GET    /api/admin/analytics/rfm/segments          - RFM segments
GET    /api/admin/analytics/rfm/users/:segment    - Utilizatori per segment
POST   /api/admin/analytics/rfm/recalculate       - Recalculare RFM
GET    /api/admin/analytics/rfm/stats             - Statistici RFM
```

### 11.3 Churn Prediction

#### Funcționalități:
- ✅ Churn probability scoring
- ✅ High-risk user identification
- ✅ Retention campaigns
- ✅ Win-back campaigns
- ✅ Predictive analytics

#### API Endpoints:
```
GET    /api/admin/analytics/churn/prediction      - Churn prediction
GET    /api/admin/analytics/churn/high-risk       - Utilizatori high-risk
GET    /api/admin/analytics/churn/statistics      - Churn statistics
POST   /api/admin/analytics/churn/campaign        - Campaign retention
```

---

## 📢 12. CAMPAIGN MANAGEMENT

### 12.1 Free Spins Campaigns
**Service**: `/src/services/campaigns/CampaignsService.ts`

#### Funcționalități:
- ✅ Bulk free spins distribution
- ✅ Campaign targeting (segments, countries, VIP levels)
- ✅ Eligibility rules
- ✅ Expiration management
- ✅ Usage tracking
- ✅ Performance analytics

#### API Endpoints:
```
GET    /api/campaigns                      - Toate campaniile
POST   /api/campaigns                      - Creare campanie (Admin)
POST   /api/campaigns/:id/distribute       - Distribuire free spins (Admin)
GET    /api/campaigns/:id/stats            - Statistici campanie
GET    /api/campaigns/:id/users            - Utilizatori eligibili
```

### 12.2 Innova SDK Integration
**Service**: `/src/services/innova/innova-campaigns.service.ts`
**Routes**: `/src/routes/innova-webhooks.routes.ts`

#### Innova Features:
- ✅ Campaigns (Innova managed)
- ✅ Jackpots (Innova network)
- ✅ Tournaments (Innova network)
- ✅ Widget authentication

#### Credențiale Innova:
- **Operator ID**: `thinkcode`
- **Secret Key**: `2aZWQ93V8aT1sKrA`
- **API Host**: `https://ttlive.me`
- **Backoffice**: https://backoffice.timelesstech.org/login
- **Username**: `thinkcode_bo`
- **Password**: `39ByzDV3`

#### API Endpoints:
```
POST   /api/innova/webhooks/campaign       - Campaign webhook
POST   /api/innova/webhooks/jackpot        - Jackpot webhook
POST   /api/innova/webhooks/tournament     - Tournament webhook
POST   /api/widget-auth/generate           - Generate widget key
GET    /api/innova/campaigns               - Innova campaigns
GET    /api/innova/jackpots                - Innova jackpots
```

---

## 📋 13. REPORTING SYSTEM

### 13.1 Reports
**Service**: `/src/services/reports/ReportsService.ts`
**Routes**: `/src/routes/reports.routes.ts`

#### Tipuri Rapoarte:
- **Revenue reports** - Venituri (daily, weekly, monthly, custom)
- **Player reports** - Jucători (new, active, churn)
- **Game performance reports** - Performance jocuri
- **Transaction reports** - Tranzacții (deposits, withdrawals, bets)
- **KYC compliance reports** - Compliance KYC
- **Bonus reports** - Bonusuri (claimed, wagered, converted)
- **Affiliate reports** - Afiliați (referrals, commissions)

#### API Endpoints:
```
GET    /api/reports/revenue                - Revenue report
GET    /api/reports/players                - Player report
GET    /api/reports/games                  - Game report
GET    /api/reports/transactions           - Transaction report
GET    /api/reports/kyc                    - KYC report
GET    /api/reports/bonuses                - Bonus report
GET    /api/reports/affiliates             - Affiliate report
POST   /api/reports/custom                 - Custom report
GET    /api/reports/export/:id             - Export report (CSV/PDF)
```

---

## 🛡️ 14. RISK MANAGEMENT

### 14.1 Risk Management System
**Service**: `/src/services/risk/RiskManagementService.ts`
**Routes**: `/src/routes/risk-management.routes.ts`

#### Funcționalități:
- ✅ Fraud detection
- ✅ Risk scoring per utilizator
- ✅ Transaction monitoring
- ✅ Suspicious activity alerts
- ✅ AML (Anti-Money Laundering) checks
- ✅ Pattern recognition
- ✅ Velocity checks
- ✅ Blacklist management

#### Risk Factors:
- Multiple accounts same IP
- Unusual betting patterns
- High-value transactions
- Rapid deposit/withdrawal cycles
- VPN/Proxy usage
- Country mismatches
- Failed KYC attempts

#### API Endpoints:
```
GET    /api/risk/alerts                    - Risk alerts
GET    /api/risk/users/high-risk           - High-risk users
POST   /api/risk/users/:id/review          - Review utilizator
GET    /api/risk/transactions/suspicious   - Tranzacții suspecte
POST   /api/risk/rules                     - Creare regulă risk (Admin)
GET    /api/risk/patterns                  - Fraud patterns
```

---

## 🔍 15. KYC (Know Your Customer) SYSTEM

### 15.1 KYC Management
**Controller**: `/src/api/admin/admin.kyc.controller.ts`
**Service**: `/src/services/kyc/kyc.service.ts`

#### Document Types:
- **Passport** - Pașaport
- **National ID** - Carte identitate
- **Driver's License** - Permis conducere
- **Utility Bill** - Factură utilități (adresă)
- **Bank Statement** - Extras cont bancar

#### Verification Levels:
- **Level 0**: Unverified (basic registration, deposit limit 100 EUR)
- **Level 1**: Basic verification (ID only, deposit limit 1000 EUR)
- **Level 2**: Full verification (ID + Address, no limits)

#### Status-uri KYC:
- **PENDING** - În așteptare
- **APPROVED** - Aprobat
- **REJECTED** - Respins
- **EXPIRED** - Expirat
- **RESUBMITTED** - Re-submitted

#### API Endpoints:
```
GET    /api/admin/kyc/pending              - KYC-uri pendente
GET    /api/admin/kyc/user/:id             - KYC utilizator
POST   /api/admin/kyc/approve              - Aprobare KYC
POST   /api/admin/kyc/reject               - Respingere KYC
GET    /api/admin/kyc/documents            - Toate documentele KYC
POST   /api/admin/kyc/risk-assessment      - Risk assessment
GET    /api/kyc/my-documents               - Documentele mele (User)
POST   /api/kyc/upload                     - Upload document (User)
```

---

## 🔔 16. NOTIFICATION SYSTEM

### 16.1 Notification Service
**Routes**: `/src/routes/notification.routes.ts`

#### Tipuri Notificări:
- **SYSTEM** - Notificări sistem
- **PROMOTIONAL** - Promoții
- **TRANSACTION** - Tranzacții
- **KYC** - Status KYC
- **BONUS** - Bonusuri
- **WITHDRAWAL** - Retrageri
- **SECURITY** - Securitate

#### Canale Delivery:
- In-app notifications (real-time)
- Email notifications
- Push notifications (planned)
- SMS notifications (planned)

#### API Endpoints:
```
GET    /api/notifications                  - Notificările mele
PUT    /api/notifications/:id/read         - Marchează citit
PUT    /api/notifications/read-all         - Marchează toate citite
DELETE /api/notifications/:id              - Ștergere notificare
GET    /api/notifications/unread-count     - Număr necitite
POST   /api/admin/notifications/send       - Trimitere notificare (Admin)
POST   /api/admin/notifications/broadcast  - Broadcast (Admin)
```

---

## ⚙️ 17. SETTINGS & CONFIGURATION

### 17.1 System Settings
**Service**: `/src/services/settings/settings.service.ts`
**Routes**: `/src/routes/settings.routes.ts`

#### Categorii Settings:
- **General settings** - Setări generale (site name, logo, etc.)
- **Payment settings** - Setări plăți (min/max, fees)
- **Game settings** - Setări jocuri (RTP targets, etc.)
- **Bonus settings** - Setări bonusuri (wagering requirements)
- **Email settings** - Setări email (SMTP, templates)
- **Security settings** - Setări securitate (2FA, session timeout)
- **Withdrawal settings** - Setări retrageri (limits, auto-approve)

#### API Endpoints:
```
GET    /api/settings                       - Toate setările
PUT    /api/settings                       - Update setări (Admin)
GET    /api/settings/:key                  - Setting specific
PUT    /api/settings/:key                  - Update setting specific (Admin)
```

---

## 🧩 18. MODULE SYSTEM

### 18.1 Admin Modules
**Service**: `/src/services/admin-modules/admin-modules.service.ts`
**Routes**: `/src/routes/admin-modules.routes.ts`

#### Funcționalități:
- ✅ Dynamic module loading
- ✅ Module permissions
- ✅ Module hierarchy (parent/child)
- ✅ Feature toggles
- ✅ Role-based module access

#### API Endpoints:
```
GET    /api/admin-modules                  - Toate modulele
POST   /api/admin-modules                  - Creare modul (Admin)
PUT    /api/admin-modules/:id              - Update modul (Admin)
DELETE /api/admin-modules/:id              - Ștergere modul (Admin)
GET    /api/admin-modules/hierarchy        - Arbore module
PUT    /api/admin-modules/:id/toggle       - Toggle modul (Admin)
```

---

## 🗄️ 19. STRUCTURĂ DATABASE

### 19.1 PostgreSQL Tables (60+ Tables)

#### **Core Tables:**
```
users                     - Conturi utilizatori
user_profiles            - Profiluri extinse
user_balances            - Balance-uri (main, bonus, locked)
user_roles               - Asignări roluri
roles                    - Roluri disponibile
statuses                 - Status-uri cu permisiuni
tokens                   - Token-uri autentificare
sessions                 - Sesiuni utilizatori
```

#### **Game Tables:**
```
games                    - Catalog jocuri
game_categories          - Categorii jocuri
game_providers           - Provideri jocuri
bets                     - Înregistrări pariuri
transactions             - Tranzacții financiare
game_sessions            - Sesiuni joc
favorite_games           - Jocuri favorite
```

#### **Financial Tables:**
```
payment_gateways         - Configurații gateway-uri
deposits                 - Înregistrări depuneri
withdrawals              - Înregistrări retrageri
withdrawal_settings      - Configurație retrageri
transaction_fees         - Taxe tranzacții
```

#### **Promotion Tables:**
```
promotions               - Definiții promoții
user_promotions          - Claim-uri promoții utilizatori
free_spins               - Înregistrări free spins
bonus_wallet             - Wallet bonusuri
wagering_progress        - Progress wagering
```

#### **Affiliate Tables:**
```
affiliates               - Conturi afiliați
affiliate_referrals      - Tracking referral-uri
affiliate_commissions    - Înregistrări comisioane
affiliate_tiers          - Niveluri comisioane
```

#### **Enterprise Tables:**
```
deposit_limits           - Configurații limite depunere
deposit_limit_history    - Audit schimbări limite
self_exclusions          - Înregistrări auto-excludere
languages                - Limbi suportate
translation_keys         - Chei traducere
translation_values       - Traduceri
currencies               - Definiții valute
countries                - Date țări
mobile_prefixes          - Prefixe telefonice
```

#### **CMS Tables:**
```
cms_pages                - Pagini dinamice
cms_components           - Componente refolosibile
banners                  - Bannere promoționale
banner_clicks            - Click-uri bannere
```

#### **Analytics Tables:**
```
user_activities          - Tracking activitate
user_sessions            - Tracking sesiuni
player_behavior_scores   - Analytics comportament
rfm_segments             - Segmentare RFM
churn_predictions        - Predicții churn
```

#### **KYC Tables:**
```
kyc_documents            - Upload-uri documente KYC
kyc_verifications        - Înregistrări verificări
risk_assessments         - Analize risc
```

#### **Support Tables:**
```
support_tickets          - Ticket-uri suport
support_messages         - Mesaje ticket-uri
notifications            - Notificări utilizatori
chat_conversations       - Conversații chat
chat_messages            - Mesaje chat
```

#### **Campaign Tables:**
```
campaigns                - Campanii marketing
tournaments              - Definiții turnee
tournament_instances     - Rulări turnee
jackpot_schedules        - Configurații jackpot
jackpot_instances        - Rulări jackpot
jackpot_contributions    - Contribuții jackpot
jackpot_winners          - Câștigători jackpot
```

---

## ⏰ 20. BACKGROUND JOBS & CRON SERVICES

### 20.1 Cron Manager
**Service**: `/src/services/cron/cron-manager.service.ts`

#### Active Cron Jobs:

**1. RTP Auto-Adjustment** (Daily at midnight)
- Monitorizează RTP actual vs target
- Ajustează GGR filtering
- Generează rapoarte profit

**2. Daily Summary** (Daily at 23:59)
- Agregează statistici zilnice
- Generează rapoarte
- Trimite notificări admin

**3. Withdrawal Processing** (Every 15 minutes)
- Procesează retrageri pendente
- Auto-aprobare retrageri eligibile
- Integrare payment gateways

**4. Session Cleanup** (Hourly)
- Expirează sesiuni vechi
- Curăță token-uri inactive

**5. Deposit Limit Reset** (Daily at midnight)
- Reset limite zilnice
- Reset limite săptămânale (Luni)
- Reset limite lunare (1 a lunii)

### 20.2 Enterprise Cron Service
**Service**: `/src/services/cron/enterprise-cron.service.ts`

#### Additional Jobs:

**6. Tournament Management** (Every 5 minutes)
- Start turnee programate
- Finalizare turnee expirate
- Distribuire premii

**7. Jackpot Distribution** (Every minute)
- Verificare condiții trigger
- Distribuire jackpot-uri
- Notificări câștigători

**8. Loyalty Points Calculation** (Hourly)
- Calculare puncte loialitate
- Update nivele utilizatori
- Distribuire beneficii VIP

**9. Churn Prediction Updates** (Daily at 3 AM)
- Recalculare scoruri churn
- Identificare utilizatori high-risk
- Trigger campanii retention

**10. RFM Recalculation** (Weekly on Sunday)
- Recalculare segmente RFM
- Update segmentare utilizatori
- Generare rapoarte segmentare

---

## 🔗 21. INTEGRĂRI THIRD-PARTY

### 21.1 Game Provider - Innova Gaming
**Documentație**: `INNOVA_INTEGRATION_COMPLETE.md`

- **API Key**: `thinkcode`
- **Secret Key**: `2aZWQ93V8aT1sKrA`
- **Game List API**: `https://air.gameprovider.org/api/generic/games/list/all`
- **Launch Host**: `https://gamerun-eu.gaminguniverse.fun`
- **Pragmatic Launch**: `https://run.games378.com`
- **Callback URL**: `https://backend.jackpotx.net/api/innova/`

**Funcționalități:**
- Lista jocuri (1000+ jocuri)
- Launch jocuri (demo & real money)
- Balance callbacks
- Win/loss processing
- Refund handling
- Tournament integration
- Jackpot integration

### 21.2 Sportsbook - IGPX
**Documentație**: Disponibilă în cod

- **API URL**: `https://sp-int-9cr.6579883.com`
- **Username**: `jackpotx`
- **Password**: `NwFhr_KsyqpJwi62_Bc`
- **Security Hash**: `737e36e0-6d0b-4a67-aa50-2c448fe319f3`

**Funcționalități:**
- Bet placement
- Odds retrieval
- Live betting
- Settlement
- Statistics

### 21.3 Payment Gateways

**Stripe**
- Card payments (Visa, Mastercard, Amex)
- 3D Secure support
- Webhook handling
- Refund support

**PayPal**
- Digital wallet
- Express checkout
- Recurring payments
- Dispute handling

**Razorpay**
- Indian market focus
- UPI support
- Net banking
- Wallet support

**OxaPay**
- 18 Cryptocurrencies
- Instant confirmations
- Low fees
- Merchant dashboard

### 21.4 Other Integrations

**Socket.IO**
- Real-time communication
- Chat system
- Live updates
- Presence detection

**Redis (Optional)**
- Session storage
- Caching layer
- Real-time data
- Pub/Sub messaging

**Cloudflare**
- CDN
- DDoS protection
- Rate limiting
- Analytics
- Bot protection

**Swagger**
- API documentation
- Interactive testing
- Schema validation
- Code generation

---

## 🔒 22. SECURITY FEATURES

### 22.1 Authentication
- ✅ JWT-based authentication (Access + Refresh tokens)
- ✅ Refresh token rotation
- ✅ 2FA support (TOTP - Google Authenticator compatible)
- ✅ Session management cu expirare
- ✅ Device tracking
- ✅ Logout from all devices
- ✅ Password hashing (bcrypt)
- ✅ CAPTCHA protection

### 22.2 Rate Limiting
**Config**: Setări în `.env`

Limite curente (Unlimited în development):
- Standard rate limit: 999999 requests/15min
- Strict rate limit: 999999 requests/1min
- Provider callback limit: 999999 requests/1min
- Auth endpoint limit: 999999 requests/15min
- Cloudflare integration activă
- Circuit breaker pattern

### 22.3 Security Middleware
- ✅ **Helmet**: Security headers (CSP, HSTS, XSS protection)
- ✅ **CORS**: Protection cu whitelist
- ✅ **Input validation**: Zod schemas
- ✅ **SQL injection prevention**: Parameterized queries
- ✅ **XSS protection**: HTML sanitization
- ✅ **CSRF protection**: Token-based (planned)

### 22.4 IP Security
- ✅ IP tracking & logging automat
- ✅ Geo-blocking support
- ✅ Suspicious activity detection
- ✅ IP blacklisting
- ✅ VPN detection (planned)
- ✅ Proxy detection
- ✅ Rate limiting per IP

---

## 🏥 23. MONITORING & HEALTH CHECKS

### 23.1 Health Endpoints

#### API Endpoints:
```
GET    /health                 - Basic health status
GET    /health/detailed        - Detailed system metrics
GET    /health/cloudflare      - Cloudflare metrics
```

### 23.2 Health Monitor Service
**Service**: `/src/services/health/health-monitor.service.ts`

#### Metrici Tracked:
- Request count (total requests procesate)
- Response times (average, p95, p99)
- Error rates (4xx, 5xx)
- Database connection status
- Memory usage (RSS, heap)
- CPU usage
- Active sessions
- Cloudflare requests
- Circuit breaker status
- System uptime

#### Alerts:
- High error rate (>5%)
- High memory usage (>90%)
- Database connection lost
- High response times (>1s average)
- Circuit breaker open

---

## 📚 24. API DOCUMENTATION

### 24.1 Swagger Documentation
**URL**: https://backend.jackpotx.net/api-docs
**Password**: `qwer1234`

#### Features:
- ✅ Comprehensive API documentation (200+ endpoints)
- ✅ Interactive API testing (Try it out)
- ✅ Request/response schemas (JSON examples)
- ✅ Authentication flow examples
- ✅ Error code documentation
- ✅ Filtrable by tags (User, Admin, Games, Payments, etc.)
- ✅ Export to OpenAPI 3.0 JSON/YAML

---

## 🎯 25. SPECIAL FEATURES

### 25.1 GGR Filtering
**Service**: `/src/services/ggr/ggr-filter.service.ts`

#### Funcționalități:
- ✅ Adjustable GGR percentage (default: 50%)
- ✅ Tolerance threshold (default: 5%)
- ✅ Win filtering pentru profit control
- ✅ Audit logging complet
- ✅ Real-time reporting
- ✅ Per-game configuration
- ✅ Per-provider configuration

**Cum funcționează:**
- Când un jucător câștigă, sistemul verifică GGR actual
- Dacă GGR < target, sistemul poate "filtra" câștigul (reduce suma)
- Filtrarea se aplică transparent în callback-ul providerului
- Toate filtrările sunt loggate pentru audit

### 25.2 Profit Control
**Service**: `/src/services/profit-control/profit-control.service.ts`

#### Funcționalități:
- ✅ Real-time profit tracking
- ✅ Target profit monitoring (ex: 20% GGR)
- ✅ Auto-adjustment triggers
- ✅ Performance analytics
- ✅ Provider-level analysis
- ✅ Game-level analysis
- ✅ Automated alerts când profit < target

### 25.3 Balance Consistency
**Service**: `/src/services/balance/balance-consistency.service.ts`

#### Funcționalități:
- ✅ Unified wallet system
- ✅ Category balances (Casino, Sports, Poker)
- ✅ Balance transfer între categorii
- ✅ Transaction integrity checks
- ✅ Automatic reconciliation
- ✅ Balance audit trail
- ✅ Discrepancy detection & resolution

### 25.4 Idempotency
**Service**: Integrat în payment & transaction services

#### Funcționalități:
- ✅ Duplicate transaction detection (external_ref)
- ✅ Retry safety (same request = same result)
- ✅ State consistency
- ✅ Race condition prevention
- ✅ Idempotent callbacks

---

## 📄 26. FIȘIERE DOCUMENTAȚIE

### Documentații disponibile în `/var/www/html/backend.jackpotx.net/`:

1. **README.md** - Project overview
2. **ENTERPRISE_FEATURES_SUMMARY.md** - Enterprise features overview
3. **DEVELOPER_INTEGRATION_GUIDE.md** - Integration guide pentru frontend/admin
4. **admin-api-documentation.md** - Admin API documentation
5. **USER_API_DOCUMENTATION.md** - User API documentation
6. **ADMIN_AND_BET_API_DOCUMENTATION.md** - Betting API docs
7. **PAYMENT_GATEWAY_README.md** - Payment gateway integration
8. **NOTIFICATION_SYSTEM_README.md** - Notification system guide
9. **AFFILIATE_SYSTEM_GUIDE.md** - Affiliate system guide
10. **WITHDRAWAL_SYSTEM_IMPLEMENTATION.md** - Withdrawal implementation
11. **JXORIGINALS_README.md** - Internal games documentation
12. **INNOVA_INTEGRATION_COMPLETE.md** - Innova integration complete
13. **FunctionalitatiCore.md** - Acest document (toate funcționalitățile)

---

## 📊 27. DEPLOYMENT INFORMATION

### 27.1 Production Configuration
- **Environment**: Production
- **Port**: 3004
- **Node.js Version**: v20.19.5
- **TypeScript Version**: ^5.x
- **Process Manager**: PM2 (pm2 start dist/index.js --name backend)
- **Proxy**: Nginx (reverse proxy la Cloudflare)
- **SSL**: Cloudflare SSL
- **Domain**: https://backend.jackpotx.net

### 27.2 Locații Fișiere
- **Source Code**: `/var/www/html/backend.jackpotx.net/src/`
- **Compiled Code**: `/var/www/html/backend.jackpotx.net/dist/`
- **Logs**: PM2 logs (`pm2 logs backend`)
- **Uploads**: `/var/www/html/backend.jackpotx.net/uploads/`
- **JxOriginals Games**: `/var/www/html/backend.jackpotx.net/JxOriginalGames/`

### 27.3 Environment Variables
**Fișier**: `.env` (61+ variabile)

**Categorii principale:**
- Server (PORT, NODE_ENV, HOST)
- Database (PostgreSQL, MongoDB)
- JWT (Access & Refresh secrets)
- Game Provider (Innova credentials)
- Payment Gateways (API keys)
- Sportsbook (IGPX credentials)
- Rate Limiting (configurare limite)
- Email (SMTP settings - planned)
- Swagger (password protection)

---

## 🎉 28. REZUMAT FUNCȚIONALITĂȚI

### **Sisteme Core (7)**
1. ✅ Autentificare & Autorizare (JWT, 2FA, Role-based)
2. ✅ Gestionare Profil Utilizator (Extended profiles, KYC, preferințe)
3. ✅ Management Jocuri (Catalog, provideri, categorii, favorite)
4. ✅ Sistem Pariuri (Place bets, process results, history)
5. ✅ Procesare Plăți (Deposits, withdrawals, multiple gateways)
6. ✅ Management Tranzacții (Comprehensive transaction tracking)
7. ✅ Management Balance (Unified wallet, category balances)

### **Admin Features (12)**
8. ✅ Gestionare Utilizatori (CRUD, status, balance adjustments)
9. ✅ Administrare Jocuri (Import, manage, status control)
10. ✅ Management Categorii (Create, organize, statistics)
11. ✅ Management Provideri (Configure, activate, monitor)
12. ✅ Review Tranzacții (Approve, reject, audit)
13. ✅ Control RTP (Manual & automatic adjustment)
14. ✅ Control Profit (Target monitoring, auto-adjustment)
15. ✅ Management KYC (Approve, reject, risk assessment)
16. ✅ Management Promoții (Create, manage, track claims)
17. ✅ Management Afiliați (Approve, commissions, tracking)
18. ✅ Dashboard & Analytics (Real-time stats, reports)
19. ✅ System Settings (Configure all parameters)

### **Player Engagement (9)**
20. ✅ Sistem Promoții (Welcome, deposit bonus, free spins, cashback)
21. ✅ Program Afiliați (Multi-level referrals, commission tracking)
22. ✅ Sistem Loialitate (Points, levels, rewards, VIP tiers)
23. ✅ Sistem Turnee (Leaderboards, prizes, scheduling)
24. ✅ Sistem Jackpot (Progressive, fixed, daily jackpots)
25. ✅ Sistem Challenges (Daily, weekly challenges, achievements)
26. ✅ Mini Games (Wheel, scratch cards, dice, coin flip)
27. ✅ Personal Jackpots (User-specific rewards)
28. ✅ Daily Spin (Free daily bonuses)

### **Enterprise & Compliance (7)**
29. ✅ Responsible Gaming (Deposit limits, self-exclusion)
30. ✅ Suport Multilanguage (10 limbi, full translation)
31. ✅ Suport Multi-Currency (33 currencies: FIAT + Crypto)
32. ✅ Metadata APIs (Countries, currencies, mobile prefixes)
33. ✅ CMS System (Dynamic pages, banners, content management)
34. ✅ IP Tracking & Security (Geo-blocking, fraud detection)
35. ✅ Risk Management (AML, fraud detection, suspicious activity)

### **Communication & Support (4)**
36. ✅ Live Chat System (Real-time Socket.IO chat)
37. ✅ Support Ticket System (Create, track, respond)
38. ✅ Notification System (In-app, email notifications)
39. ✅ Email Templates (Transactional, promotional emails)

### **Analytics & Intelligence (6)**
40. ✅ Player Behavior Analytics (Session tracking, scoring)
41. ✅ RFM Segmentation (Customer value analysis)
42. ✅ Churn Prediction (Retention analytics)
43. ✅ Campaign Management (Free spins, targeted campaigns)
44. ✅ Reporting System (Revenue, players, games, transactions)
45. ✅ Dashboard Metrics (Real-time KPIs, statistics)

### **Advanced Features (9)**
46. ✅ WebSocket Support (Real-time updates, chat)
47. ✅ Background Jobs (10 cron jobs pentru automation)
48. ✅ Health Monitoring (System health, performance metrics)
49. ✅ GGR Filtering (Profit control mechanism)
50. ✅ Balance Consistency (Automatic reconciliation)
51. ✅ Idempotency (Duplicate transaction prevention)
52. ✅ Provider Callbacks (Innova, ISoftBet integration)
53. ✅ Widget Authentication (Innova SDK integration)
54. ✅ Proxy Support (IP masking pentru jocuri)

### **Integrări Third-Party (7)**
55. ✅ Innova Gaming API (Main game provider - 1000+ games)
56. ✅ JxOriginals (Internal game platform cu cod sursă)
57. ✅ IGPX Sportsbook API (Sports betting)
58. ✅ OxaPay (Cryptocurrency payments - 18 coins)
59. ✅ Stripe (Card payments)
60. ✅ PayPal (Digital wallet payments)
61. ✅ Razorpay (Indian market payments)

---

## 🏁 CONCLUZIE

**JackpotX Backend** este o platformă casino **enterprise-grade** completă cu:

- ✅ **200+ API endpoints** acoperind toate operațiunile casino
- ✅ **60+ tabele database** cu relații complexe
- ✅ **78+ fișiere service** handling business logic
- ✅ **44 module route** organizând structura API
- ✅ **26 controllers** managing request handling
- ✅ **Integrare completă** cu game providers, payment gateways, third-party services
- ✅ **Enterprise compliance features** (Responsible Gaming, KYC, AML, Risk Management)
- ✅ **Advanced analytics** (Player segmentation, behavior tracking, churn prediction)
- ✅ **Real-time features** via WebSocket (chat, live updates)
- ✅ **Background automation** (10 cron jobs pentru RTP, withdrawals, maintenance)
- ✅ **Multi-level security** (JWT, 2FA, rate limiting, IP tracking)
- ✅ **Comprehensive documentation** via Swagger & markdown files

**Status**: ✅ **PRODUCTION-READY** și deployed la `https://backend.jackpotx.net`

**Servește**:
- 🎰 **Player Website**: https://jackpotx.net
- 👨‍💼 **Admin Panel**: https://admin.jackpotx.net

**Performance**:
- Server: Running on PM2 (Port 3004)
- Database: PostgreSQL (60+ tables) + MongoDB (analytics)
- Uptime: 99.9%+ target
- Response Time: <100ms average

---

**Document generat**: 2025-01-13
**Versiune Backend**: 1.0.0
**Ultima actualizare**: 2025-01-13
