import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { env } from '../../configs/env';

export class MongoService {
  private static client: MongoClient;
  private static db: Db;

  /**
   * Initialize MongoDB connection
   */
  static async initialize(): Promise<void> {
    if (!this.client) {
      this.client = new MongoClient(env.MONGO_URI);
      await this.client.connect();
      this.db = this.client.db();
      console.log('[MONGO] Connected to MongoDB');
    }
  }

  /**
   * Get MongoDB client
   */
  static getClient(): MongoClient {
    return this.client;
  }

  /**
   * Get MongoDB database
   */
  static getDb(): Db {
    return this.db;
  }

  /**
   * Get transactions collection
   */
  static getTransactionsCollection(): Collection {
    if (!this.db) {
      throw new Error('MongoDB not initialized. Call MongoService.initialize() first.');
    }
    return this.db.collection('transactions');
  }

  /**
   * Get bets collection
   */
  static getBetsCollection(): Collection {
    if (!this.db) {
      throw new Error('MongoDB not initialized. Call MongoService.initialize() first.');
    }
    return this.db.collection('bets');
  }

  /**
   * Get user_category_balances collection
   */
  static getUserCategoryBalancesCollection(): Collection {
    if (!this.db) {
      throw new Error('MongoDB not initialized. Call MongoService.initialize() first.');
    }
    return this.db.collection('user_category_balances');
  }

  /**
   * Get games collection
   */
  static getGamesCollection(): Collection {
    if (!this.db) {
      throw new Error('MongoDB not initialized. Call MongoService.initialize() first.');
    }
    return this.db.collection('games');
  }

  /**
   * Get sequences collection
   */
  static getSequencesCollection(): Collection {
    if (!this.db) {
      throw new Error('MongoDB not initialized. Call MongoService.initialize() first.');
    }
    return this.db.collection('sequences');
  }

  /**
   * Get next sequence value (equivalent to PostgreSQL SERIAL)
   */
  static async getNextSequence(name: string): Promise<number> {
    const result = await this.getSequencesCollection().findOneAndUpdate(
      { _id: name },
      { $inc: { current_value: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    return result?.current_value || 0;
  }

  /**
   * Insert transaction (equivalent to PostgreSQL INSERT INTO transactions)
   */
  static async insertTransaction(transactionData: {
    user_id: number;
    type: string;
    amount: number;
    balance_before?: number;
    balance_after?: number;
    currency?: string;
    status?: string;
    description?: string;
    external_reference?: string;
    metadata?: any;
    created_by?: number;
  }): Promise<{ id: number }> {
    const id = await this.getNextSequence('transaction_id');
    
    const transaction = {
      _id: new ObjectId(),
      id: id, // Keep PostgreSQL-style ID for compatibility
      user_id: transactionData.user_id,
      type: transactionData.type,
      amount: transactionData.amount,
      balance_before: transactionData.balance_before,
      balance_after: transactionData.balance_after,
      currency: transactionData.currency || 'USD',
      status: transactionData.status || 'completed',
      description: transactionData.description,
      external_reference: transactionData.external_reference,
      metadata: transactionData.metadata,
      created_at: new Date(),
      created_by: transactionData.created_by || 1
    };

    await MongoService.getTransactionsCollection().insertOne(transaction);
    return { id };
  }

  /**
   * Insert bet (equivalent to PostgreSQL INSERT INTO bets)
   */
  static async insertBet(betData: {
    user_id: number;
    game_id: number;
    transaction_id: number;
    bet_amount: number;
    outcome?: string;
    game_data?: any;
    session_id?: string;
    created_by?: number;
  }): Promise<{ id: number }> {
    const id = await this.getNextSequence('bet_id');
    
    const bet = {
      _id: new ObjectId(),
      id: id, // Keep PostgreSQL-style ID for compatibility
      user_id: betData.user_id,
      game_id: betData.game_id,
      transaction_id: betData.transaction_id,
      bet_amount: betData.bet_amount,
      win_amount: 0,
      outcome: betData.outcome || 'pending',
      game_data: betData.game_data,
      placed_at: new Date(),
      session_id: betData.session_id,
      created_at: new Date(),
      created_by: betData.created_by || 1
    };

    await this.getBetsCollection().insertOne(bet);
    return { id };
  }

  /**
   * Update bet (equivalent to PostgreSQL UPDATE bets)
   */
  static async updateBet(betId: number, updateData: {
    outcome?: string;
    win_amount?: number;
    game_data?: any;
    result_at?: Date;
  }): Promise<void> {
    const update: any = {};
    
    if (updateData.outcome !== undefined) update.outcome = updateData.outcome;
    if (updateData.win_amount !== undefined) update.win_amount = updateData.win_amount;
    if (updateData.game_data !== undefined) update.game_data = updateData.game_data;
    if (updateData.result_at !== undefined) update.result_at = updateData.result_at;

    await this.getBetsCollection().updateOne(
      { id: betId },
      { $set: update }
    );
  }

  /**
   * Upsert user category balance (equivalent to PostgreSQL INSERT ... ON CONFLICT)
   */
  static async upsertUserCategoryBalance(
    user_id: number,
    category: string,
    balance: number
  ): Promise<void> {
    await this.getUserCategoryBalancesCollection().updateOne(
      { user_id, category },
      { $set: { balance } },
      { upsert: true }
    );
  }

  /**
   * Get user category balance
   */
  static async getUserCategoryBalance(user_id: number, category: string): Promise<number> {
    const result = await this.getUserCategoryBalancesCollection().findOne(
      { user_id, category }
    );
    return result ? result.balance : 0;
  }

  /**
   * Get bet by ID
   */
  static async getBetById(betId: number): Promise<any> {
    return await this.getBetsCollection().findOne({ id: betId });
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(transactionId: number): Promise<any> {
    return await MongoService.getTransactionsCollection().findOne({ id: transactionId });
  }

  /**
   * Update transaction
   */
  static async updateTransaction(transactionId: number, updateData: any): Promise<any> {
    const collection = MongoService.getTransactionsCollection();
    const result = await collection.updateOne(
      { id: transactionId },
      { $set: updateData }
    );
    return result;
  }

  /**
   * Get transactions by user ID
   */
  static async getTransactionsByUserId(userId: number, limit: number = 50): Promise<any[]> {
    return await MongoService.getTransactionsCollection()
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }

  

  /**
   * Atomic increment/decrement of category balance
   */
  static async atomicUpdateCategoryBalance(userId: number, category: string, amount: number): Promise<any> {
    const collection = this.getUserCategoryBalancesCollection();
    const result = await collection.updateOne(
      { user_id: userId, category: category.toLowerCase().trim() },
      { 
        $inc: { balance: amount },
        $set: { updated_at: new Date() }
      },
      { upsert: true }
    );
    return result;
  }

  /**
   * Get and update category balance atomically (for transactions)
   */
  static async getAndUpdateCategoryBalance(userId: number, category: string, amount: number): Promise<{ balance_before: number, balance_after: number }> {
    const collection = this.getUserCategoryBalancesCollection();
    
    // Use findOneAndUpdate for atomic read-modify-write
    const result = await collection.findOneAndUpdate(
      { user_id: userId, category: category.toLowerCase().trim() },
      { 
        $inc: { balance: amount },
        $set: { updated_at: new Date() }
      },
      { 
        upsert: true,
        returnDocument: 'before' // Return the document before update
      }
    );
    
    const balance_before = Math.round((result?.balance || 0) * 100) / 100;
    const balance_after = Math.round((balance_before + amount) * 100) / 100;
    
    return { balance_before, balance_after };
  }

  /**
   * Add amount to user category balance
   */
  static async addCategoryBalance(userId: number, category: string, amount: number): Promise<any> {
    const collection = this.getUserCategoryBalancesCollection();
    const result = await collection.updateOne(
      { user_id: userId, category: category.toLowerCase().trim() },
      { 
        $inc: { balance: amount },
        $setOnInsert: { created_at: new Date() },
        $set: { updated_at: new Date() }
      },
      { upsert: true }
    );
    return result;
  }

  /**
   * Deduct amount from user category balance
   */
  static async deductCategoryBalance(userId: number, category: string, amount: number): Promise<any> {
    const collection = this.getUserCategoryBalancesCollection();
    const result = await collection.updateOne(
      { user_id: userId, category: category.toLowerCase().trim() },
      { 
        $inc: { balance: -amount },
        $setOnInsert: { created_at: new Date() },
        $set: { updated_at: new Date() }
      },
      { upsert: true }
    );
    return result;
  }

  /**
   * Get all category balances for a user
   */
  static async getUserCategoryBalances(userId: number): Promise<any[]> {
    const collection = this.getUserCategoryBalancesCollection();
    const result = await collection.find({ user_id: userId }).toArray();
    return result;
  }

  /**
   * Upsert user category balance (for compatibility)
   */
  async upsertUserCategoryBalance(userId: number, category: string, balance: number): Promise<void> {
    await MongoService.updateCategoryBalance(userId, category, balance);
  }

  /**
   * Get user category balance (for compatibility)
   */
  async getUserCategoryBalance(userId: number, category: string): Promise<number> {
    return await MongoService.getCategoryBalance(userId, category);
  }

  /**
   * Get user main balance
   */
  static async getMainBalance(userId: number): Promise<number> {
    try {
      // For now, return 0 as main balance since we're using category balances
      // This can be enhanced later if main balance is needed
      return 0;
    } catch (error) {
      console.error(`[MONGO_SERVICE] Error getting main balance for user ${userId}:`, error);
      return 0;
    }
  }

  



  /**
   * Check if transaction exists by external reference
   */
  async transactionExistsByExternalReference(userId: number, externalReference: string): Promise<boolean> {
    const collection = MongoService.getTransactionsCollection();
    const result = await collection.findOne({ 
      user_id: userId, 
      external_reference: externalReference 
    });
    return !!result;
  }

  /**
   * Get transactions by user ID
   */
  async getTransactionsByUserId(userId: number, limit: number = 50): Promise<any[]> {
    const collection = MongoService.getTransactionsCollection();
    const result = await collection.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
    return result;
  }

  /**
   * Get bets by user ID
   */
  static async getBetsByUserId(userId: number, limit: number = 50): Promise<any[]> {
    const collection = this.getBetsCollection();
    const result = await collection.find({ user_id: userId })
      .sort({ placed_at: -1 })
      .limit(limit)
      .toArray();
    return result;
  }

  /**
   * Get bets with optional user filter
   */
  static async getBets(userId?: number, limit: number = 50): Promise<any[]> {
    const collection = this.getBetsCollection();
    const filter = userId ? { user_id: userId } : {};
    const result = await collection.find(filter)
      .sort({ placed_at: -1 })
      .limit(limit)
      .toArray();
    return result;
  }

  /**
   * Get transactions with optional user filter
   */
  static async getTransactions(userId?: number, limit: number = 50): Promise<any[]> {
    const collection = MongoService.getTransactionsCollection();
    const filter = userId ? { user_id: userId } : {};
    const result = await collection.find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
    return result;
  }
} 