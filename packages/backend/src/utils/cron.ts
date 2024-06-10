import schedule from 'node-schedule';
import logger from '@utils/logger';
import { runJob } from '@utils/job';
import { startElastic, stopElastic } from '@utils/docker';

let started = false;
export async function startCron() {
  if (started) return;
  started = true;
  // Run every week on a specific day (e.g., Monday) at a random time between 7:00 AM and 7:59 AM
  const cronExpression = `${Math.floor(Math.random() * 60)} 7 * * 1`;
  logger.info(`Scheduling cron job. Will run every ${cronExpression}.`);
  schedule.scheduleJob(cronExpression, () => {
    // elasticsearch is expensive to run, so we only start it when we need it
    startElastic();
    runJob();
    stopElastic();
  });
}
