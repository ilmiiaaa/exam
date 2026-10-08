import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Nginx reverse proxy listens on 8080 and forwards to localhost:3000.
// If PORT is 8080, we must listen on DEFAULT_APP_PORT (3000) to avoid EADDRINUSE.
const PORT =
  process.env.PORT && process.env.PORT !== '8080'
    ? Number(process.env.PORT)
    : (Number(process.env.DEFAULT_APP_PORT) || 3000);

app.use(express.json());

// Serve static files from dist directory
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Health check endpoint for Cloud Run container probes
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

// SPA fallback: send index.html for all other routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Exam Edu server running on port ${PORT}`);
});
