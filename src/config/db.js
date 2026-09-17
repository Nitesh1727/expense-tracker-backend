import mongoose from 'mongoose';
import env from './env.js';

async function connectDb() {
  mongoose.connection.on('connected', () => console.log('[db] connected'));
  mongoose.connection.on('error', (err) => console.error('[db] connection error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));

  await mongoose.connect(env.MONGODB_URI);
}

export default connectDb;
