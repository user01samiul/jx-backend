import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Config } from '../configs/config';
import { ApiError } from '../utils/apiError';
import { ErrorMessages } from '../constants/messages';

export const connectMongo = async (): Promise<void> => {
  const mongoUri = Config.db.mongoUri;

  if (!mongoUri) {
    throw new ApiError(ErrorMessages.MONGO_CONNECTION_ERROR, 500);    
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1); // Exit process if unable to connect
  }
};