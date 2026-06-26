import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogOut,
  User,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Phone,
  Trash2,
  Edit3,
  MapPin,
  Laptop,
  Coins,
  Send,
  X,
  Check,
  FileJson,
  CalendarDays,
  FilterX,
  ShieldCheck,
  FileText,
  Percent,
  Clock,
  AlertCircle,
  Eye,
  PlusCircle
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { Customer, CustomerInput, OperationType, Purchase } from '../types';
import CustomerModal from './CustomerModal';
import DeleteDialog from './DeleteDialog';
import InvoiceModal from './InvoiceModal';

interface DashboardProps {
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  onAddToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function Dashboard({ user, onAddToast }: DashboardProps) {
  // Firestore data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterAddress, setFilterAddress] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterWarranty, setFilterWarranty] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected customer IDs (multiple selection)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal and Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCustomer, setModalCustomer] = useState<Customer | null>(null);
  const [invoiceCustomer, setInvoiceCustomer] = useState<Customer | null>(null);

  // Duplicate Check state
  const [duplicateCheckData, setDuplicateCheckData] = useState<{
    existingCustomer: Customer;
    newPurchaseInput: CustomerInput;
  } | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Broadcast Modal state
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [sentBroadcastIds, setSentBroadcastIds] = useState<Set<string>>(new Set());
  const [broadcastTemplate, setBroadcastTemplate] = useState(
    "Hello {{CustomerName}},\n\nThank you for purchasing {{ProductPurchased}} from Sethi Electronics.\n\nWe appreciate your support!"
  );
  const [isSimulatingBroadcast, setIsSimulatingBroadcast] = useState(false);

  // Real-time Firestore subscription
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Customer[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Customer);
      });
      setCustomers(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'customers');
      onAddToast('Failed to load customer database.', 'error');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [onAddToast]);

  // Extract unique addresses and products for quick filter dropdowns
  const uniqueAddresses = useMemo(() => {
    const addresses = customers.map(c => c.address.trim()).filter(Boolean);
    return Array.from(new Set(addresses)).sort();
  }, [customers]);

  // Helper to retrieve all purchases for a customer, with backward-compatibility fallback
  const getCustomerPurchases = (customer: Customer): Purchase[] => {
    if (customer.purchaseHistory && customer.purchaseHistory.length > 0) {
      return customer.purchaseHistory;
    }
    return [{
      id: 'p_initial',
      productPurchased: customer.productPurchased,
      purchasePrice: customer.purchasePrice,
      purchaseDate: customer.purchaseDate,
      warrantyMonths: customer.warrantyMonths ?? 12,
      paymentStatus: customer.paymentStatus ?? 'paid',
      amountPaid: customer.amountPaid ?? customer.purchasePrice,
    }];
  };

  const uniqueProducts = useMemo(() => {
    const products: string[] = [];
    customers.forEach(c => {
      getCustomerPurchases(c).forEach(p => {
        if (p.productPurchased) {
          products.push(p.productPurchased.trim());
        }
      });
    });
    return Array.from(new Set(products)).sort();
  }, [customers]);

  const financialSummary = useMemo(() => {
    let totalSales = 0;
    let totalPaid = 0;
    let activeWarranties = 0;
    const today = new Date();

    customers.forEach((c) => {
      const purchases = getCustomerPurchases(c);
      purchases.forEach((p) => {
        totalSales += p.purchasePrice;
        totalPaid += p.amountPaid ?? p.purchasePrice;

        if (p.warrantyMonths && p.warrantyMonths > 0) {
          const pDate = p.purchaseDate?.toDate ? p.purchaseDate.toDate() : new Date(p.purchaseDate);
          const expDate = new Date(pDate);
          expDate.setMonth(expDate.getMonth() + p.warrantyMonths);
          if (expDate.getTime() > today.getTime()) {
            activeWarranties++;
          }
        }
      });
    });

    return {
      totalSales,
      totalPaid,
      totalDue: Math.max(0, totalSales - totalPaid),
      activeWarranties,
    };
  }, [customers]);

  // Multiple selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const currentFilteredIds = filteredCustomers.map(c => c.id);
      setSelectedIds(new Set(currentFilteredIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Helper to format dates elegantly
  const formatDateStr = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Helper to determine if warranty is active, expired, or n/a
  const getWarrantyStatus = (item: { purchaseDate?: any; warrantyMonths?: number }) => {
    if (item.warrantyMonths === 0 || item.warrantyMonths === undefined) {
      return { status: 'none', label: 'No Warranty', daysLeft: 0, colorClass: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    
    const pDate = item.purchaseDate?.toDate ? item.purchaseDate.toDate() : new Date(item.purchaseDate);
    const expDate = new Date(pDate);
    expDate.setMonth(expDate.getMonth() + item.warrantyMonths);
    
    const today = new Date();
    const msDiff = expDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 0) {
      return {
        status: 'active',
        label: `Active • ${daysLeft}d left`,
        expiryDate: expDate,
        daysLeft,
        colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100'
      };
    } else {
      return {
        status: 'expired',
        label: 'Expired',
        expiryDate: expDate,
        daysLeft,
        colorClass: 'bg-rose-50 text-rose-700 border-rose-100'
      };
    }
  };

  // Real-time compound filtering and search logic
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const purchases = getCustomerPurchases(customer);

      // 1. Search filter
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        customer.customerName.toLowerCase().includes(searchLower) ||
        customer.phoneNumber.includes(searchLower) ||
        purchases.some(p => p.productPurchased.toLowerCase().includes(searchLower));

      // 2. Address filter
      const matchesAddress = !filterAddress || 
        customer.address.toLowerCase().includes(filterAddress.toLowerCase());

      // 3. Product filter
      const matchesProduct = !filterProduct || 
        purchases.some(p => p.productPurchased.toLowerCase().includes(filterProduct.toLowerCase()));

      // 4. Date filter (exact or year/month match)
      let matchesDate = true;
      if (filterDate) {
        matchesDate = purchases.some(p => {
          if (!p.purchaseDate) return false;
          const pDate = p.purchaseDate.toDate ? p.purchaseDate.toDate() : new Date(p.purchaseDate);
          const filterDateObj = new Date(filterDate);
          return (
            pDate.getFullYear() === filterDateObj.getFullYear() &&
            pDate.getMonth() === filterDateObj.getMonth() &&
            pDate.getDate() === filterDateObj.getDate()
          );
        });
      }

      // 5. Price range filters
      const minVal = filterMinPrice ? Number(filterMinPrice) : -Infinity;
      const maxVal = filterMaxPrice ? Number(filterMaxPrice) : Infinity;
      const matchesPrice = purchases.some(p => p.purchasePrice >= minVal && p.purchasePrice <= maxVal);

      // 6. Warranty filter
      let matchesWarranty = true;
      if (filterWarranty !== 'all') {
        matchesWarranty = purchases.some(p => {
          const wInfo = getWarrantyStatus(p);
          return wInfo.status === filterWarranty;
        });
      }

      // 7. Payment filter
      let matchesPayment = true;
      if (filterPayment !== 'all') {
        matchesPayment = purchases.some(p => {
          const pStatus = p.paymentStatus ?? 'paid';
          return pStatus === filterPayment;
        });
      }

      return matchesSearch && matchesAddress && matchesProduct && matchesDate && matchesPrice && matchesWarranty && matchesPayment;
    });
  }, [customers, searchTerm, filterAddress, filterProduct, filterDate, filterMinPrice, filterMaxPrice, filterWarranty, filterPayment]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterAddress, filterProduct, filterDate, filterMinPrice, filterMaxPrice, filterWarranty, filterPayment]);

  // Pagination bounds
  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(startIdx, startIdx + pageSize);
  }, [filteredCustomers, currentPage]);

  // Clear all filters
  const handleResetFilters = () => {
    setFilterAddress('');
    setFilterProduct('');
    setFilterDate('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterWarranty('all');
    setFilterPayment('all');
    setSearchTerm('');
    onAddToast('All filters cleared', 'info');
  };

  // Add / Edit submission
  const handleSaveCustomer = async (input: CustomerInput) => {
    try {
      if (!modalCustomer) {
        // ADD Mode - check for duplicate customer phone number
        const existingCustomer = customers.find(
          c => c.phoneNumber.replace(/\D/g, '') === input.phoneNumber.replace(/\D/g, '')
        );
        if (existingCustomer) {
          setDuplicateCheckData({
            existingCustomer,
            newPurchaseInput: input
          });
          return;
        }
      }

      const priceVal = Number(input.purchasePrice);
      // Construct date object using local date format so that we store local timezone correctly
      const dateParts = input.purchaseDate.split('-');
      const pDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
      
      const payload: any = {
        customerName: input.customerName.trim(),
        phoneNumber: input.phoneNumber.trim(),
        address: input.address.trim(),
        productPurchased: input.productPurchased.trim(),
        purchasePrice: priceVal,
        purchaseDate: Timestamp.fromDate(pDate),
        warrantyMonths: Number(input.warrantyMonths),
        paymentStatus: input.paymentStatus,
        amountPaid: input.paymentStatus === 'paid' ? priceVal : Number(input.amountPaid),
      };

      if (modalCustomer) {
        // EDIT Mode
        payload.createdAt = modalCustomer.createdAt; // Retain immutable createdAt
        const docRef = doc(db, 'customers', modalCustomer.id);
        await updateDoc(docRef, payload);
        onAddToast(`Updated ${input.customerName} successfully`, 'success');
      } else {
        // ADD Mode - no duplicate found, safe to create
        payload.createdAt = Timestamp.now();
        await addDoc(collection(db, 'customers'), payload);
        onAddToast(`Saved ${input.customerName} as a customer`, 'success');
      }
    } catch (error) {
      handleFirestoreError(error, modalCustomer ? OperationType.UPDATE : OperationType.CREATE, 'customers');
      onAddToast('An error occurred while saving customer record.', 'error');
      throw error;
    }
  };

  // Append new purchase to duplicate customer
  const handleConfirmAddPurchase = async () => {
    if (!duplicateCheckData) return;
    const { existingCustomer, newPurchaseInput } = duplicateCheckData;
    
    try {
      const priceVal = Number(newPurchaseInput.purchasePrice);
      const dateParts = newPurchaseInput.purchaseDate.split('-');
      const pDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
      
      const newPurchase: Purchase = {
        id: `p_${Date.now()}`,
        productPurchased: newPurchaseInput.productPurchased.trim(),
        purchasePrice: priceVal,
        purchaseDate: Timestamp.fromDate(pDate),
        warrantyMonths: Number(newPurchaseInput.warrantyMonths),
        paymentStatus: newPurchaseInput.paymentStatus,
        amountPaid: newPurchaseInput.paymentStatus === 'paid' ? priceVal : Number(newPurchaseInput.amountPaid),
      };

      const history = getCustomerPurchases(existingCustomer);
      const updatedHistory = [...history, newPurchase];

      const docRef = doc(db, 'customers', existingCustomer.id);
      await updateDoc(docRef, {
        productPurchased: newPurchase.productPurchased,
        purchasePrice: newPurchase.purchasePrice,
        purchaseDate: newPurchase.purchaseDate,
        warrantyMonths: newPurchase.warrantyMonths,
        paymentStatus: newPurchase.paymentStatus,
        amountPaid: newPurchase.amountPaid,
        purchaseHistory: updatedHistory,
      });

      onAddToast(`Added ${newPurchase.productPurchased} purchase to existing customer ${existingCustomer.customerName} successfully!`, 'success');
      setDuplicateCheckData(null);
    } catch (error) {
      console.error('Failed to add purchase to existing customer:', error);
      onAddToast('An error occurred while adding purchase.', 'error');
    }
  };

  // View specific purchase invoice
  const handleViewPurchaseInvoice = (customer: Customer, purchase: Purchase) => {
    const tempCustomer: Customer = {
      ...customer,
      productPurchased: purchase.productPurchased,
      purchasePrice: purchase.purchasePrice,
      purchaseDate: purchase.purchaseDate,
      warrantyMonths: purchase.warrantyMonths,
      paymentStatus: purchase.paymentStatus,
      amountPaid: purchase.amountPaid,
    };
    setInvoiceCustomer(tempCustomer);
  };

  // Trigger Edit modal
  const handleEditClick = (customer: Customer) => {
    setModalCustomer(customer);
    setIsModalOpen(true);
  };

  // Trigger Delete Modal
  const handleDeleteClick = (customer: Customer) => {
    setDeletingCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    try {
      const docRef = doc(db, 'customers', deletingCustomer.id);
      await deleteDoc(docRef);
      
      // Clean up selections
      if (selectedIds.has(deletingCustomer.id)) {
        const next = new Set(selectedIds);
        next.delete(deletingCustomer.id);
        setSelectedIds(next);
      }
      
      onAddToast(`Deleted customer ${deletingCustomer.customerName}`, 'success');
      setIsDeleteDialogOpen(false);
      setDeletingCustomer(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${deletingCustomer.id}`);
      onAddToast('Failed to delete customer', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // WhatsApp helper - individual
  const triggerWhatsApp = (customer: Customer) => {
    const rawMsg = `Hello ${customer.customerName},\n\nThank you for purchasing from Sethi Electronics.\n\nWe appreciate your support.`;
    const cleanPhone = customer.phoneNumber.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(rawMsg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOpenBroadcast = () => {
    setSentBroadcastIds(new Set());
    setIsBroadcastOpen(true);
  };

  const handleSendSingleBroadcast = (customer: Customer) => {
    const parsedMessage = broadcastTemplate
      .replace(/\{\{CustomerName\}\}/g, customer.customerName)
      .replace(/\{\{ProductPurchased\}\}/g, customer.productPurchased);
    
    const cleanPhone = customer.phoneNumber.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(parsedMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    
    setSentBroadcastIds(prev => {
      const next = new Set(prev);
      next.add(customer.id);
      return next;
    });
  };

  const handleSendAllBroadcast = () => {
    const selectedCustomers = customers.filter(c => selectedIds.has(c.id));
    if (selectedCustomers.length === 0) return;

    setIsSimulatingBroadcast(true);
    
    selectedCustomers.forEach((customer, idx) => {
      setTimeout(() => {
        const parsedMessage = broadcastTemplate
          .replace(/\{\{CustomerName\}\}/g, customer.customerName)
          .replace(/\{\{ProductPurchased\}\}/g, customer.productPurchased);
        
        const cleanPhone = customer.phoneNumber.replace(/\D/g, '');
        const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(parsedMessage)}`;
        window.open(url, '_blank', 'noopener,noreferrer');

        setSentBroadcastIds(prev => {
          const next = new Set(prev);
          next.add(customer.id);
          return next;
        });

        if (idx === selectedCustomers.length - 1) {
          setIsSimulatingBroadcast(false);
          setSelectedIds(new Set());
          setIsBroadcastOpen(false);
          onAddToast(`Opened WhatsApp chat tabs for all ${selectedCustomers.length} selected customers successfully!`, 'success');
        }
      }, idx * 1000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" id="admin-dashboard">
      
      {/* 1. Header Navigation */}
      <nav className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40" id="nav-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-600/20 font-sans font-black text-sm tracking-tighter" id="custom-logo">
                <span className="relative z-10">SE</span>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" title="System Online" />
              </div>
              <div>
                <span className="font-extrabold bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent text-base sm:text-lg block tracking-tight leading-none">
                  Sethi Electronics - ERP System
                </span>
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                  Internal Portal
                </span>
              </div>
            </div>

            {/* User Meta & Log Out */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-700 leading-tight">
                  {user.displayName || 'Shop Admin'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {user.email}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Admin" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="h-4 w-4 text-indigo-600" />
                )}
              </div>
              {/* No sign-out needed */}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. Main content block */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Banner with info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/40">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
              Customer Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create, edit, search, and manage customer sales records, and integrate WhatsApp messaging instantly.
            </p>
          </div>
          <button
            onClick={() => {
              setModalCustomer(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-600/10 cursor-pointer self-start md:self-auto shrink-0"
            id="add-customer-top-btn"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>

        {/* 3. Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-indigo-50 rounded-xl text-indigo-600">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Business Sales
              </span>
              <span className="text-2xl font-bold text-slate-900" id="metric-total-sales">
                {formatCurrency(financialSummary.totalSales)}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Collected Revenue
              </span>
              <span className="text-2xl font-bold text-slate-900 text-emerald-600" id="metric-collected-revenue">
                {formatCurrency(financialSummary.totalPaid)}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Outstanding Dues
              </span>
              <span className={`text-2xl font-bold ${financialSummary.totalDue > 0 ? 'text-amber-600' : 'text-slate-900'}`} id="metric-outstanding-dues">
                {formatCurrency(financialSummary.totalDue)}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-violet-50 rounded-xl text-violet-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Warranties
              </span>
              <span className="text-2xl font-bold text-slate-900" id="metric-active-warranties">
                {financialSummary.activeWarranties}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Controls Section (Search & Filter toggles) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search by customer name, phone, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm bg-slate-50/50"
                id="search-bar"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all w-full md:w-auto ${
                  showFilters || filterAddress || filterProduct || filterDate || filterMinPrice || filterMaxPrice || filterWarranty !== 'all' || filterPayment !== 'all'
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
                id="filter-toggle-btn"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {(filterAddress || filterProduct || filterDate || filterMinPrice || filterMaxPrice || filterWarranty !== 'all' || filterPayment !== 'all') && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-full font-bold">
                    {[filterAddress, filterProduct, filterDate, filterMinPrice || filterMaxPrice, filterWarranty !== 'all' ? 'w' : '', filterPayment !== 'all' ? 'p' : ''].filter(Boolean).length}
                  </span>
                )}
              </button>

              {/* Reset Filters Quick Button if active */}
              {(filterAddress || filterProduct || filterDate || filterMinPrice || filterMaxPrice || filterWarranty !== 'all' || filterPayment !== 'all' || searchTerm) && (
                <button
                  onClick={handleResetFilters}
                  className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-100 rounded-xl transition-all"
                  id="reset-filters-btn"
                  title="Clear All Filters"
                >
                  <FilterX className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Expanded Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-slate-100 pt-4"
                id="filters-expanded-panel"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pb-1">
                  
                  {/* Address Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Filter by Address
                    </label>
                    <select
                      value={filterAddress}
                      onChange={(e) => setFilterAddress(e.target.value)}
                      className="block w-full py-2.5 px-3 rounded-xl border border-slate-200 text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      id="filter-address-select"
                    >
                      <option value="">All Addresses</option>
                      {uniqueAddresses.map((addr) => (
                        <option key={addr} value={addr}>{addr}</option>
                      ))}
                    </select>
                  </div>

                  {/* Product Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Filter by Product
                    </label>
                    <select
                      value={filterProduct}
                      onChange={(e) => setFilterProduct(e.target.value)}
                      className="block w-full py-2.5 px-3 rounded-xl border border-slate-200 text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      id="filter-product-select"
                    >
                      <option value="">All Products</option>
                      {uniqueProducts.map((prod) => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                    </select>
                  </div>

                  {/* Warranty Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Filter by Warranty
                    </label>
                    <select
                      value={filterWarranty}
                      onChange={(e) => setFilterWarranty(e.target.value)}
                      className="block w-full py-2.5 px-3 rounded-xl border border-slate-200 text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      id="filter-warranty-select"
                    >
                      <option value="all">All Warranties</option>
                      <option value="active">Active Warranty</option>
                      <option value="expired">Expired Warranty</option>
                      <option value="none">No Warranty</option>
                    </select>
                  </div>

                  {/* Payment Status Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Payment Status
                    </label>
                    <select
                      value={filterPayment}
                      onChange={(e) => setFilterPayment(e.target.value)}
                      className="block w-full py-2.5 px-3 rounded-xl border border-slate-200 text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      id="filter-payment-select"
                    >
                      <option value="all">All Payments</option>
                      <option value="paid">Fully Paid</option>
                      <option value="pending">Due / Pending</option>
                      <option value="emi">Installment / EMI</option>
                    </select>
                  </div>

                  {/* Price Range Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Price Range (₹)
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filterMinPrice}
                        onChange={(e) => setFilterMinPrice(e.target.value)}
                        className="block w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        id="filter-price-min"
                      />
                      <span className="text-slate-400 text-xs font-medium">to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filterMaxPrice}
                        onChange={(e) => setFilterMaxPrice(e.target.value)}
                        className="block w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        id="filter-price-max"
                      />
                    </div>
                  </div>

                  {/* Purchase Date Filter */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="block w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-900 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      id="filter-purchase-date"
                    />
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5. Active Selections Actions Panel */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              id="selection-action-bar"
            >
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500 p-2 rounded-lg">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-sm block">
                    {selectedIds.size} {selectedIds.size === 1 ? 'Customer' : 'Customers'} Selected
                  </span>
                  <span className="text-xs text-indigo-200">
                    Perform batch actions on the selected customer records.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-4 py-2 text-xs font-medium text-indigo-100 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  id="deselect-all-btn"
                >
                  Deselect All
                </button>
                <button
                  onClick={handleOpenBroadcast}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl shadow-sm transition-all shrink-0"
                  id="send-broadcast-btn"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send WhatsApp Message
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6. Main Data Container (Desktop table / Mobile stack card) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="data-container">
          {loading ? (
            /* Loading State Skeleton */
            <div className="p-8 space-y-4" id="skeleton-loader">
              <div className="flex items-center justify-between">
                <div className="h-6 bg-slate-100 rounded-lg w-1/4 animate-pulse" />
                <div className="h-10 bg-slate-100 rounded-lg w-12 animate-pulse" />
              </div>
              <hr className="border-slate-100" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <div className="h-4 bg-slate-100 rounded w-4 animate-pulse" />
                    <div className="h-10 bg-slate-100 rounded-lg flex-1 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center flex flex-col items-center justify-center" id="empty-state">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 text-slate-400">
                <User className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900" id="empty-state-title">
                No Customers Found
              </h3>
              <p className="text-sm text-slate-500 mt-1.5 max-w-sm" id="empty-state-description">
                {customers.length === 0 
                  ? "Sethi Electronics customer directory is currently empty. Click below to add your first customer record." 
                  : "No customer records match your selected filter criteria. Try clearing search or filter terms."}
              </p>
              {customers.length === 0 ? (
                <button
                  onClick={() => {
                    setModalCustomer(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                  id="empty-state-add-btn"
                >
                  <Plus className="w-4 h-4" />
                  Register First Customer
                </button>
              ) : (
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-all"
                  id="empty-state-clear-filters-btn"
                >
                  Clear Search & Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (md and up) */}
              <div className="hidden md:block overflow-x-auto" id="desktop-table-container">
                <table className="w-full text-left border-collapse" id="customer-table">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs tracking-wider uppercase">
                      {/* Selection check */}
                      <th className="py-4 px-6 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={paginatedCustomers.every(c => selectedIds.has(c.id))}
                          onChange={handleSelectAll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 cursor-pointer accent-indigo-600"
                          aria-label="Select all customers on current page"
                        />
                      </th>
                      <th className="py-4 px-6">Customer Details</th>
                      <th className="py-4 px-6">Product & Price</th>
                      <th className="py-4 px-6">Warranty Status</th>
                      <th className="py-4 px-6">Payment & Dues</th>
                      <th className="py-4 px-6">Purchase Date</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {paginatedCustomers.map((customer) => {
                      const isSelected = selectedIds.has(customer.id);
                      return (
                        <tr
                          key={customer.id}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            isSelected ? 'bg-indigo-50/30' : ''
                          }`}
                          id={`row-${customer.id}`}
                        >
                          {/* Selector Checkbox */}
                          <td className="py-3 px-6 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(customer.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 cursor-pointer accent-indigo-600"
                              id={`select-${customer.id}`}
                              aria-label={`Select ${customer.customerName}`}
                            />
                          </td>

                          {/* Customer Details */}
                          <td className="py-3 px-6">
                            <div className="font-semibold text-slate-900">{customer.customerName}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{customer.phoneNumber}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]" title={customer.address}>
                              {customer.address}
                            </div>
                          </td>

                          {/* Product & Price */}
                          <td className="py-3 px-6">
                            <div className="space-y-3">
                              {getCustomerPurchases(customer).map((purchase) => (
                                <div key={purchase.id} className="flex items-center gap-1.5 h-6">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-100 text-slate-700 text-[11px] font-semibold rounded-md">
                                    <Laptop className="h-3 w-3 text-slate-400" />
                                    {purchase.productPurchased}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900">
                                    {formatCurrency(purchase.purchasePrice)}
                                  </span>
                                  <button
                                    onClick={() => handleViewPurchaseInvoice(customer, purchase)}
                                    className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-all"
                                    title="Invoice for this purchase"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Warranty Status */}
                          <td className="py-3 px-6">
                            <div className="space-y-3">
                              {getCustomerPurchases(customer).map((purchase) => {
                                const wInfo = getWarrantyStatus(purchase);
                                return (
                                  <div key={purchase.id} className="h-6 flex items-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${wInfo.colorClass}`}>
                                      <ShieldCheck className="h-3.5 w-3.5" />
                                      <span>{wInfo.label}</span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* Payment & Dues */}
                          <td className="py-3 px-6">
                            <div className="space-y-3">
                              {getCustomerPurchases(customer).map((purchase) => {
                                const status = purchase.paymentStatus ?? 'paid';
                                const total = purchase.purchasePrice;
                                const paid = purchase.amountPaid ?? total;
                                const due = Math.max(0, total - paid);
                                
                                return (
                                  <div key={purchase.id} className="h-6 flex items-center">
                                    {status === 'paid' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        Fully Paid
                                      </span>
                                    ) : status === 'pending' ? (
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                          Pending
                                        </span>
                                        <span className="text-[10px] text-amber-600 font-bold">Due: {formatCurrency(due)}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                          EMI
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium font-mono">
                                          DP: {formatCurrency(paid)}/{formatCurrency(total)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* Purchase Date */}
                          <td className="py-3 px-6 text-slate-500 whitespace-nowrap">
                            <div className="space-y-3">
                              {getCustomerPurchases(customer).map((purchase) => (
                                <div key={purchase.id} className="h-6 flex items-center text-xs font-medium font-mono">
                                  {formatDateStr(purchase.purchaseDate)}
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Row Actions */}
                          <td className="py-3 px-6">
                            <div className="flex items-center justify-center gap-1">
                              {/* WhatsApp Direct Action */}
                              <button
                                onClick={() => triggerWhatsApp(customer)}
                                className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100"
                                id={`whatsapp-row-btn-${customer.id}`}
                                title="Open WhatsApp Message"
                              >
                                <Phone className="h-4.5 w-4.5" />
                              </button>

                              {/* Invoice / Cash Memo Action */}
                              <button
                                onClick={() => setInvoiceCustomer(customer)}
                                className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                                id={`invoice-row-btn-${customer.id}`}
                                title="Generate Invoice Cash Memo"
                              >
                                <FileText className="h-4.5 w-4.5" />
                              </button>

                              {/* Edit Action */}
                              <button
                                onClick={() => handleEditClick(customer)}
                                className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                                id={`edit-row-btn-${customer.id}`}
                                title="Edit Customer details"
                              >
                                <Edit3 className="h-4.5 w-4.5" />
                              </button>

                              {/* Delete Action */}
                              <button
                                onClick={() => handleDeleteClick(customer)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                id={`delete-row-btn-${customer.id}`}
                                title="Delete Customer record"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW (stacked list under md) */}
              <div className="block md:hidden divide-y divide-slate-100" id="mobile-cards-container">
                {paginatedCustomers.map((customer) => {
                  const isSelected = selectedIds.has(customer.id);
                  const purchases = getCustomerPurchases(customer);

                  return (
                    <div
                      key={customer.id}
                      className={`p-4 space-y-3.5 transition-colors ${
                        isSelected ? 'bg-indigo-50/20' : 'bg-white'
                      }`}
                      id={`mobile-card-${customer.id}`}
                    >
                      {/* Top Header line of card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {/* Selection Checkbox */}
                          <div className="pt-0.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(customer.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer accent-indigo-600"
                              id={`select-mob-${customer.id}`}
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-slate-900 leading-tight">
                              {customer.customerName}
                            </h4>
                            <span className="font-mono text-xs text-slate-500 block mt-0.5">
                              {customer.phoneNumber}
                            </span>
                          </div>
                        </div>

                        {/* Total Sales sum badge */}
                        <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          Total Purchases: {purchases.length}
                        </span>
                      </div>

                      {/* General Address */}
                      <div className="flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-100">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-slate-400">Address: </span>
                          <span className="text-slate-700 font-medium">{customer.address}</span>
                        </div>
                      </div>

                      {/* Purchases list */}
                      <div className="space-y-2.5">
                        {purchases.map((purchase, index) => {
                          const wInfoMob = getWarrantyStatus(purchase);
                          const statusMob = purchase.paymentStatus ?? 'paid';
                          const totalMob = purchase.purchasePrice;
                          const paidMob = purchase.amountPaid ?? totalMob;
                          const dueMob = Math.max(0, totalMob - paidMob);

                          return (
                            <div key={purchase.id} className="p-3 bg-slate-50/20 border border-slate-100 rounded-xl space-y-2 relative">
                              {purchases.length > 1 && (
                                <span className="absolute top-0 right-3 -translate-y-1/2 bg-indigo-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  Purchase #{index + 1}
                                </span>
                              )}

                              <div className="flex items-start justify-between gap-2 pt-0.5">
                                <div className="flex items-start gap-1.5">
                                  <Laptop className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-semibold text-slate-800 text-xs">{purchase.productPurchased}</span>
                                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                      {formatDateStr(purchase.purchaseDate)}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-extrabold text-indigo-600">
                                    {formatCurrency(totalMob)}
                                  </div>
                                  <button
                                    onClick={() => handleViewPurchaseInvoice(customer, purchase)}
                                    className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 font-bold hover:underline mt-1"
                                  >
                                    <FileText className="h-2.5 w-2.5" />
                                    <span>Invoice</span>
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 pt-1">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${wInfoMob.colorClass}`}>
                                  <ShieldCheck className="h-2.5 w-2.5" />
                                  <span>{wInfoMob.label}</span>
                                </span>

                                {statusMob === 'paid' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    Fully Paid
                                  </span>
                                ) : statusMob === 'pending' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                    Due: {formatCurrency(dueMob)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                                    EMI DP: {formatCurrency(paidMob)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/60">
                        <div className="flex items-center gap-1.5">
                          {/* Quick WhatsApp Action */}
                          <button
                            onClick={() => triggerWhatsApp(customer)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg transition-all"
                            id={`whatsapp-mob-btn-${customer.id}`}
                          >
                            <Phone className="h-3.5 w-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => handleEditClick(customer)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-100 rounded-lg transition-all"
                            id={`edit-mob-btn-${customer.id}`}
                            aria-label="Edit customer record"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteClick(customer)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 border border-slate-100 rounded-lg transition-all"
                            id={`delete-mob-btn-${customer.id}`}
                            aria-label="Delete customer record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION CONTROLS */}
              <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100" id="pagination-panel">
                <span className="text-xs font-semibold text-slate-500">
                  Showing <span className="text-slate-800">{Math.min(filteredCustomers.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
                  <span className="text-slate-800">{Math.min(filteredCustomers.length, currentPage * pageSize)}</span> of{' '}
                  <span className="text-slate-800">{filteredCustomers.length}</span> customer records
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all disabled:opacity-40"
                    id="prev-page-btn"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-1" id="pagination-pages">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      // Only show some pages if many
                      const isNearCurrent = Math.abs(currentPage - pageNum) <= 1;
                      const isEnds = pageNum === 1 || pageNum === totalPages;
                      
                      if (!isNearCurrent && !isEnds) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return <span key={pageNum} className="px-1.5 text-xs text-slate-400">...</span>;
                        }
                        return null;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8.5 h-8.5 text-xs font-bold rounded-xl transition-all border ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600'
                          }`}
                          id={`page-btn-${pageNum}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all disabled:opacity-40"
                    id="next-page-btn"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer info line */}
      <footer className="w-full text-center py-6 border-t border-slate-100 bg-white text-xs text-slate-400">
        Sethi Electronics internal database portal. Powered by Cloud Firestore.
      </footer>

      {/* 7. Modal: Add & Edit Customer */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalCustomer(null);
        }}
        onSave={handleSaveCustomer}
        customer={modalCustomer}
      />

      {/* 8. Dialog: Confirm Delete Customer */}
      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        customer={deletingCustomer}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setDeletingCustomer(null);
        }}
        isDeleting={isDeleting}
      />

      {/* 9. Modal: Mass WhatsApp Broadcast Sender Assistant */}
      <AnimatePresence>
        {isBroadcastOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/40 backdrop-blur-sm" id="broadcast-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-3xl border border-slate-100 shadow-xl overflow-hidden z-10 my-auto"
              id="broadcast-modal-content"
            >
              <div className="h-2 bg-emerald-500 w-full" />
              
              <div className="p-6 sm:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-950 flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Send className="w-5 h-5" />
                      </span>
                      WhatsApp Broadcast Assistant
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Directly initiate WhatsApp chat messages for selected customers with your customized template.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsBroadcastOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Template Editor & Message Preview */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Customize Message Template
                      </label>
                      <textarea
                        rows={4}
                        value={broadcastTemplate}
                        onChange={(e) => setBroadcastTemplate(e.target.value)}
                        className="block w-full text-slate-900 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 transition-all font-sans"
                        placeholder="Type broadcast message..."
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Dynamic tags: <code className="font-semibold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">{"{{CustomerName}}"}</code>, <code className="font-semibold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">{"{{ProductPurchased}}"}</code>.
                      </span>
                    </div>

                    {/* WhatsApp-Style Live Preview Bubble */}
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Live Message Preview
                      </span>
                      <div className="bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat p-4 rounded-xl border border-slate-200 min-h-[120px] flex items-end">
                        <div className="bg-[#d9fdd3] text-slate-800 p-3 rounded-xl rounded-tr-none shadow-xs text-xs font-sans max-w-[90%] ml-auto relative">
                          <span className="whitespace-pre-wrap block">
                            {(() => {
                              const firstSelected = customers.find(c => selectedIds.has(c.id));
                              const name = firstSelected?.customerName || 'Customer Name';
                              const product = firstSelected?.productPurchased || 'Product Name';
                              return broadcastTemplate
                                .replace(/\{\{CustomerName\}\}/g, name)
                                .replace(/\{\{ProductPurchased\}\}/g, product);
                            })()}
                          </span>
                          <span className="text-[9px] text-emerald-600 font-medium float-right mt-1 font-mono">
                            12:00 PM ✓✓
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Selected Recipients Queue */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Recipients Queue ({customers.filter(c => selectedIds.has(c.id)).length})
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {sentBroadcastIds.size} of {selectedIds.size} Sent
                        </span>
                      </div>
                      
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-h-64 overflow-y-auto space-y-2">
                        {customers.filter(c => selectedIds.has(c.id)).map(c => {
                          const isSent = sentBroadcastIds.has(c.id);
                          return (
                            <div key={c.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-xs border border-slate-100 text-xs">
                              <div className="space-y-0.5 max-w-[60%]">
                                <span className="font-bold text-slate-800 block truncate">{c.customerName}</span>
                                <span className="text-slate-400 font-mono block">{c.phoneNumber}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {isSent ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    ✓ Opened
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleSendSingleBroadcast(c)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all text-[10px] cursor-pointer"
                                  >
                                    Open Chat
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleSendAllBroadcast}
                        disabled={isSimulatingBroadcast}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/10 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isSimulatingBroadcast ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Opening Tabs sequentially...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Open Chats for All Selected ({selectedIds.size})</span>
                          </>
                        )}
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSentBroadcastIds(new Set());
                            onAddToast("Broadcast progress reset", "info");
                          }}
                          className="w-1/2 py-2 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                        >
                          Reset Progress
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBroadcastOpen(false)}
                          className="w-1/2 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. Modal: Duplicate Customer Phone Number Warning Dialog */}
      <AnimatePresence>
        {duplicateCheckData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" id="duplicate-warning-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden z-10 my-auto"
              id="duplicate-warning-modal"
            >
              <div className="h-2 bg-amber-500 w-full" />
              
              <div className="p-6 sm:p-8 space-y-6">
                {/* Header */}
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center p-3 bg-amber-50 rounded-2xl text-amber-600 mb-1">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Duplicate Phone Number Detected
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    This phone number already belongs to an existing customer in Sethi Electronics database.
                  </p>
                </div>

                {/* Existing Customer Summary Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Existing Record</span>
                    <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold font-mono">
                      {duplicateCheckData.existingCustomer.phoneNumber}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1">
                    <div>
                      <span className="block text-slate-400 text-xs">Customer Name</span>
                      <span className="font-semibold text-slate-800">{duplicateCheckData.existingCustomer.customerName}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-xs">Address</span>
                      <span className="text-slate-700 font-medium truncate block" title={duplicateCheckData.existingCustomer.address}>
                        {duplicateCheckData.existingCustomer.address}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Options Description */}
                <div className="space-y-3 pt-1">
                  {/* Option 2: Add purchase to existing customer */}
                  <button
                    onClick={handleConfirmAddPurchase}
                    className="w-full flex items-center gap-3.5 p-3.5 bg-indigo-50 border border-indigo-100 text-indigo-900 hover:bg-indigo-100/70 transition-all rounded-xl text-left cursor-pointer group"
                    id="duplicate-add-purchase-btn"
                  >
                    <span className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm border border-indigo-50 shrink-0">
                      <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </span>
                    <div>
                      <span className="block font-bold text-sm text-indigo-950">Add Purchase To Existing Customer</span>
                      <span className="block text-xs text-indigo-600 font-medium mt-0.5">
                        Append {duplicateCheckData.newPurchaseInput.productPurchased} ({formatCurrency(Number(duplicateCheckData.newPurchaseInput.purchasePrice))}) to this customer's record.
                      </span>
                    </div>
                  </button>

                  {/* Option 1: View existing customer */}
                  <button
                    onClick={() => {
                      const cust = duplicateCheckData.existingCustomer;
                      setDuplicateCheckData(null);
                      // Clear search / set search to phone so they are filtered and visible
                      setSearchTerm(cust.phoneNumber);
                      // Trigger Edit click for existing customer
                      handleEditClick(cust);
                    }}
                    className="w-full flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition-all rounded-xl text-left cursor-pointer group"
                    id="duplicate-view-existing-btn"
                  >
                    <span className="p-2 bg-white text-slate-600 rounded-lg shadow-sm border border-slate-100 shrink-0">
                      <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </span>
                    <div>
                      <span className="block font-bold text-sm text-slate-900">View Existing Customer Details</span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Cancel adding new purchase and inspect existing customer profile and full history.
                      </span>
                    </div>
                  </button>
                </div>

                {/* Cancel / Back to Edit Number */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setDuplicateCheckData(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Go Back & Edit Phone Number
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. Modal: Customer Printable Invoice Cash Memo */}
      <InvoiceModal
        isOpen={invoiceCustomer !== null}
        onClose={() => setInvoiceCustomer(null)}
        customer={invoiceCustomer}
      />
    </div>
  );
}
