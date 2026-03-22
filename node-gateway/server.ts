// d:/Project/AI-agent/node-gateway/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import proxyRoutes from './controllers/proxy.controller';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
// Note: In a real app we'd define router inside a routes directory,
// here proxyRoutes is imported directly from proxy.controller.ts for simplicity
app.use('/api/v1/proxy', proxyRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API Gateway is running' });
});

app.listen(PORT, () => {
  console.log(`💓 Server is running on port ${PORT}`);
});
