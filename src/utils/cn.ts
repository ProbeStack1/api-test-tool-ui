/**
 * classnames helper — merges clsx + tailwind-merge for conflict-free utilities.
 * Usage: `cn('px-2 py-1', condition && 'bg-primary', otherClass)`
 */
import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
