export const classes = (..._clases: (false | null | undefined | string)[]): string =>
  _clases.filter(Boolean).join(' ');

export function formatNumber(num: number | unknown): string | unknown {
  if (typeof num !== 'number') {
    return num;
  }
  if (Math.abs(num) < 1e3) {
    return num.toString();
  } else if (Math.abs(num) < 1e6) {
    return (num / 1e3).toFixed(num % 1e3 === 0 ? 0 : 1) + 'k';
  } else if (Math.abs(num) < 1e9) {
    return (num / 1e6).toFixed(num % 1e6 === 0 ? 0 : 1) + 'M';
  } else if (Math.abs(num) < 1e12) {
    return (num / 1e9).toFixed(num % 1e9 === 0 ? 0 : 1) + 'B';
  } else {
    return (num / 1e12).toFixed(num % 1e12 === 0 ? 0 : 1) + 'T';
  }
}

export const inputClasses =
  'block w-full rounded-md border-0 bg-black text-white placeholder-gray-400 py-1.5 shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6';


