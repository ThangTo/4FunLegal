import 'dotenv/config';

import { app } from './app';
import connectDB from './src/config/db';
import { seedDemoData } from './src/seeds/demo.seed';

const port = Number(process.env.PORT || 3000);

const startServer = async () => {
  await connectDB();
  await seedDemoData();

  app.listen(port, () => {
    console.log(`💓 Node gateway listening on port ${port}`);
  });
};

void startServer().catch((error) => {
  console.error('Failed to start node gateway', error);
  process.exit(1);
});
