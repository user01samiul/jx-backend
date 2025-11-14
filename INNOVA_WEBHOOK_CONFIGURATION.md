# Innova TimelessTech - Webhook Configuration Guide

## Configurare finalizată pe JackpotX ✅

Data: 2025-11-09
Status: **TOTUL PERFECT FUNCȚIONAL**

---

## 🎯 Ce trebuie configurat în Innova Backoffice

Trebuie să accesezi Innova Backoffice și să configurezi webhook-urile pentru ca Innova să trimită jackpot-uri și turnee către platforma noastră.

### Credentials Innova Backoffice
- **URL**: https://backoffice.timelesstech.org/login
- **Username**: `thinkcode_bo`
- **Password**: `39ByzDV3`
- **Operator ID**: `thinkcode`
- **Secret Key**: `2aZWQ93V8aT1sKrA`

---

## 📡 Webhook URLs pentru Innova

Configurează următoarele URL-uri în Innova Backoffice:

### 1. Jackpot Webhook
**URL**: `https://backend.jackpotx.net/api/innova/webhooks/jackpot`
**Method**: POST
**Content-Type**: application/json

**Events to send**:
- `NEW_INSTANCE` - Când Innova creează un jackpot nou
- `UPDATE_SIZE` - Când suma jackpot-ului crește
- `INSTANCE_WIN` - Când un jucător câștigă jackpot-ul

### 2. Tournament Webhook
**URL**: `https://backend.jackpotx.net/api/innova/webhooks/tournament`
**Method**: POST
**Content-Type**: application/json

**Events to send**:
- `NEW_INSTANCE` - Când Innova creează un turneu nou
- `UPDATE_STATUS` - Când statusul turneului se schimbă (PENDING → ACTIVE → FINISHED)

---

## 🧪 Testare Webhooks (Deja Testate ✅)

Toate webhook-urile au fost testate și funcționează perfect:

### Test 1: Jackpot NEW_INSTANCE ✅
```bash
curl -X POST "https://backend.jackpotx.net/api/innova/webhooks/jackpot" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "NEW_INSTANCE",
    "data": {
      "id": "jackpot-instance-123",
      "jackpot": "jackpot-schedule-001",
      "name": "Mega Jackpot",
      "size": 10000.00,
      "seed": 5000.00,
      "currency": "USD",
      "timestamp": "2025-11-09T15:30:00Z"
    }
  }'
```

**Rezultat**: Jackpot creat în database ✅

### Test 2: Jackpot UPDATE_SIZE ✅
```bash
curl -X POST "https://backend.jackpotx.net/api/innova/webhooks/jackpot" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "UPDATE_SIZE",
    "data": {
      "id": "jackpot-instance-123",
      "size": 12500.00,
      "progress": 75,
      "timestamp": "2025-11-09T16:00:00Z"
    }
  }'
```

**Rezultat**: Suma actualizată în database ✅

### Test 3: Jackpot INSTANCE_WIN ✅
```bash
curl -X POST "https://backend.jackpotx.net/api/innova/webhooks/jackpot" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "INSTANCE_WIN",
    "data": {
      "id": "jackpot-instance-123",
      "name": "Mega Jackpot",
      "size": 12500.00,
      "currency": "USD",
      "winner_entity": 72,
      "winner": "alexdemo",
      "timestamp": "2025-11-09T16:15:00Z"
    }
  }'
```

**Rezultat**: Câștigător înregistrat, instance marcat FINISHED ✅

### Test 4: Tournament NEW_INSTANCE ✅
```bash
curl -X POST "https://backend.jackpotx.net/api/innova/webhooks/tournament" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "NEW_INSTANCE",
    "data": {
      "id": "tournament-instance-001",
      "tournament": "tournament-schedule-001",
      "name": "Weekly Slots Tournament",
      "currency": "USD",
      "status": "PENDING",
      "start": "2025-11-10T00:00:00Z",
      "end": "2025-11-17T23:59:59Z",
      "timestamp": "2025-11-09T17:00:00Z"
    }
  }'
```

**Rezultat**: Turneu creat cu status PENDING ✅

### Test 5: Tournament UPDATE_STATUS ✅
```bash
curl -X POST "https://backend.jackpotx.net/api/innova/webhooks/tournament" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "UPDATE_STATUS",
    "data": {
      "id": "tournament-instance-001",
      "status": "ACTIVE",
      "previousStatus": "PENDING",
      "timestamp": "2025-11-10T00:00:00Z"
    }
  }'
```

**Rezultat**: Status actualizat la ACTIVE ✅

---

## 🔍 Verificare Funcționalitate

### 1. API Endpoints (Public)
```bash
# Jackpot-uri active
curl https://backend.jackpotx.net/api/jackpots/active

# Turnee active
curl https://backend.jackpotx.net/api/tournaments/active

# Istoric câștiguri jackpot
curl https://backend.jackpotx.net/api/jackpots/history
```

### 2. Frontend Widgets
- **Homepage**: https://jackpotx.net
- **Jackpot Widget**: Afișează "Coming Soon" până când Innova trimite date
- **Tournament Widget**: Afișează "Coming Soon" până când Innova trimite date

### 3. Backend Logs
```bash
# Monitorizare webhooks în timp real
sudo -u ubuntu pm2 logs backend --lines 50 | grep -i "INNOVA"
```

---

## 💰 Integrare cu Wallet System

### Fluxul complet:
1. **Jucătorul depune** → Balance crește în `user_balances`
2. **Jucătorul pariază** → Bet deducted from balance
3. **Innova trimite INSTANCE_WIN** → Înregistrat în `jackpot_winners`
4. **Innova trimite changebalance** → POST `/api/innova/changebalance`
5. **Backend crediteză wallet** → Balance crește în `user_balances`
6. **Tranzacție înregistrată** → INSERT în `transactions` cu game_id=400/403

### Game IDs pentru Innova
- **62903** (code: 400) - Innova Jackpot - DROPWIN
- **62904** (code: 401) - Innova Tournament
- **62905** (code: 402) - Innova Mission
- **62906** (code: 403) - Innova Jackpot - CASINO/HAPPYHOUR

---

## 📊 Database Tables

Toate tabelele create și funcționale:

### Jackpots
- `jackpot_schedules` - Programul jackpot-urilor (trimise de Innova)
- `jackpot_instances` - Instanțe active de jackpot
- `jackpot_winners` - Istoric câștigători
- `jackpot_contributions` - Contribuții la jackpot

### Tournaments
- `tournament_schedules` - Programul turneelor (trimise de Innova)
- `tournament_instances` - Instanțe active de turneu
- `tournament_players` - Jucători participanți
- `tournament_games` - Jocuri eligibile

### Campaigns
- `campaigns` - Free spins campaigns
- `campaign_activations` - Activări campanii per jucător

---

## 🚀 Next Steps

### Pas 1: Configurare în Innova Backoffice
1. Accesează https://backoffice.timelesstech.org/login
2. Login cu `thinkcode_bo` / `39ByzDV3`
3. Caută secțiunea "Webhooks" sau "Notifications"
4. Adaugă URL-urile de webhook:
   - Jackpot: `https://backend.jackpotx.net/api/innova/webhooks/jackpot`
   - Tournament: `https://backend.jackpotx.net/api/innova/webhooks/tournament`

### Pas 2: Creează Jackpot Schedule în Innova
1. În Innova Backoffice, creează un jackpot schedule
2. Configurează:
   - Name: ex. "Daily Mega Jackpot"
   - Currency: USD
   - Seed Amount: ex. 1000.00
   - Type: CASINO / DROPWIN / HAPPYHOUR
3. Salvează → Innova va trimite webhook NEW_INSTANCE automat

### Pas 3: Verificare
1. Check backend logs: `pm2 logs backend | grep INNOVA`
2. Check database:
   ```sql
   SELECT * FROM jackpot_schedules ORDER BY created_at DESC LIMIT 5;
   ```
3. Check frontend: https://jackpotx.net (jackpot-ul va apărea automat)

### Pas 4: Test Prize Distribution
1. Așteaptă ca un jucător să câștige jackpot în joc
2. Innova trimite INSTANCE_WIN webhook
3. Innova trimite changebalance callback
4. Balance-ul jucătorului este creditat automat

---

## 📞 Support

Dacă întâmpini probleme:

1. **Check backend logs**: `pm2 logs backend --lines 100`
2. **Check database**:
   ```sql
   SELECT * FROM jackpot_schedules;
   SELECT * FROM jackpot_instances;
   ```
3. **Test webhook manual** cu curl (vezi exemplele de mai sus)
4. **Contact Innova Support** dacă webhook-urile nu sosesc

---

## ✅ Checklist Final

- [x] Database schema creat (10/10 tabele)
- [x] Backend API endpoints implementate
- [x] Webhook handlers testate (toate 5 scenarii)
- [x] Frontend widgets integrate
- [x] Wallet system conectat
- [x] Special game IDs create (62903-62906)
- [x] Provider callback verificat
- [x] PM2 backend restart ok
- [x] Frontend production build ok
- [x] Test data cleanup finalizat

**Status**: ✅ **PRODUCTION READY**

Sistemul este gata să primească jackpot-uri și turnee de la Innova!
