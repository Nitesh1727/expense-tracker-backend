import express from 'express';
import cors from 'cors';
// ESM needs the explicit /index.js — unlike CommonJS, Node doesn't resolve a
// bare directory import to its index file automatically.
import routes from './routes/index.js';
import errorMiddleware from './middleware/error.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ ok: true }));

app.use('/api', routes);

// Must be registered after all routes — Express identifies error middleware by its 4-arg signature.
app.use(errorMiddleware);

export default app;
