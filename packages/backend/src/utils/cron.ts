import schedule from 'node-schedule';
import logger from '@utils/logger';
import { runJob } from '@utils/job';

let started = false;

export async function startCron() {
  if (started) return;
  started = true;
  const cronExpression = `${Math.floor(Math.random() * 60)} 7 * * *`;
  logger.info(`Scheduling cron job. Will run every ${cronExpression}.`);
  schedule.scheduleJob(cronExpression, runJob);
}
