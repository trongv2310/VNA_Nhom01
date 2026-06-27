"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glassmorphism?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  glassmorphism = true,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl transition-all duration-300 overflow-hidden
        ${
          glassmorphism
            ? "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border border-white/40 dark:border-zinc-900/50 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50"
            : "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl"
        } 
        ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`px-8 pt-8 pb-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`px-8 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`px-8 pb-8 pt-4 border-t border-zinc-100 dark:border-zinc-900/50 ${className}`} {...props}>
      {children}
    </div>
  );
};
