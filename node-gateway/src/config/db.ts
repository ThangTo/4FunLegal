import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let isConnected = false;
let activeMongoUri: string | null = null;
let inMemoryMongoServer: MongoMemoryServer | null = null;

const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/legal-fact-check';

const getServerSelectionTimeout = () => {
  const timeout = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000);

  if (Number.isNaN(timeout) || timeout <= 0) {
    return 5000;
  }

  return timeout;
};

const shouldAllowInMemoryFallback = () =>
  process.env.NODE_ENV !== 'production' && process.env.ALLOW_IN_MEMORY_DB_FALLBACK !== 'false';

const connectWithUri = async (mongoUri: string) => {
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: getServerSelectionTimeout(),
  });

  isConnected = true;
  activeMongoUri = mongoUri;
  console.log(`✅ MongoDB connected successfully (${mongoUri})`);
};

const startInMemoryMongoServer = async () => {
  if (inMemoryMongoServer) {
    return inMemoryMongoServer;
  }

  inMemoryMongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'legal-fact-check',
    },
  });

  return inMemoryMongoServer;
};

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

  try {
    await connectWithUri(mongoUri);
  } catch (error) {
    if (!shouldAllowInMemoryFallback()) {
      throw error;
    }

    console.warn(
      `Primary MongoDB connection failed for ${mongoUri}. Falling back to in-memory MongoDB for local development.`,
    );

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => undefined);
    }

    const memoryServer = await startInMemoryMongoServer();
    const fallbackUri = memoryServer.getUri();

    await connectWithUri(fallbackUri);
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (inMemoryMongoServer) {
    await inMemoryMongoServer.stop();
    inMemoryMongoServer = null;
  }

  isConnected = false;
  activeMongoUri = null;
};

export const getActiveMongoUri = () => activeMongoUri;

export default connectDB;
