import express from 'express';
import path from 'path';
import fs from 'fs';
import { ZipArchive, type ArchiverError } from 'archiver';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db';
import authRoutes from './server/routes/auth';
import publicRoutes from './server/routes/public';
import adminRoutes from './server/routes/admin';
import studentRoutes from './server/routes/student';

dotenv.config();

async function startServer() {
  initDatabase();

  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api', publicRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/student', studentRoutes);

  // Clean, Windows/macOS-compatible downloadable ZIP of the project for VS Code
  app.get('/api/download-project-zip', (_req, res) => {
    try {
      const rootDir = process.cwd();
      const archive = new ZipArchive({ zlib: { level: 6 } });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="placify-project.zip"');

      archive.on('error', (err: ArchiverError) => {
        console.error('Archiver ZIP error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to generate project ZIP archive.' });
        } else {
          res.end();
        }
      });

      archive.pipe(res);

      const ignoreNames = new Set([
        'node_modules',
        'dist',
        '.git',
        '.aistudio',
        'placify.db',
        'placify.db-wal',
        'placify.db-shm',
        'placify-project.zip',
        'bun.lock',
      ]);

      const walkAndAdd = (currentDir: string, relBase: string) => {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (ignoreNames.has(entry.name)) continue;
          const fullPath = path.join(currentDir, entry.name);
          const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
          if (relPath === 'public/assets/aistudio') continue;
          if (entry.isDirectory()) {
            walkAndAdd(fullPath, relPath);
          } else if (entry.isFile()) {
            archive.file(fullPath, { name: `placify-project/${relPath}` });
          }
        }
      };

      walkAndAdd(rootDir, '');
      archive.finalize();
    } catch (err) {
      console.error('ZIP export error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate project ZIP archive.' });
      }
    }
  });

  // API 404 fallback
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Centralized error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PLACIFY server running at http://localhost:${PORT}`);
  });
}

startServer();
