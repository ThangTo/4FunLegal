// d:/Project/AI-agent/node-gateway/controllers/proxy.controller.ts
import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const forwardRegistration = async (req: Request, res: Response) => {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/v1/verify-registration';
    
    // Forward the form data to the FastAPI service
    const response = await axios.post(aiServiceUrl, req.body);
    
    // Send back the response from the AI service
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Error forwarding request:', error.message);
    res.status(500).json({ error: 'Failed to verify registration with AI service' });
  }
};

router.post('/register', forwardRegistration);

export default router;
