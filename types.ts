export enum OrderStatus {
  PENDING = 'PENDING',
  COOKING = 'COOKING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BKASH = 'BKASH',
  NAGAD = 'NAGAD'
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKE_AWAY = 'TAKE_AWAY',
  DELIVERY = 'DELIVERY'
}

export interface Modifier {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  image?: string;
  inStock: boolean;
  quantity?: number; // Track daily stock count
  availableModifiers?: Modifier[];
}

export interface CartItem extends MenuItem {
  cartItemId: string;
  quantity: number;
  modifiers?: Modifier[];
  notes?: string;
  isPrinted?: boolean; // Track if sent to KOT
}

export interface Order {
  id: string;
  invoiceNumber?: string; // Sequential invoice number (e.g., INV-1001)
  tableId?: string; // Nullable for takeaway
  items: CartItem[];
  status: OrderStatus;
  type: OrderType;
  timestamp: Date;
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: PaymentMethod;
}

export interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  dateTime: Date;
  guests: number;
}

export interface Table {
  id: string;
  name: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  currentOrderId?: string;
  mergedInto?: string; // ID of the parent table if this table is merged into another
  reservations?: Reservation[];
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  threshold: number;
}

export interface SalesReport {
  date: string;
  totalSales: number;
  orderCount: number;
}

// --- NEW TYPES FOR SETTINGS ---

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  KITCHEN = 'KITCHEN',
  WAITER = 'WAITER'
}

export interface TeamMember {
  id: string;
  name: string;
  role: Role;
  pin?: string; // Simple access pin
  email?: string;
  phone?: string;
}

export interface StoreSettings {
  storeName: string;
  branchName: string;
  address: string;
  phone: string;
  email: string;
  currencySymbol: string;
  
  // Finance
  vatRate: number; // Percentage
  vatEnabled: boolean;
  serviceChargeRate: number; // Percentage
  serviceChargeEnabled: boolean;
  
  // Invoice
  invoiceHeader: string;
  invoiceFooter: string;
  invoicePrefix: string;
  invoiceStartingNumber: number;
  logoUrl?: string; // URL for the receipt logo
}