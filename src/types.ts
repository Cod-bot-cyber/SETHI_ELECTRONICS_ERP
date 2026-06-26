export interface Purchase {
  id: string;
  productPurchased: string;
  purchasePrice: number;
  purchaseDate: any; // Firestore Timestamp
  warrantyMonths?: number;
  paymentStatus?: 'paid' | 'pending' | 'emi';
  amountPaid?: number;
}

export interface Customer {
  id: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  productPurchased: string;
  purchasePrice: number;
  purchaseDate: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  warrantyMonths?: number; // Warranty duration in months (e.g., 12, 24)
  paymentStatus?: 'paid' | 'pending' | 'emi'; // Payment status
  amountPaid?: number; // Amount paid so far
  purchaseHistory?: Purchase[];
}

export interface CustomerInput {
  customerName: string;
  phoneNumber: string;
  address: string;
  productPurchased: string;
  purchasePrice: string;
  purchaseDate: string; // "YYYY-MM-DD"
  warrantyMonths: string; // "12"
  paymentStatus: 'paid' | 'pending' | 'emi';
  amountPaid: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
