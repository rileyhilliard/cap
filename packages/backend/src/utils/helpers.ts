export const timestamp = (date = new Date()): string => new Date(date).toISOString();

export function median(numbers: number[]): number {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export function percentile(numbers: number[], percentile: number): number {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const index = (percentile / 100) * sorted.length;
  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index % 1;

  if (upper >= sorted.length) {
    return sorted[lower];
  }

  return decimals(sorted[lower] * (1 - weight) + sorted[upper] * weight);
}

export function decimals(num: number, dec: number = 2) {
  return parseFloat(num.toFixed(dec));
}