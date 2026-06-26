import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Customer } from '../types';

interface DeleteDialogProps {
  isOpen: boolean;
  customer: Customer | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export default function DeleteDialog({ isOpen, customer, onConfirm, onCancel, isDeleting }: DeleteDialogProps) {
  if (!customer) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="delete-modal-overlay">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white dark:bg-[#111827] w-full max-w-md rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden"
            id="delete-modal-content"
          >
            {/* Header / Accent bar */}
            <div className="h-2 bg-red-500 w-full" />
            
            <div className="p-6">
              {/* Close Button */}
              <button
                onClick={onCancel}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 dark:hover:bg-slate-800 p-2 rounded-xl transition-all"
                id="delete-modal-close-btn"
                aria-label="Cancel delete"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl shrink-0" id="delete-warning-icon">
                  <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white" id="delete-modal-title">
                    Delete Customer
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.customerName}</span>?
                  </p>
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1 bg-red-50 dark:bg-red-950/10 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                    This action is permanent and cannot be undone. All records for this customer will be removed from Firestore.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all disabled:opacity-50"
                  id="delete-modal-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
                  id="delete-modal-confirm-btn"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Customer
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
