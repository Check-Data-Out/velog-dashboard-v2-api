import app from './app';
import logger from './configs/logger.config';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});
