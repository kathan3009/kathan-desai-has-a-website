import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };

if (process.env.NODE_ENV !== "production") {
  global.mongoose = cached;
}

async function dbConnect(): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (cached.conn) {
    return cached.conn;
  }
  try {
    if (!cached.promise) {
      cached.promise = mongoose.connect(uri);
    }
    cached.conn = await cached.promise;
    return cached.conn;
  } catch {
    cached.promise = null;
    return null;
  }
}

export default dbConnect;
