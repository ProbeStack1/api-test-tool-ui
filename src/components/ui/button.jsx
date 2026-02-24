import React from 'react';
import { clsx } from 'clsx';

const buttonVariants = {
  default: 'bg-primary text-white hover:bg-primary/90',
  outline: 'border border-dark-700 bg-transparent hover:bg-dark-700/50 text-gray-300',
  gradient: 'bg-gradient-to-r from-primary via-amber-500 to-teal-500 text-white hover:opacity-90',
  destructive: 'bg-red-500 text-white hover:bg-red-600',
};

const buttonSizes = {
  default: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
  lg: 'px-6 py-3 text-base',
};

export const Button = React.forwardRef(({ 
  className, 
  variant = 'default', 
  size = 'default', 
  asChild = false,
  children,
  ...props 
}, ref) => {
  const Comp = asChild ? 'span' : 'button';
  
  return (
    <Comp
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </Comp>
  );
});

Button.displayName = 'Button';
