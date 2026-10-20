import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'primary',
  isLoading = false
}) => {
  const icon = {
    danger: <AlertTriangle className="w-6 h-6 text-rose-600" />,
    warning: <AlertCircle className="w-6 h-6 text-amber-600" />,
    primary: <CheckCircle2 className="w-6 h-6 text-emerald-600" />
  }[type];

  const buttonStyle = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    primary: 'bg-emerald-700 hover:bg-emerald-800 text-white'
  }[type];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-none transition-colors shadow-xs ${buttonStyle}`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4 py-2">
        <div className="shrink-0 p-2 rounded-full bg-gray-50 border border-gray-100">{icon}</div>
        <p className="text-sm text-gray-600 leading-relaxed mt-1">{message}</p>
      </div>
    </Modal>
  );
};
