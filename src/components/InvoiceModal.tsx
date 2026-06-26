import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, ShieldCheck, Download, CreditCard, Building2 } from 'lucide-react';
import { Customer } from '../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export default function InvoiceModal({ isOpen, onClose, customer }: InvoiceModalProps) {
  if (!customer) return null;

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculations
  const totalAmount = customer.purchasePrice;
  const warranty = customer.warrantyMonths ?? 12;
  const paymentStatus = customer.paymentStatus ?? 'paid';
  const paidAmount = customer.amountPaid ?? totalAmount;
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  // Split prices for GST (18%)
  const basePrice = Math.round(totalAmount / 1.18);
  const gstAmount = totalAmount - basePrice;

  // Elegant short Invoice ID
  const invoiceId = `SE/2026/${customer.id.substring(0, 6).toUpperCase()}`;

  // Estimate warranty expiry date
  const getWarrantyExpiry = () => {
    if (warranty === 0) return 'No Warranty';
    const pDate = customer.purchaseDate?.toDate ? customer.purchaseDate.toDate() : new Date(customer.purchaseDate);
    const expDate = new Date(pDate);
    expDate.setMonth(expDate.getMonth() + warranty);
    return expDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/40 backdrop-blur-sm" id="invoice-modal-overlay">
          {/* Print specific CSS override */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #print-invoice-area, #print-invoice-area * {
                visibility: visible;
              }
              #print-invoice-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          {/* Backdrop click */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-8 no-print"
            id="invoice-modal-container"
          >
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-slate-800 text-sm">Customer Invoice Memo</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-600/10 transition-all"
                  id="print-invoice-action-btn"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  id="close-invoice-btn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Invoice Sheet */}
            <div className="max-h-[80vh] overflow-y-auto p-6 sm:p-10" id="invoice-scroll-container">
              
              {/* Actual Printable Invoice Card */}
              <div 
                className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm text-slate-800" 
                id="print-invoice-area"
              >
                {/* Invoice Letterhead */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6 border-slate-100">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-sm tracking-tighter">
                        <span>SE</span>
                      </div>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight">
                        SETHI ELECTRONICS
                      </h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed max-w-sm">
                      Premium Electronics & Electrical Retailer • Authorized Service Partner<br />
                      H-4, Main Market, Sector 11, Dwarka, New Delhi - 110075<br />
                      Support: +91 98765 43210 | info@sethielectronics.com
                    </p>
                  </div>
                  
                  <div className="sm:text-right">
                    <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-bold text-xs tracking-wider uppercase mb-2">
                      Retail Cash Memo
                    </span>
                    <p className="text-xs font-semibold text-slate-400">Invoice ID</p>
                    <p className="text-sm font-bold text-slate-900 font-mono tracking-tight">{invoiceId}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-2">Date of Issue</p>
                    <p className="text-sm font-semibold text-slate-800">{formatDate(customer.purchaseDate)}</p>
                  </div>
                </div>

                {/* Billing details & Warranties Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-slate-100 text-sm">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      Customer / Billing Info
                    </h3>
                    <p className="font-bold text-slate-900">{customer.customerName}</p>
                    <p className="text-slate-600 font-medium mt-1">📞 +91 {customer.phoneNumber}</p>
                    <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-xs whitespace-pre-wrap">
                      📍 {customer.address}
                    </p>
                  </div>

                  <div className="md:border-l md:pl-6 border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      Service & Support Info
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-500">Warranty Status:</span>
                        {warranty > 0 ? (
                          <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            <ShieldCheck className="h-3 w-3" />
                            <span>{warranty} Months Active</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                            No Warranty
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-500">Warranty Expiry:</span>
                        <span className="text-slate-800 font-semibold">{getWarrantyExpiry()}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-500">Payment Status:</span>
                        {paymentStatus === 'paid' ? (
                          <span className="px-2 py-0.5 rounded-md text-emerald-700 bg-emerald-50 border border-emerald-100 font-bold uppercase text-[10px]">
                            Paid In Full
                          </span>
                        ) : paymentStatus === 'pending' ? (
                          <span className="px-2 py-0.5 rounded-md text-amber-700 bg-amber-50 border border-amber-100 font-bold uppercase text-[10px]">
                            Dues Pending
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-blue-700 bg-blue-50 border border-blue-100 font-bold uppercase text-[10px]">
                            Installment / EMI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="py-6">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5">S.No.</th>
                        <th className="py-2.5">Item & Specification</th>
                        <th className="py-2.5 text-right">HSN</th>
                        <th className="py-2.5 text-right">Base Price</th>
                        <th className="py-2.5 text-right">GST (18%)</th>
                        <th className="py-2.5 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-3 font-medium text-slate-400">01</td>
                        <td className="py-3 font-semibold text-slate-900">{customer.productPurchased}</td>
                        <td className="py-3 text-right font-mono text-xs text-slate-400">8528</td>
                        <td className="py-3 text-right font-mono">{formatCurrency(basePrice)}</td>
                        <td className="py-3 text-right font-mono text-xs text-slate-400">{formatCurrency(gstAmount)}</td>
                        <td className="py-3 text-right font-bold text-slate-900 font-mono">{formatCurrency(totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Payment Breakdown / Totals summary */}
                <div className="border-t border-slate-100 pt-5 flex flex-col items-end">
                  <div className="w-full sm:w-64 space-y-2.5 text-sm font-medium">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span className="font-mono text-slate-700">{formatCurrency(basePrice)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Total Tax (GST 18%):</span>
                      <span className="font-mono text-slate-700">{formatCurrency(gstAmount)}</span>
                    </div>
                    
                    <div className="flex justify-between text-slate-900 font-bold text-base border-t border-dashed border-slate-200 pt-2.5">
                      <span>Grand Total:</span>
                      <span className="font-mono text-indigo-700">{formatCurrency(totalAmount)}</span>
                    </div>

                    <div className="flex justify-between text-emerald-700 text-xs font-semibold pt-1">
                      <span>Amount Paid:</span>
                      <span className="font-mono">{formatCurrency(paidAmount)}</span>
                    </div>

                    {dueAmount > 0 && (
                      <div className="flex justify-between text-rose-600 text-xs font-bold border-t border-slate-100 pt-1">
                        <span>Outstanding Balance:</span>
                        <span className="font-mono">{formatCurrency(dueAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Memo Footer - Terms & Signature */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-10 border-t border-slate-100 mt-10 text-[10px] text-slate-400 leading-relaxed">
                  <div>
                    <h4 className="font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Terms & Conditions</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Warranty coverage is provided solely by the respective manufacturer.</li>
                      <li>Goods once sold will not be returned or exchanged under any circumstances.</li>
                      <li>All repairs/installations require presenting this memo or receipt.</li>
                      <li>For support, contact Sethi Electronics authorized center at Dwarka.</li>
                    </ol>
                  </div>
                  
                  <div className="flex justify-between items-end sm:text-right pt-6 sm:pt-0">
                    <div className="text-center">
                      <div className="w-28 border-b border-slate-300 mx-auto mb-1" />
                      <p className="text-[9px] font-bold text-slate-400">Customer Signature</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-32 border-b border-slate-300 mx-auto mb-1" />
                      <p className="text-[9px] font-bold text-slate-600 uppercase">For Sethi Electronics</p>
                    </div>
                  </div>
                </div>

              </div>
              
            </div>

            {/* Print Friendly Tip Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
              💡 Tip: Click the **Print / PDF** button above to save this invoice as a PDF or print directly.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
