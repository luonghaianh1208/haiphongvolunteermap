import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import statsRouter from './src/routes/stats.ts';
import usersRouter from './src/routes/users.ts';
import activitiesRouter from './src/routes/activities.ts';
import leaderboardRouter from './src/routes/leaderboard.ts';
import unitsRouter from './src/routes/units.ts';
import { errorHandler } from './src/middleware/error-handler.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use(statsRouter);
  app.use(usersRouter);
  app.use(activitiesRouter);
  app.use(leaderboardRouter);
  app.use(unitsRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
