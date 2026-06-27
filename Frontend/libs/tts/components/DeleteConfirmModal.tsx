"use client";

import React from "react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200/80 shadow-2xl rounded-[20px] w-full max-w-[400px] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col dark:border-zinc-800">
        <div className="bg-red-600 dark:bg-red-700 text-white py-4 text-center font-bold text-base select-none tracking-wide">
          {title}
        </div>
        <div className="p-6 flex flex-col gap-4 bg-white dark:bg-zinc-950">
          <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {description}
          </div>
          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onConfirm();
              }}
              className="px-4.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
