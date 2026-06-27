"use client";

import React, { useEffect } from "react";
import { Alert } from "@/libs/core/components/Alert";

interface LoginAlertProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export const LoginAlert: React.FC<LoginAlertProps> = ({
  open,
  message,
  onClose,
}) => {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [open, message, onClose]);

  if (!open) return null;

  return (
    <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300 ease-out select-none">
      <Alert
        variant="login"
        onClose={onClose}
        className="w-full shadow-sm"
      >
        {message}
      </Alert>
    </div>
  );
};
