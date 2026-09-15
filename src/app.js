const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ ok: true }));

app.use('/api', routes);

// Must be registered after all routes — Express identifies error middleware by its 4-arg signature.
app.use(errorMiddleware);

module.exports = app;
