
# Operator Integration API Documentation v2.49

## Changelog
<details>
<summary>Click to expand</summary>

| Version | Changes | Date |
|---------|---------|------|
| 2.00 | A major API upgrade. | 2020-01-03 |
| 2.10 | X-Authorization header. Status request parameter token replaced with user_id. Added user_id parameter to Cancel request. Game list API update. | 2020-01-20 |
| 2.11 | Game launch language parameter format changed to IETF language tag with fallbacks. Change balance request round_finished parameter changed to optional. A new game launch parameter deposit_url. | 2020-02-01 |
| 2.12 | Parameter descriptions updates. | 2020-02-04 |
| ... | ... | ... |
| 2.49 | Updated Session check on WIN notice. Updated changebalance token parameter description. | 2024-09-12 |

</details>

---

## Glossary
- **Platform**: The game provider, a remote side from your perspective -> OUR SYSTEM  
- **Operator**: Casino (or any other system) that integrates this API -> YOUR SYSTEM  
- **Player**: Casino user that plays a game  

---

## Important Notes
1. **OperatorID Header**: Every request/command sent by PLATFORM has the `X-Operator-Id` header.  
2. **Idempotency**: All methods/commands must work idempotently.  
3. **Session Check**: WIN, REFUND calls can come after the player’s session is already expired.  
4. **Duplicate transaction**: Idempotency must apply to identical transactions being retried.  
5. **String Restrictions**: None of the string type parameters should contain the symbol `|`.  

---

## Prerequisites
Operator must:  
- Provide API base URL for the staging environment (HTTPS is required)  
- Provide IP address(es) of the staging environment  
- Provide a list of currencies  
- Provide user_id and user_name format  

Platform must:  
- Provide API_HOST  
- Provide operator_id  
- Provide secret_key  
- Whitelist Operator’s IP address(es)  
- Provide Backoffice access  

---

## Integration Workflow
1. Player launches a game.  
2. Operator generates a token tied to player and game.  
3. Token and parameters are passed to PLATFORM in game launch URL.  
4. PLATFORM makes `authenticate` call to operator.  
5. Operator responds with player data.  
6. If OK, player is redirected to the game; else error shown.  
7. Gameplay API calls (`balance`, `changebalance`, etc.) are made to operator.  

---

## Game and Lobby Launch
### Game launch URL / Lobby launch URL
#### Game in REAL mode
```
https://GAME_LAUNCH_HOST/?mode=real&game_id={game_id}&token={player_game_session_token}&currency={currency}&language={language}&operator_id={operator_id}&home_url={home_url}
```

Example:
```
https://GAME_LAUNCH_HOST/?operator_id=examplecasino&mode=real&game_id=37&token=IfpdCsglTNR4xuFHOijZ&currency=EUR&language=en&home_url=https://api-host.com/generic/games
```

#### Game in FUN/DEMO mode
```
https://GAME_LAUNCH_HOST/?mode=fun&game_id={game_id}&currency={currency}&language={language}&home_url={home_url}
```

---

## Player Game Session Token
- Token length: 20–50 characters (A-Za-z0-9).  
- If a session is ended, respond with `OP_21 Invalid token`.  

---

## Gameplay API
### Endpoints
Operator MUST create the following endpoints:
```
POST /authenticate
POST /balance
POST /changebalance
POST /status
POST /cancel
POST /finishround  # optional
GET  /ping          # optional
```

### Headers
- `X-Authorization`: SHA1(command + secretKey)  
- `X-Operator-Id`: Operator ID  

### Request and Response Signing
- Request hash: `sha1(command + request_timestamp + secretKey)`  
- Response hash: `sha1(status + response_timestamp + secretKey)`  

---

## API Commands
### authenticate
Request:
```json
{
  "command": "authenticate",
  "request_timestamp": "2020-12-01 13:44:54",
  "hash": "43afab643ee5b94e3b4edbe438f30fa3e97e10c4",
  "data": {
    "token": "eqkB1WoKQCvjrV6taJRN"
  }
}
```

Response (OK):
```json
{
  "request": { ... },
  "response": {
    "status": "OK",
    "response_timestamp": "2020-12-01 13:44:55",
    "hash": "b456f090dffed71866c0ef18071c40058a173098",
    "data": {
      "user_id": "25343",
      "user_name": "john_doe",
      "balance": 420.76,
      "currency_code": "EUR"
    }
  }
}
```

---

### balance
Request and response similar to above.

### changebalance
Handles `BET`, `WIN`, `REFUND`.

---

### status, cancel, finishround, ping
Detailed examples follow same structure.

---

## Additional APIs
- **Games and Lobbies list API**
- **Business report API**
- **Balance limits API**
- **Hand history API**

(Include endpoints, headers, examples as needed.)

---
© 2024 Operator Integration API. All rights reserved.
