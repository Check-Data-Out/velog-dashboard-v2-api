import express, { Application } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, V.D.');
});

export default app;
