import mongoose from 'mongoose';
import { createApp } from './app.js';
mongoose.set('bufferCommands', false);
const app = createApp();
const port = Number(process.env.API_PORT || process.env.PORT || 3001);
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ifca', {
    serverSelectionTimeoutMS: 5000,
  });
  app.listen(port, () => console.log(`IFCA API listening on ${port}`));
} catch {
  console.error('MongoDB connection failed. Set MONGODB_URI and start MongoDB.');
  process.exit(1);
}
