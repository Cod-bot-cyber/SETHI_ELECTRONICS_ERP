import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone, MapPin, Laptop, DollarSign, Calendar, Save, ShieldCheck, CreditCard } from 'lucide-react';
import { Customer, CustomerInput } from '../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CustomerInput) => Promise<void>;
  customer: Customer | null; // null if Adding, defined if Editing
}

export default function CustomerModal({ isOpen, onClose, onSave, customer }: CustomerModalProps) {
  const [formData, setFormData] = useState<CustomerInput>({
    customerName: '',
    phoneNumber: '',
    address: '',
    productPurchased: '',
    purchasePrice: '',
    purchaseDate: '',
    warrantyMonths: '12',
    paymentStatus: 'paid',
    amountPaid: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInput, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load customer data when editing
  useEffect(() => {
    if (customer) {
      // Convert Firestore Timestamp to YYYY-MM-DD string
      let dateStr = '';
      if (customer.purchaseDate) {
        const dateObj = customer.purchaseDate.toDate 
          ? customer.purchaseDate.toDate() 
          : new Date(customer.purchaseDate);
        dateStr = dateObj.toISOString().split('T')[0];
      }
      
      setFormData({
        customerName: customer.customerName,
        phoneNumber: customer.phoneNumber,
        address: customer.address,
        productPurchased: customer.productPurchased,
        purchasePrice: customer.purchasePrice.toString(),
        purchaseDate: dateStr,
        warrantyMonths: (customer.warrantyMonths ?? 12).toString(),
        paymentStatus: customer.paymentStatus ?? 'paid',
        amountPaid: (customer.amountPaid ?? customer.purchasePrice).toString(),
      });
    } else {
      // Reset form when adding
      setFormData({
        customerName: '',
        phoneNumber: '',
        address: '',
        productPurchased: '',
        purchasePrice: '',
        purchaseDate: new Date().toISOString().split('T')[0], // Default to today
        warrantyMonths: '12',
        paymentStatus: 'paid',
        amountPaid: '',
      });
    }
    setErrors({});
  }, [customer, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerInput, string>> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d+$/.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Phone number must contain only digits';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.productPurchased.trim()) {
      newErrors.productPurchased = 'Product purchased is required';
    }

    if (!formData.purchasePrice.trim()) {
      newErrors.purchasePrice = 'Purchase price is required';
    } else if (isNaN(Number(formData.purchasePrice)) || Number(formData.purchasePrice) < 0) {
      newErrors.purchasePrice = 'Purchase price must be a valid positive number';
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required';
    }

    if (formData.paymentStatus !== 'paid') {
      const amtPaid = formData.amountPaid.trim();
      const fieldLabel = formData.paymentStatus === 'emi' ? 'Downpayment (DP) amount' : 'Amount paid';
      if (!amtPaid) {
        newErrors.amountPaid = `${fieldLabel} is required`;
      } else if (isNaN(Number(amtPaid)) || Number(amtPaid) < 0) {
        newErrors.amountPaid = `${fieldLabel} must be a valid positive number`;
      } else if (Number(amtPaid) > Number(formData.purchasePrice)) {
        newErrors.amountPaid = `${fieldLabel} cannot exceed purchase price`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // For phone number, if user types non-digits, we can prevent it, or just let them type and validate
    if (name === 'phoneNumber') {
      const digitsOnly = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: digitsOnly }));
    } else {
      setFormData(prev => {
        const nextState = { ...prev, [name]: value };
        // If payment status is updated to "paid", automatically set amountPaid to match purchasePrice
        if (name === 'paymentStatus' && value === 'paid') {
          nextState.amountPaid = nextState.purchasePrice;
        }
        return nextState;
      });
    }

    // Clear error for this field
    if (errors[name as keyof CustomerInput]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Failed to save customer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="customer-modal-overlay">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Container for scrollability on small screens */}
          <div className="flex items-center justify-center min-h-screen w-full py-8">
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-[#111827] w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-10 my-auto"
              id="customer-modal-content"
            >
              {/* Top Accent bar */}
              <div className="h-2 bg-indigo-600 w-full" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-all"
                id="customer-modal-close-btn"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white" id="customer-modal-title">
                    {customer ? 'Edit Customer Details' : 'Add New Customer'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {customer ? 'Modify the customer details below to update records.' : 'Fill in the information below to register a new customer.'}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4" id="customer-form">
                  {/* Customer Name */}
                  <div>
                    <label htmlFor="customerName" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type="text"
                        name="customerName"
                        id="customerName"
                        value={formData.customerName}
                        onChange={handleChange}
                        placeholder="e.g. Ramesh Kumar"
                        className={`block w-full pl-10 pr-4 py-3 rounded-xl border text-slate-900 dark:text-white bg-white dark:bg-[#1f2937] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm ${
                          errors.customerName ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    {errors.customerName && (
                      <p className="text-xs text-red-500 mt-1" id="error-customerName">{errors.customerName}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label htmlFor="phoneNumber" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type="text"
                        name="phoneNumber"
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="e.g. 9876543210 (digits only)"
                        className={`block w-full pl-10 pr-4 py-3 rounded-xl border text-slate-900 dark:text-white bg-white dark:bg-[#1f2937] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm ${
                          errors.phoneNumber ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    {errors.phoneNumber && (
                      <p className="text-xs text-red-500 mt-1" id="error-phoneNumber">{errors.phoneNumber}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <label htmlFor="address" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                        <MapPin className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <textarea
                        name="address"
                        id="address"
                        rows={2}
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="e.g. Flat 302, Sector 15, Dwarka, New Delhi"
                        className={`block w-full pl-10 pr-4 py-2.5 rounded-xl border text-slate-900 dark:text-white bg-white dark:bg-[#1f2937] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-none ${
                          errors.address ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    {errors.address && (
                      <p className="text-xs text-red-500 mt-1" id="error-address">{errors.address}</p>
                    )}
                  </div>

                  {/* Product Purchased */}
                  <div>
                    <label htmlFor="productPurchased" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Product Purchased <span className="text-red-500">*</span>
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Laptop className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        type="text"
                        name="productPurchased"
                        id="productPurchased"
                        value={formData.productPurchased}
                        onChange={handleChange}
                        placeholder="e.g. LG 32-inch Smart TV"
                        className={`block w-full pl-10 pr-4 py-3 rounded-xl border text-slate-900 dark:text-white bg-white dark:bg-[#1f2937] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm ${
                          errors.productPurchased ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    {errors.productPurchased && (
                      <p className="text-xs text-red-500 mt-1" id="error-productPurchased">{errors.productPurchased}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Purchase Price */}
                    <div>
                      <label htmlFor="purchasePrice" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        Purchase Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <input
                          type="text"
                          name="purchasePrice"
                          id="purchasePrice"
                          value={formData.purchasePrice}
                          onChange={handleChange}
                          placeholder="e.g. 24999"
                          className={`block w-full pl-10 pr-4 py-3 rounded-xl border text-slate-900 dark:text-white bg-white dark:bg-[#1f2937] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm ${
                            errors.purchasePrice ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                      </div>
                      {errors.purchasePrice && (
                        <p className="text-xs text-red-500 mt-1" id="error-purchasePrice">{errors.purchasePrice}</p>
                      )}
                    </div>

                    {/* Purchase Date */}
                    <div>
                      <label htmlFor="purchaseDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        Purchase Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <input
                          type="date"
                          name="purchaseDate"
                          id="purchaseDate"
                          value={formData.purchaseDate}
                          onChange={handleChange}
                          className={`block w-full pl-10 pr-4 py-3 rounded-xl border text-slate-900 dark:text-white bg-white dark:bg-[#1f2937] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm ${
                            errors.purchaseDate ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                      </div>
                      {errors.purchaseDate && (
                        <p className="text-xs text-red-500 mt-1" id="error-purchaseDate">{errors.purchaseDate}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    {/* Payment Status */}
                    <div>
                      <label htmlFor="paymentStatus" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        Payment Status <span className="text-red-500">*</span>
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <CreditCard className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <select
                          name="paymentStatus"
                          id="paymentStatus"
                          value={formData.paymentStatus}
                          onChange={handleChange}
                          className="block w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-[#1f2937] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm appearance-none"
                        >
                          <option value="paid">Fully Paid</option>
                          <option value="pending">Due / Pending</option>
                          <option value="emi">Installment / EMI</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amount Paid (Conditional) */}
                  {formData.paymentStatus !== 'paid' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <label htmlFor="amountPaid" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        {formData.paymentStatus === 'emi' ? 'Downpayment (DP) Amount (₹)' : 'Amount Paid so far (₹)'} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative rounded-xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                        </div>
                        <input
                          type="text"
                          name="amountPaid"
                          id="amountPaid"
                          value={formData.amountPaid}
                          onChange={handleChange}
                          placeholder={formData.paymentStatus === 'emi' ? 'e.g. 5000 (Downpayment)' : 'e.g. 10000'}
                          className={`block w-full pl-10 pr-4 py-3 rounded-xl border text-slate-900 dark:text-white bg-white dark:bg-[#1f2937] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm ${
                            errors.amountPaid ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                      </div>
                      {errors.amountPaid && (
                        <p className="text-xs text-red-500 mt-1" id="error-amountPaid">{errors.amountPaid}</p>
                      )}
                    </motion.div>
                  )}

                  {/* Form Footer Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                      id="customer-modal-cancel-btn"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-600/10 transition-all disabled:opacity-50 cursor-pointer"
                      id="customer-modal-save-btn"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Customer
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
