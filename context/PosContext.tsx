import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { Order, MenuItem, Table, InventoryItem, OrderStatus, PaymentMethod, CartItem, OrderType, Reservation, StoreSettings, TeamMember, Role, Modifier } from '../types';
import { MOCK_MENU, MOCK_TABLES, MOCK_INVENTORY, MOCK_ORDERS } from '../constants';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { ref, set, get, child, onValue } from 'firebase/database';

interface PosState {
  orders: Order[];
  menu: MenuItem[];
  tables: Table[];
  inventory: InventoryItem[];
  cart: CartItem[];
  settings: StoreSettings;
  teamMembers: TeamMember[];
  activeStaff: TeamMember | null; // Current logged-in staff member (session)
}

const DEFAULT_SETTINGS: StoreSettings = {
    storeName: 'Bhoj Restaurant',
    branchName: 'Main Branch',
    address: 'Dhaka, Bangladesh',
    phone: '+880 1XXX XXXXXX',
    email: 'info@bhoj.com',
    currencySymbol: '৳',
    vatRate: 5,
    vatEnabled: true,
    serviceChargeRate: 0,
    serviceChargeEnabled: false,
    invoiceHeader: 'BHOJ POS',
    invoiceFooter: 'Thank you for dining with us!',
    invoicePrefix: 'INV-',
    invoiceStartingNumber: 1001
};

type Action =
  | { type: 'SET_FULL_STATE'; payload: PosState }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'APPEND_TO_ORDER'; payload: { orderId: string; newItems: CartItem[]; additionalAmount: number } }
  | { type: 'MARK_ITEMS_AS_PRINTED'; payload: { orderId: string } }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { orderId: string; status: OrderStatus } }
  | { type: 'UPDATE_ORDER_PAYMENT'; payload: { orderId: string; paymentMethod: PaymentMethod } }
  | { type: 'UPDATE_TABLE_STATUS'; payload: { tableId: string; status: Table['status']; orderId?: string } }
  | { type: 'ADD_MENU_ITEM'; payload: MenuItem }
  | { type: 'UPDATE_MENU_ITEM'; payload: MenuItem }
  | { type: 'DELETE_MENU_ITEM'; payload: string }
  | { type: 'ADD_INVENTORY'; payload: InventoryItem }
  | { type: 'UPDATE_INVENTORY'; payload: InventoryItem }
  | { type: 'DELETE_INVENTORY'; payload: string }
  | { type: 'DEDUCT_INVENTORY'; payload: { itemId: string; amount: number } }
  | { type: 'TOGGLE_TABLE_RESERVATION'; payload: { tableId: string; isReserved: boolean } }
  | { type: 'ADD_RESERVATION'; payload: { tableId: string; reservation: Reservation } }
  | { type: 'REMOVE_RESERVATION'; payload: { tableId: string; reservationId: string } }
  | { type: 'MERGE_TABLES'; payload: { parentId: string; childIds: string[] } }
  | { type: 'SPLIT_ORDER'; payload: { originalOrderId: string; targetTableId: string; itemsToMove: CartItem[] } }
  | { type: 'ADD_TABLE'; payload: Table }
  | { type: 'UPDATE_TABLE'; payload: Table }
  | { type: 'DELETE_TABLE'; payload: string }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'UPDATE_CART_ITEM'; payload: { cartItemId: string; quantity?: number; notes?: string; modifiers?: Modifier[] } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<StoreSettings> }
  | { type: 'ADD_TEAM_MEMBER'; payload: TeamMember }
  | { type: 'UPDATE_TEAM_MEMBER'; payload: TeamMember }
  | { type: 'DELETE_TEAM_MEMBER'; payload: string }
  | { type: 'LOGIN_STAFF'; payload: TeamMember }
  | { type: 'LOGOUT_STAFF' }
  | { type: 'RESTORE_DATA'; payload: Partial<PosState> };

const initialState: PosState = {
  orders: [],
  menu: [],
  tables: [],
  inventory: [],
  cart: [],
  settings: DEFAULT_SETTINGS,
  teamMembers: [],
  activeStaff: null
};

const posReducer = (state: PosState, action: Action): PosState => {
  switch (action.type) {
    case 'SET_FULL_STATE':
        // Preserve activeStaff if it exists in current state, as the payload might not have it (DB load)
        return { ...action.payload, activeStaff: state.activeStaff };
    case 'ADD_ORDER': {
      // Generate Invoice Number
      const { invoicePrefix, invoiceStartingNumber } = state.settings;
      const invoiceNumber = `${invoicePrefix}${invoiceStartingNumber}`;
      
      // Initialize items as unprinted
      const itemsWithPrintStatus = action.payload.items.map(item => ({ ...item, isPrinted: false }));
      const newOrder = { ...action.payload, items: itemsWithPrintStatus, invoiceNumber };
      
      return { 
          ...state, 
          orders: [newOrder, ...state.orders],
          settings: { 
              ...state.settings, 
              invoiceStartingNumber: invoiceStartingNumber + 1 // Auto-increment
          }
      };
    }
    case 'APPEND_TO_ORDER': {
        const { orderId, newItems, additionalAmount } = action.payload;
        
        // Initialize new items as unprinted
        const itemsWithPrintStatus = newItems.map(item => ({ ...item, isPrinted: false }));

        return {
            ...state,
            orders: state.orders.map(order => {
                if (order.id === orderId) {
                    return {
                        ...order,
                        items: [...order.items, ...itemsWithPrintStatus],
                        totalAmount: order.totalAmount + additionalAmount,
                        // If order was ready, move back to cooking/pending as new items are added
                        status: order.status === OrderStatus.READY ? OrderStatus.COOKING : order.status
                    };
                }
                return order;
            })
        };
    }
    case 'MARK_ITEMS_AS_PRINTED': {
        return {
            ...state,
            orders: state.orders.map(order => {
                if (order.id === action.payload.orderId) {
                    return {
                        ...order,
                        items: order.items.map(item => ({ ...item, isPrinted: true }))
                    };
                }
                return order;
            })
        };
    }
    case 'UPDATE_ORDER_STATUS':
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload.orderId ? { ...o, status: action.payload.status } : o
        ),
      };
    case 'UPDATE_ORDER_PAYMENT':
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.payload.orderId ? { ...o, paymentMethod: action.payload.paymentMethod } : o
        ),
      };
    case 'UPDATE_TABLE_STATUS':
      return {
        ...state,
        tables: state.tables.map(t =>
          t.id === action.payload.tableId
            ? { ...t, status: action.payload.status, currentOrderId: action.payload.orderId }
            : t
        ),
      };
    case 'ADD_MENU_ITEM':
      return { ...state, menu: [...state.menu, action.payload] };
    case 'UPDATE_MENU_ITEM':
      return {
        ...state,
        menu: state.menu.map((item) =>
          item.id === action.payload.id ? action.payload : item
        ),
      };
    case 'DELETE_MENU_ITEM':
      return {
        ...state,
        menu: state.menu.filter((item) => item.id !== action.payload),
      };
    
    // Inventory Actions
    case 'ADD_INVENTORY':
        return { ...state, inventory: [...state.inventory, action.payload] };
    case 'UPDATE_INVENTORY':
        return { ...state, inventory: state.inventory.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'DELETE_INVENTORY':
        return { ...state, inventory: state.inventory.filter(i => i.id !== action.payload) };
    case 'DEDUCT_INVENTORY':
      return state; // Placeholder for future implementation if needed

    case 'TOGGLE_TABLE_RESERVATION':
        return {
            ...state,
            tables: state.tables.map(t => 
                t.id === action.payload.tableId 
                ? { ...t, status: action.payload.isReserved ? 'RESERVED' : 'AVAILABLE' } 
                : t
            )
        };
    case 'ADD_RESERVATION':
        return {
            ...state,
            tables: state.tables.map(t => 
                t.id === action.payload.tableId
                ? { ...t, reservations: [...(t.reservations || []), action.payload.reservation] }
                : t
            )
        };
    case 'REMOVE_RESERVATION':
        return {
            ...state,
            tables: state.tables.map(t => 
                t.id === action.payload.tableId
                ? { ...t, reservations: (t.reservations || []).filter(r => r.id !== action.payload.reservationId) }
                : t
            )
        };
    case 'MERGE_TABLES':
        return {
            ...state,
            tables: state.tables.map(t => {
                if (t.id === action.payload.parentId) {
                    return t; 
                }
                if (action.payload.childIds.includes(t.id)) {
                    return { ...t, mergedInto: action.payload.parentId, status: 'OCCUPIED' }; 
                }
                if (t.mergedInto === action.payload.parentId && !action.payload.childIds.includes(t.id)) {
                    return { ...t, mergedInto: undefined, status: 'AVAILABLE' };
                }
                return t;
            })
        };
    case 'SPLIT_ORDER': {
        const { originalOrderId, targetTableId, itemsToMove } = action.payload;
        
        const originalOrder = state.orders.find(o => o.id === originalOrderId);
        if (!originalOrder) return state;

        const itemIdsToMove = itemsToMove.map(i => i.cartItemId);
        
        const keptItems = originalOrder.items.filter(i => !itemIdsToMove.includes(i.cartItemId));
        const movedItems = originalOrder.items.filter(i => itemIdsToMove.includes(i.cartItemId));
        
        if (movedItems.length === 0) return state;

        // Recalculate totals accounting for modifiers
        const calculateItemTotal = (item: CartItem) => {
           const modTotal = item.modifiers ? item.modifiers.reduce((acc, m) => acc + m.price, 0) : 0;
           return (item.price + modTotal) * item.quantity;
        };

        const sourceTotal = keptItems.reduce((sum, i) => sum + calculateItemTotal(i), 0);
        const updatedSourceOrder = { 
            ...originalOrder, 
            items: keptItems, 
            totalAmount: sourceTotal,
            status: keptItems.length === 0 ? OrderStatus.COMPLETED : originalOrder.status 
        };

        const targetTable = state.tables.find(t => t.id === targetTableId);
        let targetOrder: Order;
        let isNewTargetOrder = false;

        if (targetTable?.currentOrderId && state.orders.find(o => o.id === targetTable.currentOrderId && o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED)) {
            const existingTargetOrder = state.orders.find(o => o.id === targetTable.currentOrderId)!;
            const newTargetItems = [...existingTargetOrder.items, ...movedItems];
            const newTargetTotal = newTargetItems.reduce((sum, i) => sum + calculateItemTotal(i), 0);
            
            targetOrder = {
                ...existingTargetOrder,
                items: newTargetItems,
                totalAmount: newTargetTotal
            };
        } else {
            const movedTotal = movedItems.reduce((sum, i) => sum + calculateItemTotal(i), 0);
            targetOrder = {
                id: `ORD-${Date.now().toString().slice(-5)}`,
                invoiceNumber: `${state.settings.invoicePrefix}${state.settings.invoiceStartingNumber}-S`, // Suffix for split
                tableId: targetTableId,
                items: movedItems,
                status: OrderStatus.COOKING, 
                type: OrderType.DINE_IN,
                timestamp: new Date(),
                totalAmount: movedTotal
            };
            isNewTargetOrder = true;
        }

        const newOrders = state.orders.map(o => {
            if (o.id === originalOrderId) return updatedSourceOrder;
            if (!isNewTargetOrder && o.id === targetOrder.id) return targetOrder;
            return o;
        });

        if (isNewTargetOrder) {
            newOrders.unshift(targetOrder);
        }

        const newTables = state.tables.map(t => {
            if (t.id === originalOrder.tableId && keptItems.length === 0) {
                return { ...t, status: 'AVAILABLE' as const, currentOrderId: undefined };
            }
            if (t.id === targetTableId) {
                return { ...t, status: 'OCCUPIED' as const, currentOrderId: targetOrder.id };
            }
            return t;
        });

        return {
            ...state,
            orders: newOrders,
            tables: newTables
        };
    }
    case 'ADD_TABLE':
        return { ...state, tables: [...state.tables, action.payload] };
    case 'UPDATE_TABLE':
        return {
            ...state,
            tables: state.tables.map((t) =>
                t.id === action.payload.id ? { ...t, ...action.payload } : t
            ),
        };
    case 'DELETE_TABLE':
        return {
            ...state,
            tables: state.tables
                .filter((t) => t.id !== action.payload)
                .map((t) => t.mergedInto === action.payload ? { ...t, mergedInto: undefined, status: 'AVAILABLE' as const } : t),
        };
    
    // Cart Actions
    case 'ADD_TO_CART': {
        const newItem = action.payload;
        const existingIndex = state.cart.findIndex(item => {
            if (item.id !== newItem.id) return false;
            const existingMods = item.modifiers ? item.modifiers.slice().sort((a,b) => a.name.localeCompare(b.name)) : [];
            const newMods = newItem.modifiers ? newItem.modifiers.slice().sort((a,b) => a.name.localeCompare(b.name)) : [];
            return JSON.stringify(existingMods) === JSON.stringify(newMods);
        });
        
        if (existingIndex > -1) {
            const newCart = [...state.cart];
            newCart[existingIndex] = {
                ...newCart[existingIndex],
                quantity: newCart[existingIndex].quantity + newItem.quantity
            };
            return { ...state, cart: newCart };
        }
        return { ...state, cart: [...state.cart, newItem] };
    }
    case 'UPDATE_CART_ITEM': {
        const { cartItemId, quantity, notes, modifiers } = action.payload;
        return {
            ...state,
            cart: state.cart.map(item => {
                if (item.cartItemId === cartItemId) {
                    return {
                        ...item,
                        quantity: quantity !== undefined ? quantity : item.quantity,
                        notes: notes !== undefined ? notes : item.notes,
                        modifiers: modifiers !== undefined ? modifiers : item.modifiers
                    };
                }
                return item;
            }).filter(item => item.quantity > 0)
        };
    }
    case 'REMOVE_FROM_CART':
        return { ...state, cart: state.cart.filter(i => i.cartItemId === action.payload ? false : true) };
    case 'CLEAR_CART':
        return { ...state, cart: [] };
    case 'SET_CART':
        return { ...state, cart: action.payload };

    // Settings Actions
    case 'UPDATE_SETTINGS':
        return { ...state, settings: { ...state.settings, ...action.payload } };
    
    // Team Member Actions
    case 'ADD_TEAM_MEMBER':
        return { ...state, teamMembers: [...state.teamMembers, action.payload] };
    case 'UPDATE_TEAM_MEMBER':
        return { ...state, teamMembers: state.teamMembers.map(m => m.id === action.payload.id ? action.payload : m) };
    case 'DELETE_TEAM_MEMBER':
        return { ...state, teamMembers: state.teamMembers.filter(m => m.id !== action.payload) };

    // Staff Session
    case 'LOGIN_STAFF':
        return { ...state, activeStaff: action.payload };
    case 'LOGOUT_STAFF':
        return { ...state, activeStaff: null };

    // Restore Data
    case 'RESTORE_DATA':
        return {
            ...state,
            orders: action.payload.orders || state.orders,
            menu: action.payload.menu || state.menu,
            tables: action.payload.tables || state.tables,
            inventory: action.payload.inventory || state.inventory,
            settings: action.payload.settings || state.settings,
            teamMembers: action.payload.teamMembers || state.teamMembers,
            activeStaff: state.activeStaff,
            cart: state.cart
        };

    default:
      return state;
  }
};

const PosContext = createContext<{
  state: PosState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export const PosProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(posReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage for cart
  useEffect(() => {
      const savedCart = localStorage.getItem('pos_cart');
      if (savedCart) {
          try {
              const cart = JSON.parse(savedCart);
              dispatch({ type: 'SET_CART', payload: cart });
          } catch(e) { console.error("Failed to parse cart", e); }
      }
  }, []);

  useEffect(() => {
      localStorage.setItem('pos_cart', JSON.stringify(state.cart));
  }, [state.cart]);

  // Sync from Firebase
  useEffect(() => {
      if (!user) {
          setIsLoading(false);
          return;
      }

      const dbRef = ref(db, `restaurants/${user.uid}`);
      const unsubscribe = onValue(dbRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
              const loadedMembers = data.teamMembers ? Object.values(data.teamMembers) as TeamMember[] : [];
              
              // Force inject Default Admin if list is empty, ensuring LockScreen is never dead-locked
              let finalTeamMembers = loadedMembers;
              if (loadedMembers.length === 0) {
                  const defaultAdmin: TeamMember = {
                      id: 'ADMIN-001',
                      name: 'Admin',
                      role: Role.ADMIN,
                      pin: '1234'
                  };
                  finalTeamMembers = [defaultAdmin];
              }

              const loadedState: PosState = {
                  orders: data.orders ? Object.values(data.orders) : [],
                  menu: data.menu ? Object.values(data.menu) : [],
                  tables: data.tables ? Object.values(data.tables) : [],
                  inventory: data.inventory ? Object.values(data.inventory) : [],
                  settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
                  teamMembers: finalTeamMembers,
                  cart: state.cart, 
                  activeStaff: state.activeStaff 
              };

              dispatch({ type: 'SET_FULL_STATE', payload: loadedState });
          } else {
             // Completely new account initialization
             const defaultAdmin: TeamMember = {
                  id: 'ADMIN-001',
                  name: 'Admin',
                  role: Role.ADMIN,
                  pin: '1234'
              };
              const loadedState: PosState = {
                  ...initialState,
                  teamMembers: [defaultAdmin],
                  cart: state.cart,
                  activeStaff: state.activeStaff
              };
              dispatch({ type: 'SET_FULL_STATE', payload: loadedState });
          }
          setIsLoading(false);
      });

      return () => unsubscribe();
  }, [user]);

  // Sync TO Firebase
  useEffect(() => {
      if (!user || isLoading) return;

      const dbRef = ref(db, `restaurants/${user.uid}`);
      
      // Sanitize state to remove undefined values and serialize dates
      const stateToSave = JSON.parse(JSON.stringify({
          orders: state.orders.reduce((acc, order) => ({ ...acc, [order.id]: order }), {}),
          menu: state.menu.reduce((acc, item) => ({ ...acc, [item.id]: item }), {}),
          tables: state.tables.reduce((acc, table) => ({ ...acc, [table.id]: table }), {}),
          inventory: state.inventory.reduce((acc, item) => ({ ...acc, [item.id]: item }), {}),
          settings: state.settings,
          teamMembers: state.teamMembers.reduce((acc, member) => ({ ...acc, [member.id]: member }), {})
      }));

      set(dbRef, stateToSave).catch(err => console.error("Sync Error", err));
  }, [state.orders, state.menu, state.tables, state.inventory, state.settings, state.teamMembers, user, isLoading]);


  return (
    <PosContext.Provider value={{ state, dispatch }}>
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) throw new Error('usePos must be used within a PosProvider');
  return context;
};