import logger from '@utils/logger';
import { execSync } from 'child_process';

export function isContainerRunning(containerName: string): boolean {
  try {
    const output = execSync(`docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null`).toString().trim();
    return output === 'true';
  } catch (error) {
    return false;
  }
}

export function doesContainerExist(containerName: string): boolean {
  const output = execSync(`docker ps -a --format '{{.Names}}'`).toString();
  return output.split('\n').includes(containerName);
}

export async function startContainer(containerName: string): Promise<void> {
  if (isContainerRunning(containerName)) {
    console.log(`${containerName} is already running`);
  } else {
    if (doesContainerExist(containerName)) {
      console.log(`${containerName} container exists, restarting...`);
      execSync(`docker restart ${containerName}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      console.log(`${containerName} container does not exist, creating...`);
      execSync(`docker run -d --name ${containerName} -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" -v elasticsearch-data-estatemetrics:/usr/share/elasticsearch/data docker.elastic.co/elasticsearch/elasticsearch:7.17.0`);
    }
  }
}

export function stopContainer(containerName: string): void {
  if (isContainerRunning(containerName)) {
    console.log(`Stopping ${containerName} container...`);
    execSync(`docker stop ${containerName}`);
  } else {
    console.log(`${containerName} container is not running`);
  }
}

export async function startElastic(): Promise<void> {
  return startContainer('elasticsearch_estatemetrics');
}

export function stopElastic(): void {
  return stopContainer('elasticsearch_estatemetrics');
}