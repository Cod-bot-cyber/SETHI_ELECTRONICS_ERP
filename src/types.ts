export interface Customer {
  id: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  productPurchased: string;
  purchasePrice: number;
  purchaseDate: any; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
}

export interface CustomerInput {
  customerName: string;
  phoneNumber: string;
  address: string;
  productPurchased: string;
  purchasePrice: string;
  purchaseDate: string; // "YYYY-MM-DD"
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
