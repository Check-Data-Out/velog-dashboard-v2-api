import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app: Application = express();

app.use(express.json());
app.use(cors());
app.get('/', (req, res) => {
  res.send('Hello, V.D.!');
});
export default app;
