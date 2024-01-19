// debounce.ts
export function debounce<T extends unknown[], R>(func: (...args: T) => R, waitFor: number): (...args: T) => Promise<R> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return function (...args: T): Promise<R> {
    clearTimeout(timeout as ReturnType<typeof setTimeout>);
    return new Promise<R>((resolve) => {
      timeout = setTimeout(() => {
        const result = func(...args);
        resolve(result);
      }, waitFor) as ReturnType<typeof setTimeout>;
    });
  };
}
