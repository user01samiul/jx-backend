/**
 * @openapi
 * components:
 *   schemas:
 *     ProviderRequest:
 *       type: object
 *       required:
 *         - command
 *         - request_timestamp
 *         - hash
 *         - data
 *       properties:
 *         command:
 *           type: string
 *           enum: [authenticate, balance, changebalance, status, cancel, finishround, ping]
 *           description: The provider callback command
 *         request_timestamp:
 *           type: string
 *           format: date-time
 *           description: Request timestamp in YYYY-MM-DD HH:mm:ss format
 *         hash:
 *           type: string
 *           description: SHA1 hash of command + timestamp + secret_key
 *         data:
 *           type: object
 *           description: Command-specific data payload
 *     
 *     ProviderResponse:
 *       type: object
 *       properties:
 *         request:
 *           $ref: '#/components/schemas/ProviderRequest'
 *         response:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [OK, ERROR]
 *             response_timestamp:
 *               type: string
 *               format: date-time
 *             hash:
 *               type: string
 *             data:
 *               type: object
 *             error_code:
 *               type: string
 *             error_message:
 *               type: string
 *     
 *     AuthenticateData:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: User authentication token
 *         game_id:
 *           type: integer
 *           description: Game ID (optional)
 *     
 *     BalanceData:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: User authentication token
 *         game_id:
 *           type: integer
 *           description: Game ID (optional)
 *     
 *     ChangeBalanceData:
 *       type: object
 *       required:
 *         - token
 *         - user_id
 *         - amount
 *         - transaction_id
 *       properties:
 *         token:
 *           type: string
 *           description: User authentication token
 *         user_id:
 *           type: integer
 *           description: User ID
 *         amount:
 *           type: number
 *           format: float
 *           description: Transaction amount (positive for credits, negative for debits)
 *         transaction_id:
 *           type: string
 *           description: Unique transaction identifier
 *         game_id:
 *           type: integer
 *           description: Game ID (optional)
 *         session_id:
 *           type: string
 *           description: Game session ID (optional)
 *         currency_code:
 *           type: string
 *           default: USD
 *           description: Currency code
 *         type:
 *           type: string
 *           enum: [BET, WIN]
 *           description: Transaction type (optional, for new provider format)
 *     
 *     StatusData:
 *       type: object
 *       required:
 *         - transaction_id
 *       properties:
 *         transaction_id:
 *           type: string
 *           description: Transaction ID to check status
 *         token:
 *           type: string
 *           description: User authentication token (optional)
 *         user_id:
 *           type: integer
 *           description: User ID (optional)
 *     
 *     CancelData:
 *       type: object
 *       required:
 *         - transaction_id
 *       properties:
 *         transaction_id:
 *           type: string
 *           description: Transaction ID to cancel
 *         token:
 *           type: string
 *           description: User authentication token (optional)
 *         user_id:
 *           type: integer
 *           description: User ID (optional)
 *     
 *     FinishRoundData:
 *       type: object
 *       required:
 *         - token
 *         - round_id
 *       properties:
 *         token:
 *           type: string
 *           description: User authentication token
 *         round_id:
 *           type: string
 *           description: Round ID to finish
 *         game_id:
 *           type: integer
 *           description: Game ID (optional)
 *     
 *     BalanceResponseData:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           description: User ID
 *         balance:
 *           type: number
 *           format: float
 *           description: Current user balance
 *         currency_code:
 *           type: string
 *           description: Currency code
 *     
 *     ChangeBalanceResponseData:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           description: User ID
 *         transaction_id:
 *           type: string
 *           description: Transaction ID
 *         balance:
 *           type: number
 *           format: float
 *           description: New balance after transaction
 *         currency_code:
 *           type: string
 *           description: Currency code
 *     
 *     CancelResponseData:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           description: User ID
 *         transaction_id:
 *           type: string
 *           description: Cancelled transaction ID
 *         transaction_status:
 *           type: string
 *           enum: [CANCELED]
 *           description: Transaction status after cancellation
 *         balance:
 *           type: number
 *           format: float
 *           description: New balance after cancellation
 *         currency_code:
 *           type: string
 *           description: Currency code
 *     
 *     AuthenticateResponseData:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           description: User ID
 *         username:
 *           type: string
 *           description: Username
 *         balance:
 *           type: number
 *           format: float
 *           description: User balance
 *         currency_code:
 *           type: string
 *           description: Currency code
 *         country_code:
 *           type: string
 *           description: Country code
 *         country_name:
 *           type: string
 *           description: Country name
 *         game_id:
 *           type: integer
 *           description: Game ID
 *         category:
 *           type: string
 *           description: Game category
 *         category_balance:
 *           type: number
 *           format: float
 *           description: Category-specific balance
 *     
 *     StatusResponseData:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           description: User ID
 *         transaction_id:
 *           type: string
 *           description: Transaction ID
 *         transaction_status:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *           description: Transaction status
 *         balance:
 *           type: number
 *           format: float
 *           description: Current user balance
 *         currency_code:
 *           type: string
 *           description: Currency code
 *     
 *     FinishRoundResponseData:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           description: User ID
 *         round_id:
 *           type: string
 *           description: Round ID
 *         round_status:
 *           type: string
 *           enum: [finished]
 *           description: Round status
 *         balance:
 *           type: number
 *           format: float
 *           description: Current user balance
 *         currency_code:
 *           type: string
 *           description: Currency code
 *     
 *     PingResponseData:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [OK]
 *           description: Ping status
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Server timestamp
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [ERROR]
 *         response_timestamp:
 *           type: string
 *           format: date-time
 *         error_code:
 *           type: string
 *           description: Error code
 *         error_message:
 *           type: string
 *           description: Error message
 *     
 *   securitySchemes:
 *     ProviderAuth:
 *       type: apiKey
 *       in: header
 *       name: X-Authorization
 *       description: Provider authentication header (SHA1 hash of command + secret_key)
 * 
 * tags:
 *   - name: Provider Callbacks
 *     description: Provider callback endpoints for game integration
 */

/**
 * @openapi
 * /innova/authenticate:
 *   post:
 *     summary: Authenticate user session
 *     tags:
 *       - Provider Callbacks
 *     description: |
 *       Authenticates a user session and returns user information including balances.
 *       Used when a user starts a game session.
 *     security:
 *       - ProviderAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProviderRequest'
 *           example:
 *             command: "authenticate"
 *             request_timestamp: "2025-08-08 00:00:00"
 *             hash: "abc123def456..."
 *             data:
 *               token: "user_token_here"
 *               game_id: 43
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProviderResponse'
 *             example:
 *               request:
 *                 command: "authenticate"
 *                 request_timestamp: "2025-08-08 00:00:00"
 *                 hash: "abc123def456..."
 *                 data:
 *                   token: "user_token_here"
 *                   game_id: 43
 *               response:
 *                 status: "OK"
 *                 response_timestamp: "2025-08-08 00:00:00"
 *                 hash: "def456ghi789..."
 *                 data:
 *                   user_id: "48"
 *                   username: "player50"
 *                   balance: 50.00
 *                   currency_code: "USD"
 *                   country_code: "US"
 *                   country_name: "United States"
 *                   game_id: 43
 *                   category: "slots"
 *                   category_balance: 50.00
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /innova/balance:
 *   post:
 *     summary: Get user balance
 *     tags:
 *       - Provider Callbacks
 *     description: |
 *       Returns the current balance for a user.
 *       Used to check user balance during gameplay.
 *     security:
 *       - ProviderAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProviderRequest'
 *           example:
 *             command: "balance"
 *             request_timestamp: "2025-08-08 00:00:00"
 *             hash: "abc123def456..."
 *             data:
 *               token: "user_token_here"
 *               game_id: 43
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProviderResponse'
 *             example:
 *               request:
 *                 command: "balance"
 *                 request_timestamp: "2025-08-08 00:00:00"
 *                 hash: "abc123def456..."
 *                 data:
 *                   token: "user_token_here"
 *                   game_id: 43
 *               response:
 *                 status: "OK"
 *                 response_timestamp: "2025-08-08 00:00:00"
 *                 hash: "def456ghi789..."
 *                 data:
 *                   user_id: "48"
 *                   balance: 50.00
 *                   currency_code: "USD"
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /innova/changebalance:
 *   post:
 *     summary: Change user balance (bet/win)
 *     tags:
 *       - Provider Callbacks
 *     description: |
 *       Processes balance changes for bets and wins.
 *       Used when user places bets or receives winnings.
 *     security:
 *       - ProviderAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProviderRequest'
 *           examples:
 *             bet:
 *               summary: Place a bet
 *               value:
 *                 command: "changebalance"
 *                 request_timestamp: "2025-08-08 00:00:00"
 *                 hash: "abc123def456..."
 *                 data:
 *                   token: "user_token_here"
 *                   user_id: 48
 *                   amount: -0.20
 *                   transaction_id: "2239560"
 *                   game_id: 43
 *                   session_id: "session_123"
 *                   currency_code: "USD"
 *             win:
 *               summary: Process a win
 *               value:
 *                 command: "changebalance"
 *                 request_timestamp: "2025-08-08 00:00:00"
 *                 hash: "abc123def456..."
 *                 data:
 *                   token: "user_token_here"
 *                   user_id: 48
 *                   amount: 1.10
 *                   transaction_id: "2239561"
 *                   game_id: 43
 *                   session_id: "session_123"
 *                   currency_code: "USD"
 *                   type: "WIN"
 *     responses:
 *       200:
 *         description: Balance change processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProviderResponse'
 *             example:
 *               request:
 *                 command: "changebalance"
 *                 request_timestamp: "2025-08-08 00:00:00"
 *                 hash: "abc123def456..."
 *                 data:
 *                   token: "user_token_here"
 *                   user_id: 48
 *                   amount: -0.20
 *                   transaction_id: "2239560"
 *                   game_id: 43
 *               response:
 *                 status: "OK"
 *                 response_timestamp: "2025-08-08 00:00:00"
 *                 hash: "def456ghi789..."
 *                 data:
 *                   user_id: "48"
 *                   transaction_id: "2239560"
 *                   balance: 49.80
 *                   currency_code: "USD"
 *       400:
 *         description: Invalid request or insufficient balance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /innova/status:
 *   post:
 *     summary: Check transaction status
 *     tags:
 *       - Provider Callbacks
 *     description: |
 *       Checks the status of a specific transaction.
 *       Used to verify transaction processing status.
 *     security:
 *       - ProviderAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProviderRequest'
 *           example:
 *             command: "status"
 *             request_timestamp: "2025-08-08 00:00:00"
 *             hash: "abc123def456..."
 *             data:
 *               transaction_id: "2239560"
 *               token: "user_token_here"
 *     responses:
 *       200:
 *         description: Transaction status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProviderResponse'
 *             example:
 *               request:
 *                 command: "status"
 *                 request_timestamp: "2025-08-08 00:00:00"
 *                 hash: "abc123def456..."
 *                 data:
 *                   transaction_id: "2239560"
 *                   token: "user_token_here"
 *               response:
 *                 status: "OK"
 *                 response_timestamp: "2025-08-08 00:00:00"
 *                 hash: "def456ghi789..."
 *                 data:
 *                   user_id: "48"
 *                   transaction_id: "2239560"
 *                   transaction_status: "completed"
 *                   balance: 49.80
 *                   currency_code: "USD"
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /innova/cancel:
 *   post:
 *     summary: Cancel a transaction
 *     tags:
 *       - Provider Callbacks
 *     description: |
 *       Cancels a specific transaction and refunds the user.
 *       Used to reverse bets or wins when needed.
 *     security:
 *       - ProviderAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProviderRequest'
 *           example:
 *             command: "cancel"
 *             request_timestamp: "2025-08-08 00:00:00"
 *             hash: "abc123def456..."
 *             data:
 *               transaction_id: "2239560"
 *               token: "user_token_here"
 *               user_id: 48
 *     responses:
 *       200:
 *         description: Transaction cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProviderResponse'
 *             example:
 *               request:
 *                 command: "cancel"
 *                 request_timestamp: "2025-08-08 00:00:00"
 *                 hash: "abc123def456..."
 *                 data:
 *                   transaction_id: "2239560"
 *                   token: "user_token_here"
 *                   user_id: 48
 *               response:
 *                 status: "OK"
 *                 response_timestamp: "2025-08-08 00:00:00"
 *                 hash: "def456ghi789..."
 *                 data:
 *                   user_id: "48"
 *                   transaction_id: "2239560"
 *                   transaction_status: "CANCELED"
 *                   balance: 50.00
 *                   currency_code: "USD"
 *       400:
 *         description: Invalid request or transaction cannot be cancelled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /innova/finishround:
 *   post:
 *     summary: Finish a game round
 *     tags:
 *       - Provider Callbacks
 *     description: |
 *       Marks a game round as finished.
 *       Used to complete game sessions.
 *     security:
 *       - ProviderAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProviderRequest'
 *           example:
 *             command: "finishround"
 *             request_timestamp: "2025-08-08 00:00:00"
 *             hash: "abc123def456..."
 *             data:
 *               token: "user_token_here"
 *               round_id: "round_123"
 *               game_id: 43
 *     responses:
 *       200:
 *         description: Round finished successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProviderResponse'
 *             example:
 *               request:
 *                 command: "finishround"
 *                 request_timestamp: "2025-08-08 00:00:00"
 *                 hash: "abc123def456..."
 *                 data:
 *                   token: "user_token_here"
 *                   round_id: "round_123"
 *                   game_id: 43
 *               response:
 *                 status: "OK"
 *                 response_timestamp: "2025-08-08 00:00:00"
 *                 hash: "def456ghi789..."
 *                 data:
 *                   user_id: "48"
 *                   round_id: "round_123"
 *                   round_status: "finished"
 *                   balance: 50.00
 *                   currency_code: "USD"
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /innova/ping:
 *   get:
 *     summary: Health check endpoint
 *     tags:
 *       - Provider Callbacks
 *     description: |
 *       Simple health check endpoint to verify provider callback service is running.
 *       No authentication required.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProviderResponse'
 *             example:
 *               request: {}
 *               response:
 *                 status: "OK"
 *                 response_timestamp: "2025-08-08 00:00:00"
 *                 hash: "def456ghi789..."
 *                 data:
 *                   status: "OK"
 *                   timestamp: "2025-08-08T00:00:00.000Z"
 */

export default {}; 