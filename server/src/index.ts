import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { startBackupScheduler } from './scheduler/backup.scheduler';

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});
startBackupScheduler();

export default app;
