import { connect } from 'mongoose';
import logger from '@utils/logger';

// NOTE: rn this is hard coded to my dev db instance
const MONGODB_URI = 'mongodb://localhost:27017'; // Use the connection string from either your local MongoDB instance or MongoDB Atlas

export const connectToDB = async () => {
  await connect(MONGODB_URI).catch((error) => {
    logger.error('Error connecting to MongoDB', error);
  });

  logger.debug('Connected to MongoDB 🚀');
};
