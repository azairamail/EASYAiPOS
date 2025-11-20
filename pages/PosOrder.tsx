import React, { useState, useMemo, useEffect } from 'react';
import { usePos } from '../context/PosContext';
import { MenuItem, CartItem, OrderType, PaymentMethod, OrderStatus, Table, Order, Reservation, Modifier } from '../types';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, Coffee, CheckCircle, X, Percent, Printer, FileText, ChefHat, ArrowRight, LayoutGrid, GitMerge, ArrowRightLeft, Clock, Lock, CalendarClock, Edit2, Save, PlusCircle, MessageSquarePlus, StickyNote, Check, Calendar, User, Users, AlertTriangle, Timer } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

// Helper component for running timer
const OrderTimer: React.FC<{ timestamp: Date }> = ({ timestamp }) => {
    const [timeStr, setTimeStr] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date().getTime();
            const start = new Date(timestamp).getTime();
            const diff = now - start;
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            setTimeStr(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        };

        updateTime();
        const interval = setInterval(updateTime, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [timestamp]);

    return <span className="font-mono font-bold">{timeStr}</span>;
};

export const PosOrder: React.FC = () => {
  const { state, dispatch } = usePos();
  const { settings } = state;
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  
  // View Mode for Right Panel (Active Order Details vs Add Items Cart)
  const [viewMode, setViewMode] = useState<'ACTIVE_ORDER' | 'CART'>('CART');

  // Modifier / Edit Item State
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [currentModifierItem, setCurrentModifierItem] = useState<MenuItem | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
  
  // Editing Cart Item Specifics
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNote, setModalNote] = useState('');

  // Discount State
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Print Modal State
  const [printData, setPrintData] = useState<{title: string, content: string} | null>(null);

  // Table Management State
  const [showTableManager, setShowTableManager] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [itemsToSplit, setItemsToSplit] = useState<string[]>([]); // cartItemIds
  const [splitTargetTableId, setSplitTargetTableId] = useState<string>('');
  
  // Table Editing State
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editTableName, setEditTableName] = useState('');

  // Reservation Modal State
  const [reservationModal, setReservationModal] = useState<{ isOpen: boolean; table: Table | null }>({ isOpen: false, table: null });
  const [resName, setResName] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resTime, setResTime] = useState('');
  const [resGuests, setResGuests] = useState(2);

  // Note Editing State (Inline)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  // Use global cart
  const cart = state.cart;

  // Active Order (for Occupied tables)
  const activeOrder = useMemo(() => {
      if (selectedTable?.status === 'OCCUPIED' && selectedTable.currentOrderId) {
          return state.orders.find(o => o.id === selectedTable.currentOrderId);
      }
      return null;
  }, [selectedTable, state.orders]);

  // Reset View Mode when Table Selection Changes
  useEffect(() => {
      if (activeOrder) {
          setViewMode('ACTIVE_ORDER');
      } else {
          setViewMode('CART');
      }
  }, [selectedTable, activeOrder]);

  // Derived Tables for UI (Handling Merge Display)
  const displayTables = useMemo(() => {
      return state.tables.filter(t => !t.mergedInto);
  }, [state.tables]);

  const getTableDisplayName = (table: Table) => {
      const children = state.tables.filter(t => t.mergedInto === table.id);
      if (children.length > 0) {
          return `${table.name} + ${children.map(c => c.name.replace('Table ', '')).join('+')}`;
      }
      return table.name;
  };

  // Handle Recalled Items from History
  useEffect(() => {
    interface LocationState {
      recalledItems?: CartItem[];
    }
    const locState = location.state as LocationState;

    if (locState && locState.recalledItems && locState.recalledItems.length > 0) {
        // Add items to cart
        locState.recalledItems.forEach(recalledItem => {
            // Generate new IDs to avoid conflict
            const itemToAdd = {
                ...recalledItem,
                cartItemId: `${recalledItem.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`
            };
            dispatch({ type: 'ADD_TO_CART', payload: itemToAdd });
        });
        
        // Notify user
        alert(`Recalled ${locState.recalledItems.length} items to the cart.`);

        // Clear navigation state to prevent loop on refresh
        window.history.replaceState({}, '');
        
        // Ensure we are in Cart mode
        setViewMode('CART');
        setOrderType(OrderType.TAKE_AWAY); // Default to takeaway for recalled
        setSelectedTable(null);
    }
  }, [location, dispatch]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(state.menu.map((i) => i.category)))], [state.menu]);

  const filteredMenu = state.menu.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // -- Item Handling Logic --

  const handleItemClick = (item: MenuItem) => {
    // Automatically switch to cart mode if in active order view
    if (viewMode === 'ACTIVE_ORDER') {
        if(window.confirm("Switch to 'Add Item' mode to add this item to the table?")) {
            setViewMode('CART');
        } else {
            return;
        }
    }

    if (item.availableModifiers && item.availableModifiers.length > 0) {
        // Open Modal for New Item
        setEditingCartItem(null); // Ensure we are NOT editing
        setCurrentModifierItem(item);
        setSelectedModifiers([]);
        setModalQuantity(1);
        setModalNote('');
        setIsModifierModalOpen(true);
    } else {
        addToCart(item);
    }
  };

  const handleEditCartItem = (cartItem: CartItem) => {
      // Find the original menu item to get available modifiers
      const originalItem = state.menu.find(m => m.id === cartItem.id);
      if (!originalItem) return;

      setEditingCartItem(cartItem);
      setCurrentModifierItem(originalItem);
      setSelectedModifiers(cartItem.modifiers || []);
      setModalQuantity(cartItem.quantity);
      setModalNote(cartItem.notes || '');
      setIsModifierModalOpen(true);
  };

  const addToCart = (item: MenuItem, modifiers: Modifier[] = [], quantity: number = 1, note: string = '') => {
    const cartItem: CartItem = {
        ...item,
        quantity: quantity,
        modifiers,
        cartItemId: `${item.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        notes: note,
        isPrinted: false // New item logic
    };
    dispatch({ type: 'ADD_TO_CART', payload: cartItem });
    
    setIsModifierModalOpen(false);
    resetModalState();
  };

  const updateCartItemFromModal = () => {
      if (!editingCartItem) return;
      
      dispatch({ 
          type: 'UPDATE_CART_ITEM', 
          payload: { 
              cartItemId: editingCartItem.cartItemId, 
              quantity: modalQuantity, 
              notes: modalNote, 
              modifiers: selectedModifiers 
          } 
      });
      
      setIsModifierModalOpen(false);
      resetModalState();
  };

  const resetModalState = () => {
      setCurrentModifierItem(null);
      setSelectedModifiers([]);
      setEditingCartItem(null);
      setModalQuantity(1);
      setModalNote('');
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    const item = cart.find(i => i.cartItemId === cartItemId);
    if (item) {
        dispatch({ type: 'UPDATE_CART_ITEM', payload: { cartItemId, quantity: item.quantity + delta } });
    }
  };

  const updateItemNote = (cartItemId: string, note: string) => {
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { cartItemId, notes: note } });
    setEditingNoteId(null);
  };

  const toggleModifier = (mod: Modifier) => {
      setSelectedModifiers(prev => {
          const exists = prev.find(m => m.name === mod.name);
          if (exists) {
              return prev.filter(m => m.name !== mod.name);
          } else {
              return [...prev, mod];
          }
      });
  };

  // Calculations
  const cartTotal = cart.reduce((sum, item) => {
      const modsTotal = item.modifiers ? item.modifiers.reduce((acc, m) => acc + m.price, 0) : 0;
      return sum + (item.price + modsTotal) * item.quantity;
  }, 0);
  
  let discountAmount = 0;
  if (discountType === 'PERCENT') {
    discountAmount = (cartTotal * discountValue) / 100;
  } else {
    discountAmount = discountValue;
  }
  if (discountAmount > cartTotal) discountAmount = cartTotal;

  const netSubtotal = cartTotal - discountAmount;
  
  // Dynamic Tax and Service Charge
  const tax = settings.vatEnabled ? netSubtotal * (settings.vatRate / 100) : 0;
  const serviceCharge = (settings.serviceChargeEnabled && orderType === OrderType.DINE_IN) 
        ? netSubtotal * (settings.serviceChargeRate / 100) 
        : 0;
  
  const grandTotal = netSubtotal + tax + serviceCharge;

  // Table Logic
  const handleTableSelect = (table: Table) => {
      setSelectedTable(table);
      if (table.status === 'AVAILABLE') {
          if (orderType !== OrderType.DINE_IN) setOrderType(OrderType.DINE_IN);
      } else if (table.status === 'OCCUPIED') {
          // Handled by useEffect above to set viewMode
      } else if (table.status === 'RESERVED') {
          // Check if there's a reservation for right now
          const now = new Date();
          const hasActiveRes = table.reservations?.some(r => {
              const resTime = new Date(r.dateTime);
              return Math.abs(resTime.getTime() - now.getTime()) < 30 * 60000; // within 30 mins
          });

          if(window.confirm(`Table ${table.name} is RESERVED ${hasActiveRes ? 'NOW' : 'soon'}. Start order anyway?`)) {
             dispatch({ type: 'TOGGLE_TABLE_RESERVATION', payload: { tableId: table.id, isReserved: false } });
          } else {
             setSelectedTable(null);
          }
      }
  };

  // Table Management Functions
  const handleAddTable = () => {
    const newId = `T${Date.now().toString().slice(-4)}`;
    const nextNumber = state.tables.length + 1;
    const newTable: Table = {
        id: newId,
        name: `Table ${nextNumber}`,
        status: 'AVAILABLE'
    };
    dispatch({ type: 'ADD_TABLE', payload: newTable });
  };

  const handleStartEditTable = (table: Table) => {
      setEditingTableId(table.id);
      setEditTableName(table.name);
  };

  const handleSaveTable = (table: Table) => {
      if (editTableName.trim()) {
          dispatch({ type: 'UPDATE_TABLE', payload: { ...table, name: editTableName }});
          setEditingTableId(null);
      }
  };

  const handleDeleteTable = (table: Table) => {
      if (table.status === 'OCCUPIED') {
          alert("Cannot delete an occupied table. Please settle the order first.");
          return;
      }
      if (window.confirm(`Are you sure you want to delete ${table.name}?`)) {
          dispatch({ type: 'DELETE_TABLE', payload: table.id });
      }
  };

  const handleOpenReservation = (table: Table) => {
      setReservationModal({ isOpen: true, table });
      setResName('');
      setResPhone('');
      setResTime('');
      setResGuests(2);
  };

  const handleBookReservation = () => {
      if (!reservationModal.table || !resName || !resTime) {
          alert("Please fill in all fields.");
          return;
      }

      const newRes: Reservation = {
          id: `RES-${Date.now()}`,
          customerName: resName,
          customerPhone: resPhone,
          dateTime: new Date(resTime),
          guests: resGuests
      };

      dispatch({ 
          type: 'ADD_RESERVATION', 
          payload: { tableId: reservationModal.table.id, reservation: newRes } 
      });

      // If reservation is within next hour, mark table as Reserved
      const resDate = new Date(resTime);
      const now = new Date();
      const diffMs = resDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours >= 0 && diffHours <= 1) {
          dispatch({ 
              type: 'TOGGLE_TABLE_RESERVATION', 
              payload: { tableId: reservationModal.table.id, isReserved: true } 
          });
      }

      setReservationModal({ isOpen: false, table: null });
      alert("Table reserved successfully!");
  };

  const handleCancelReservation = (tableId: string, resId: string) => {
      if(window.confirm("Cancel this reservation?")) {
          dispatch({ type: 'REMOVE_RESERVATION', payload: { tableId, reservationId: resId } });
      }
  };


  const handleSendToKitchen = () => {
    if (cart.length === 0) return alert("Cart is empty!");
    if (orderType === OrderType.DINE_IN && !selectedTable) {
        return alert("Please select a table for Dine-In orders.");
    }

    // If table is occupied and we are adding items (appending)
    if (selectedTable && selectedTable.status === 'OCCUPIED' && selectedTable.currentOrderId) {
        dispatch({
            type: 'APPEND_TO_ORDER',
            payload: {
                orderId: selectedTable.currentOrderId,
                newItems: [...cart], // new items are unprinted by default logic in reducer
                additionalAmount: grandTotal
            }
        });
        
        // Automatically Print KOT for the new items
        const kotContent = generateReceipt('KOT', cart, selectedTable, orderType, {}, { 
            id: selectedTable.currentOrderId, 
            invoiceNo: 'ADD-ON',
            titleOverride: 'KOT (ADD-ON)'
        });
        setPrintData({ title: 'Kitchen Order Ticket (Add-on)', content: kotContent });
        
        // The printing happens, but we also need to mark them as printed in the DB
        // We can do this immediately because the reducer updates state
        dispatch({ type: 'MARK_ITEMS_AS_PRINTED', payload: { orderId: selectedTable.currentOrderId } });
        
        alert(`👨‍🍳 NEW ITEMS ADDED & KOT GENERATED`);
    } else {
        // New Order
        const newOrder: Order = {
            id: `ORD-${Date.now().toString().slice(-5)}`,
            tableId: selectedTable?.id,
            items: [...cart], // new items are unprinted by default
            status: OrderStatus.PENDING,
            type: orderType,
            timestamp: new Date(),
            totalAmount: grandTotal,
            customerPhone: customerPhone || undefined,
        };

        dispatch({ type: 'ADD_ORDER', payload: newOrder });
        
        // Auto Print KOT
        const kotContent = generateReceipt('KOT', cart, selectedTable, orderType, {}, { 
            id: newOrder.id,
            titleOverride: 'KOT (NEW ORDER)'
        });
        setPrintData({ title: 'Kitchen Order Ticket', content: kotContent });
        
        // Mark as printed immediately
        dispatch({ type: 'MARK_ITEMS_AS_PRINTED', payload: { orderId: newOrder.id } });

        if (selectedTable) {
            dispatch({ type: 'UPDATE_TABLE_STATUS', payload: { tableId: selectedTable.id, status: 'OCCUPIED', orderId: newOrder.id } });
        }
        alert(`✅ ORDER PLACED & KOT GENERATED`);
    }

    dispatch({ type: 'CLEAR_CART' });
    if(!selectedTable) setSelectedTable(null); // Keep table selected if appending
    setCustomerPhone('');
    setDiscountValue(0);
  };

  const handlePlaceOrder = (paymentMethod: PaymentMethod) => {
    // Logic for Settling Active Order (Occupied Table)
    if (selectedTable && selectedTable.status === 'OCCUPIED' && activeOrder) {
         // Case A: Appending & Settling simultaneously
         if (cart.length > 0) {
             const confirmAppend = window.confirm(
                 `You have items in the cart. Do you want to add them to the order and settle the full amount?\n\nNew Total will be: ৳${(activeOrder.totalAmount + grandTotal).toFixed(2)}`
             );
             if (!confirmAppend) return;

             // Append items first
             dispatch({
                type: 'APPEND_TO_ORDER',
                payload: {
                    orderId: activeOrder.id,
                    newItems: [...cart],
                    additionalAmount: grandTotal
                }
             });
             
             // Print KOT for new items before settling
             const kotContent = generateReceipt('KOT', cart, selectedTable, orderType, {}, { id: activeOrder.id, titleOverride: 'KOT (LAST ADD-ON)' });
             setPrintData({ title: 'Kitchen Order Ticket', content: kotContent });
             dispatch({ type: 'MARK_ITEMS_AS_PRINTED', payload: { orderId: activeOrder.id } });
         }

         // Then Settle
         dispatch({ 
            type: 'UPDATE_ORDER_PAYMENT', 
            payload: { orderId: activeOrder.id, paymentMethod: paymentMethod } 
        });
        dispatch({ 
            type: 'UPDATE_ORDER_STATUS', 
            payload: { orderId: activeOrder.id, status: OrderStatus.COMPLETED } 
        });
        dispatch({ type: 'UPDATE_TABLE_STATUS', payload: { tableId: selectedTable.id, status: 'AVAILABLE' } });
        
        dispatch({ type: 'CLEAR_CART' });
        setShowPaymentModal(false);
        setSelectedTable(null);
        alert(`✅ TABLE SETTLED & PAYMENT RECEIVED`);
        return;
    }

    // Logic for New Order (Dine In / Takeaway)
    if (!selectedTable && orderType === OrderType.DINE_IN) {
      alert('Please select a table first!');
      return;
    }

    const newOrder = {
      id: `ORD-${Date.now().toString().slice(-5)}`,
      tableId: selectedTable?.id,
      items: [...cart],
      status: OrderStatus.PENDING,
      type: orderType,
      timestamp: new Date(),
      totalAmount: grandTotal,
      customerPhone: customerPhone,
      paymentMethod: paymentMethod
    };

    dispatch({ type: 'ADD_ORDER', payload: newOrder });
    
    // Print KOT automatically even if settling immediately (chef needs to know)
    const kotContent = generateReceipt('KOT', cart, selectedTable, orderType, {}, { id: newOrder.id });
    setPrintData({ title: 'Kitchen Order Ticket', content: kotContent });
    dispatch({ type: 'MARK_ITEMS_AS_PRINTED', payload: { orderId: newOrder.id } });

    if (selectedTable) {
      dispatch({ type: 'UPDATE_TABLE_STATUS', payload: { tableId: selectedTable.id, status: 'OCCUPIED', orderId: newOrder.id } });
    }

    dispatch({ type: 'CLEAR_CART' });
    setShowPaymentModal(false);
    setSelectedTable(null);
    setCustomerPhone('');
    setDiscountValue(0);
    alert(`✅ PAYMENT RECEIVED`);
  };

  const handleSplitOrder = () => {
      if (!activeOrder || itemsToSplit.length === 0 || !splitTargetTableId) return;
      
      const itemsToMove = activeOrder.items.filter(i => itemsToSplit.includes(i.cartItemId));
      
      dispatch({
          type: 'SPLIT_ORDER',
          payload: {
              originalOrderId: activeOrder.id,
              targetTableId: splitTargetTableId,
              itemsToMove: itemsToMove
          }
      });

      setShowSplitModal(false);
      setItemsToSplit([]);
      setSplitTargetTableId('');
      setSelectedTable(null);
      alert("Order split successfully!");
  };

  const handleToggleSplitItem = (itemId: string) => {
      setItemsToSplit(prev => 
        prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
      );
  };

  // --- Printing System ---
  // Receipt Generation Helper
  const generateReceipt = (type: 'KOT' | 'BILL', dataItems: CartItem[], table: Table | null, oType: OrderType, totals: any, orderInfo?: {id: string, invoiceNo?: string, titleOverride?: string}) => {
    const line = "-".repeat(32);
    let text = "";
    
    const center = (str: string) => {
        const pad = Math.max(0, Math.floor((32 - str.length) / 2));
        return " ".repeat(pad) + str;
    };

    // Header
    const headerTitle = orderInfo?.titleOverride || (settings.invoiceHeader || (type === 'KOT' ? "KITCHEN TICKET" : "POS"));
    text += center(headerTitle) + "\n";

    if (type === 'BILL') {
        text += center(settings.storeName) + "\n";
        if (settings.address) text += center(settings.address) + "\n";
        if (settings.phone) text += center(settings.phone) + "\n";
    }
    text += `${line}\n`;
    
    text += `Date: ${new Date().toLocaleString('en-GB', { hour12: true })}\n`;
    
    if (orderInfo?.invoiceNo) {
        text += `Invoice: #${orderInfo.invoiceNo}\n`;
    } else if (orderInfo?.id) {
        text += `Order: #${orderInfo.id.slice(-6).toUpperCase()}\n`;
    } else {
        text += `Order: [New]\n`;
    }

    text += `Type: ${oType}\n`;
    if (table) text += `Table: ${table.name}\n`;
    text += `${line}\n`;

    if (type === 'KOT') {
        dataItems.forEach(item => {
            text += `${item.quantity} x ${item.name}\n`;
            if (item.modifiers?.length) text += `   [${item.modifiers.map(m => m.name).join(', ')}]\n`;
            if (item.notes) text += `   Note: ${item.notes}\n`;
        });
    } else {
        // Bill Items
        text += `Qty Item             Price\n`;
        dataItems.forEach(item => {
             const modsTotal = item.modifiers ? item.modifiers.reduce((acc, m) => acc + m.price, 0) : 0;
             const total = ((item.price + modsTotal) * item.quantity).toFixed(2);
             const name = item.name.substring(0, 16).padEnd(16);
             const qty = item.quantity.toString().padEnd(3);
             text += `${qty} ${name} ${total.padStart(8)}\n`;
        });
        
        text += `${line}\n`;
        text += `Subtotal:    ${totals.subtotal.toFixed(2).padStart(10)}\n`;
        if (totals.discount > 0) text += `Discount:   -${totals.discount.toFixed(2).padStart(10)}\n`;
        
        if (settings.vatEnabled) {
             text += `VAT (${settings.vatRate}%):    ${totals.tax.toFixed(2).padStart(10)}\n`;
        }
        if (settings.serviceChargeEnabled && totals.service > 0) {
            text += `S.Charge (${settings.serviceChargeRate}%):${totals.service.toFixed(2).padStart(10)}\n`;
        }
        
        text += `${line}\n`;
        text += `TOTAL:       ${settings.currencySymbol}${totals.total.toFixed(2).padStart(9)}\n`;
    }
    
    text += `${line}\n`;
    if (type === 'BILL' && settings.invoiceFooter) {
        text += center(settings.invoiceFooter) + "\n";
    } else if (type === 'BILL') {
        text += center("Thank You!") + "\n";
    }
    
    return text;
  };

  const handlePrintKOT = () => {
      // Manual Print Trigger for Current Cart
      const content = generateReceipt('KOT', cart, selectedTable, orderType, {}, { id: 'Preview', titleOverride: 'KOT (PREVIEW)' });
      setPrintData({ title: 'Kitchen Order Ticket', content });
  };

  const handlePrintBill = () => {
      const totals = { subtotal: netSubtotal, discount: discountAmount, tax, service: serviceCharge, total: grandTotal };
      const nextInv = `${settings.invoicePrefix}${settings.invoiceStartingNumber}`;
      const content = generateReceipt('BILL', cart, selectedTable, orderType, totals, { id: 'New', invoiceNo: nextInv });
      setPrintData({ title: 'Customer Bill', content });
  };

  const handlePrintActiveBill = () => {
      if (!activeOrder) return;
      const sub = activeOrder.items.reduce((acc, i) => {
          const modsTotal = i.modifiers ? i.modifiers.reduce((mAcc, m) => mAcc + m.price, 0) : 0;
          return acc + ((i.price + modsTotal) * i.quantity);
      }, 0);
      
      const taxAmt = settings.vatEnabled ? sub * (settings.vatRate / 100) : 0;
      const svc = (settings.serviceChargeEnabled && activeOrder.type === OrderType.DINE_IN) ? sub * (settings.serviceChargeRate / 100) : 0;
      
      const calculatedGross = sub + taxAmt + svc;
      const storedTotal = activeOrder.totalAmount;
      let discount = 0;
      if (calculatedGross > storedTotal + 0.1) {
          discount = calculatedGross - storedTotal;
      }
      
      const totals = { subtotal: sub, discount, tax: taxAmt, service: svc, total: storedTotal };
      const content = generateReceipt('BILL', activeOrder.items, selectedTable, activeOrder.type, totals, { id: activeOrder.id, invoiceNo: activeOrder.invoiceNumber });
      setPrintData({ title: 'Customer Bill', content });
  };

  const handlePrintActiveKOT = () => {
      if (!activeOrder) return;
      
      // Filter for items that have NOT been printed yet
      const unprintedItems = activeOrder.items.filter(i => !i.isPrinted);

      if (unprintedItems.length > 0) {
          // Case 1: Print ONLY new items
          const content = generateReceipt('KOT', unprintedItems, selectedTable, activeOrder.type, {}, { 
              id: activeOrder.id, 
              invoiceNo: activeOrder.invoiceNumber,
              titleOverride: 'KOT (RUNNING ORDER)'
          });
          setPrintData({ title: 'Kitchen Order Ticket (New Items)', content });
          
          // Mark these as printed
          dispatch({ type: 'MARK_ITEMS_AS_PRINTED', payload: { orderId: activeOrder.id } });
      } else {
          // Case 2: All items printed. Ask user if they want a reprint.
          if(window.confirm("All items have already been sent to KOT. Do you want to REPRINT the full ticket?")) {
              const content = generateReceipt('KOT', activeOrder.items, selectedTable, activeOrder.type, {}, { 
                  id: activeOrder.id, 
                  invoiceNo: activeOrder.invoiceNumber,
                  titleOverride: 'KOT (DUPLICATE / REPRINT)'
              });
              setPrintData({ title: 'Kitchen Order Ticket (Reprint)', content });
          }
      }
  };


  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      {/* Left Section: Menu & Tables */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Bar */}
        <div className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Menu</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search items..." 
                  className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[50%]">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
        </div>

        {/* Table Selection */}
        {orderType === OrderType.DINE_IN && (
             <div className="px-6 py-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center gap-3 transition-colors">
                <button 
                    onClick={() => setShowTableManager(true)}
                    className="flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shrink-0"
                    title="Manage Tables"
                >
                    <LayoutGrid size={18} />
                    <span className="text-[10px] font-medium mt-1">Manage</span>
                </button>

                <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 mx-2"></div>

                <div className="flex-1 overflow-x-auto no-scrollbar min-w-0">
                    <div className="flex gap-3">
                    {displayTables.map(table => {
                        // Find associated order for item count and timer
                        const order = state.orders.find(o => o.id === table.currentOrderId);
                        const itemCount = order?.items.reduce((acc, item) => acc + item.quantity, 0) || 0;

                        return (
                        <button
                        key={table.id}
                        onClick={() => handleTableSelect(table)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-all flex flex-col items-center min-w-[90px] flex-shrink-0 relative ${
                            selectedTable?.id === table.id 
                            ? 'ring-2 ring-orange-500 ring-offset-1 dark:ring-offset-gray-800 z-10' 
                            : ''
                        } ${
                            table.status === 'OCCUPIED'
                            ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                            : table.status === 'RESERVED'
                            ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                            : 'bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-600 hover:border-orange-300 text-gray-800 dark:text-gray-200'
                        }`}
                        >
                            {/* Status Badge */}
                            {table.status === 'OCCUPIED' && <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                            {table.status === 'RESERVED' && <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></div>}
                            
                            <span className="font-bold whitespace-nowrap">{getTableDisplayName(table)}</span>
                            <span className="text-[10px] uppercase font-semibold opacity-70">{table.status}</span>
                            
                            {/* Item Count Badge for Occupied Tables */}
                            {table.status === 'OCCUPIED' && itemCount > 0 && (
                                <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow border-2 border-white dark:border-gray-800 z-20">
                                    {itemCount}
                                </div>
                            )}

                            {/* Running Timer for Occupied Tables */}
                            {table.status === 'OCCUPIED' && order && (
                                <div className="mt-1 text-[10px] font-mono bg-white/50 dark:bg-black/20 px-1 rounded flex items-center gap-1">
                                    <Timer size={10} />
                                    <OrderTimer timestamp={order.timestamp} />
                                </div>
                            )}
                        </button>
                    )})}
                    </div>
                </div>
           </div>
        )}

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-900 transition-colors">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMenu.map(item => (
              <div 
                key={item.id} 
                onClick={() => handleItemClick(item)}
                className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-transparent hover:border-orange-200 group relative`}
              >
                {/* Compact Image Container */}
                <div className="h-32 rounded-lg bg-gray-100 dark:bg-gray-700 mb-2 overflow-hidden relative">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {item.availableModifiers && item.availableModifiers.length > 0 && (
                        <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                            Options
                        </span>
                    )}
                </div>
                <h3 className="font-bold text-gray-800 dark:text-white leading-tight">{item.name}</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 h-6">{item.description}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="font-bold text-orange-600 dark:text-orange-500">৳{item.price}</span>
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <Plus size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Section: Cart / Active Order */}
      <div className="w-80 lg:w-96 shrink-0 bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col shadow-2xl z-10 transition-colors">
        {viewMode === 'ACTIVE_ORDER' && activeOrder ? (
            // ACTIVE ORDER VIEW (Occupied Table - Read Only)
            <>
                <div className="p-2 border-b dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
                    <div className="flex justify-between items-center px-2">
                         <div>
                            <h2 className="font-bold text-lg text-red-800 dark:text-red-300">Active Order</h2>
                            <p className="text-xs text-red-600 dark:text-red-400 font-mono">
                                {activeOrder.invoiceNumber ? `#${activeOrder.invoiceNumber}` : `#${activeOrder.id.slice(-6)}`}
                                 • {getTableDisplayName(selectedTable!)}
                            </p>
                         </div>
                         <button onClick={() => setSelectedTable(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X size={20}/></button>
                    </div>
                    <div className="mt-2 flex gap-2 px-2">
                        <button 
                            onClick={() => setViewMode('CART')}
                            className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 shadow-md flex items-center justify-center gap-2 animate-pulse-subtle"
                        >
                            <PlusCircle size={16} /> ADD MORE ITEMS
                        </button>
                        <button 
                            onClick={() => setShowSplitModal(true)}
                            className="px-3 py-2 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center gap-1"
                            title="Split Table or Move Items"
                        >
                            <ArrowRightLeft size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 bg-white dark:bg-gray-800">
                    {activeOrder.items.map((item, idx) => {
                         const modsTotal = item.modifiers ? item.modifiers.reduce((acc, m) => acc + m.price, 0) : 0;
                         const itemTotal = (item.price + modsTotal) * item.quantity;
                         return (
                         <div key={item.cartItemId + idx} className="bg-gray-50 dark:bg-gray-750 py-1 px-2 rounded-md border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.quantity}x {item.name}</p>
                                    {item.modifiers && item.modifiers.length > 0 && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {item.modifiers.map(m => `${m.name}${m.price > 0 ? ` (+${m.price})` : ''}`).join(', ')}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">৳{itemTotal}</p>
                                    {item.isPrinted && <span className="text-[10px] text-green-600 font-bold flex items-center justify-end gap-0.5"><CheckCircle size={10}/> Sent to KOT</span>}
                                </div>
                            </div>
                            {item.notes && (
                                <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-1 rounded mt-1 flex items-start gap-1.5">
                                    <StickyNote size={12} className="mt-0.5 shrink-0" />
                                    <span className="italic">{item.notes}</span>
                                </div>
                            )}
                         </div>
                         );
                    })}
                </div>
                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                     <div className="flex justify-between font-bold text-xl text-gray-900 dark:text-white mb-4"><span>Total</span><span>৳{activeOrder.totalAmount}</span></div>
                     <div className="grid grid-cols-3 gap-2">
                         <button onClick={handlePrintActiveKOT} className="py-3 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center gap-1"><Printer size={14}/> KOT</button>
                         <button onClick={handlePrintActiveBill} className="py-3 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center gap-1"><FileText size={14}/> Bill</button>
                         <button onClick={() => setShowPaymentModal(true)} className="py-3 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-1">Settle</button>
                     </div>
                </div>
            </>
        ) : (
            // NEW ORDER VIEW (Cart or Adding Items to Active)
            <>
                <div className="p-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 transition-colors">
                    {selectedTable?.status === 'OCCUPIED' ? (
                        <div className="flex justify-between items-center mb-2 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 rounded border border-orange-200 dark:border-orange-800 animate-pulse-subtle">
                             <div>
                                <span className="text-xs font-bold text-orange-700 dark:text-orange-300 block">ADDING ITEMS TO</span>
                                <span className="font-bold text-gray-800 dark:text-white">{getTableDisplayName(selectedTable)}</span>
                             </div>
                             <button onClick={() => setViewMode('ACTIVE_ORDER')} className="px-3 py-1 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-xs font-bold shadow-sm">Cancel</button>
                        </div>
                    ) : (
                        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 mb-2">
                            {[OrderType.DINE_IN, OrderType.TAKE_AWAY, OrderType.DELIVERY].map(type => (
                            <button
                                key={type}
                                onClick={() => {
                                    setOrderType(type);
                                    if(type !== OrderType.DINE_IN) setSelectedTable(null);
                                }}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${
                                orderType === type 
                                ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' 
                                : 'text-gray-500 dark:text-gray-400'
                                }`}
                            >
                                {type.replace('_', ' ')}
                            </button>
                            ))}
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center px-2">
                        <div>
                        <h2 className="font-bold text-lg text-gray-900 dark:text-white">Current Order</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {selectedTable && !selectedTable.status ? `Table: ${getTableDisplayName(selectedTable)}` : orderType}
                        </p>
                        </div>
                        <button onClick={() => dispatch({ type: 'CLEAR_CART' })} className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 bg-white dark:bg-gray-800">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-2">
                        <Coffee size={48} className="opacity-20" />
                        <p>No items added yet</p>
                        </div>
                    ) : (
                        cart.map(item => {
                            const modsTotal = item.modifiers ? item.modifiers.reduce((acc, m) => acc + m.price, 0) : 0;
                            const itemTotal = (item.price + modsTotal) * item.quantity;
                            
                            return (
                        <div key={item.cartItemId} className="bg-gray-50 dark:bg-gray-750 py-1 px-2 rounded-md border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-colors shadow-sm group relative">
                            {/* Edit Button Overlay */}
                            <button 
                                onClick={() => handleEditCartItem(item)}
                                className="absolute top-1 right-1 z-10 p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Edit Item"
                            >
                                <Edit2 size={14} />
                            </button>

                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{item.name}</p>
                                    {item.modifiers && item.modifiers.length > 0 && (
                                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 flex flex-wrap gap-1">
                                            {item.modifiers.map(m => (
                                                <span key={m.name} className="bg-orange-100 dark:bg-orange-900/30 px-1 rounded">
                                                    {m.name} {m.price > 0 && `(+${m.price})`}
                                                </span>
                                            ))}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">৳{item.price} x {item.quantity}</p>
                                </div>
                                <div className="flex flex-col items-end gap-0.5">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">৳{itemTotal}</p>
                                    <div className="flex items-center gap-1 bg-white dark:bg-gray-600 rounded-md border dark:border-gray-500 px-0.5">
                                        <button onClick={() => updateQuantity(item.cartItemId, -1)} className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-200 rounded"><Minus size={12}/></button>
                                        <span className="text-xs font-bold w-4 text-center text-gray-900 dark:text-white">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.cartItemId, 1)} className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-500 text-orange-600 dark:text-orange-400 rounded"><Plus size={12}/></button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Notes Section */}
                            {(editingNoteId === item.cartItemId) ? (
                                <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                    <input 
                                        type="text" 
                                        value={tempNote}
                                        onChange={(e) => setTempNote(e.target.value)}
                                        className="flex-1 text-xs border dark:border-gray-600 rounded px-2 py-1 focus:outline-orange-500 focus:ring-1 focus:ring-orange-500 bg-white dark:bg-gray-600 dark:text-white"
                                        placeholder="Add special instructions..."
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && updateItemNote(item.cartItemId, tempNote)}
                                    />
                                    <button onClick={() => updateItemNote(item.cartItemId, tempNote)} className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900 p-1 rounded"><Check size={14}/></button>
                                    <button onClick={() => setEditingNoteId(null)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900 p-1 rounded"><X size={14}/></button>
                                </div>
                            ) : (
                                <div className="mt-1">
                                    {item.notes ? (
                                        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-1 rounded flex justify-between items-start group cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors" onClick={() => { setEditingNoteId(item.cartItemId); setTempNote(item.notes || ''); }}>
                                            <span className="flex items-center gap-1.5 break-all"><StickyNote size={12} className="shrink-0" /> {item.notes}</span>
                                            <Edit2 size={10} className="opacity-0 group-hover:opacity-100 text-blue-400" />
                                        </div>
                                    ) : (
                                         <button onClick={() => { setEditingNoteId(item.cartItemId); setTempNote(''); }} className="text-[10px] text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-1 mt-1 transition-colors opacity-50 hover:opacity-100">
                                            <MessageSquarePlus size={12} /> Add Note
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        );
                        })
                    )}
                </div>
                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    {/* Discount Section */}
                    <div className="mb-4 flex items-center gap-2">
                        <div className="flex bg-gray-200 dark:bg-gray-700 rounded p-0.5">
                            <button 
                                onClick={() => setDiscountType('PERCENT')} 
                                className={`p-1 rounded ${discountType === 'PERCENT' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                <Percent size={14} />
                            </button>
                            <button 
                                onClick={() => setDiscountType('FIXED')} 
                                className={`p-1 rounded ${discountType === 'FIXED' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                <span className="text-xs font-bold">৳</span>
                            </button>
                        </div>
                        <input 
                            type="number" 
                            value={discountValue || ''}
                            onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                            className="w-full text-right text-sm bg-white dark:bg-gray-800 border dark:border-gray-600 rounded px-2 py-1 focus:outline-orange-500 dark:text-white"
                            placeholder="Discount"
                        />
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span>৳{cartTotal}</span></div>
                        {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-৳{discountAmount.toFixed(2)}</span></div>}
                        {settings.vatEnabled && <div className="flex justify-between text-gray-500 dark:text-gray-500 text-xs"><span>VAT ({settings.vatRate}%)</span><span>৳{tax.toFixed(2)}</span></div>}
                        {settings.serviceChargeEnabled && orderType === OrderType.DINE_IN && <div className="flex justify-between text-gray-500 dark:text-gray-500 text-xs"><span>S.Charge ({settings.serviceChargeRate}%)</span><span>৳{serviceCharge.toFixed(2)}</span></div>}
                        <div className="flex justify-between font-bold text-xl text-gray-900 dark:text-white pt-2 border-t dark:border-gray-700"><span>Total</span><span>৳{grandTotal.toFixed(2)}</span></div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={handlePrintKOT} className="py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"><Printer size={18}/></button>
                        
                        {selectedTable?.status === 'OCCUPIED' ? (
                            <button 
                                onClick={handleSendToKitchen} 
                                className="col-span-2 py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 shadow-lg flex items-center justify-center gap-2"
                            >
                                <ChefHat size={18} /> Add to Order
                            </button>
                        ) : (
                            <button 
                                onClick={handleSendToKitchen} 
                                className="col-span-2 py-3 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-900 shadow-lg flex items-center justify-center gap-2"
                            >
                                <ChefHat size={18} /> Send to Kitchen
                            </button>
                        )}
                    </div>
                    
                    <button onClick={() => setShowPaymentModal(true)} className="w-full mt-2 py-3 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 shadow-lg flex items-center justify-center gap-2">
                        <CreditCard size={18} /> Place & Pay
                    </button>
                </div>
            </>
        )}
      </div>

      {/* Modifier / Add to Cart Modal */}
      {isModifierModalOpen && currentModifierItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="relative h-40 bg-gray-200 dark:bg-gray-700">
                    <img src={currentModifierItem.image} alt={currentModifierItem.name} className="w-full h-full object-cover" />
                    <button 
                        onClick={() => setIsModifierModalOpen(false)}
                        className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-md transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                        <h3 className="text-xl font-bold text-white">{currentModifierItem.name}</h3>
                        <p className="text-gray-200 text-sm">Base Price: ৳{currentModifierItem.price}</p>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Modifiers */}
                    {currentModifierItem.availableModifiers && currentModifierItem.availableModifiers.length > 0 && (
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                <CheckCircle size={18} className="text-orange-600" /> Select Options
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {currentModifierItem.availableModifiers.map(mod => {
                                    const isSelected = selectedModifiers.some(m => m.name === mod.name);
                                    return (
                                        <button
                                            key={mod.name}
                                            onClick={() => toggleModifier(mod)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all flex justify-between items-center ${
                                                isSelected 
                                                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-300' 
                                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-orange-300'
                                            }`}
                                        >
                                            <span>{mod.name}</span>
                                            <span className="text-xs bg-white dark:bg-gray-600 px-1.5 py-0.5 rounded shadow-sm">+{mod.price}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    <div>
                         <h4 className="font-bold text-gray-800 dark:text-white mb-3">Quantity</h4>
                         <div className="flex items-center gap-4">
                             <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                                 <button onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors text-gray-800 dark:text-white"><Minus size={18}/></button>
                                 <span className="w-12 text-center font-bold text-xl text-gray-800 dark:text-white">{modalQuantity}</span>
                                 <button onClick={() => setModalQuantity(modalQuantity + 1)} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors text-orange-600 dark:text-orange-400"><Plus size={18}/></button>
                             </div>
                             <div className="text-right flex-1">
                                 <p className="text-sm text-gray-500 dark:text-gray-400">Total Price</p>
                                 <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                                     ৳{((currentModifierItem.price + selectedModifiers.reduce((acc, m) => acc + m.price, 0)) * modalQuantity).toFixed(2)}
                                 </p>
                             </div>
                         </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <StickyNote size={18} className="text-gray-400" /> Special Instructions
                        </h4>
                        <textarea 
                            value={modalNote}
                            onChange={e => setModalNote(e.target.value)}
                            className="w-full border dark:border-gray-600 rounded-xl p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                            rows={2}
                            placeholder="e.g. Less sugar, extra spicy..."
                        />
                    </div>
                </div>

                <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <button 
                        onClick={() => editingCartItem ? updateCartItemFromModal() : addToCart(currentModifierItem, selectedModifiers, modalQuantity, modalNote)}
                        className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold text-lg hover:bg-orange-700 shadow-lg shadow-orange-200 dark:shadow-none transition-all transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        {editingCartItem ? <Save size={20} /> : <PlusCircle size={20} />}
                        {editingCartItem ? 'Update Item' : 'Add to Order'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 border dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Confirm Payment</h3>
                    <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24}/></button>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl mb-6 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase mb-1">Total to Pay</p>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white">
                        ৳{(selectedTable && activeOrder && viewMode === 'ACTIVE_ORDER' && cart.length > 0 
                            ? activeOrder.totalAmount + grandTotal 
                            : (viewMode === 'ACTIVE_ORDER' && activeOrder ? activeOrder.totalAmount : grandTotal)
                        ).toFixed(2)}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {[PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.BKASH, PaymentMethod.NAGAD].map(method => (
                        <button
                            key={method}
                            onClick={() => handlePlaceOrder(method)}
                            className="flex flex-col items-center gap-2 p-4 border dark:border-gray-600 rounded-xl hover:bg-orange-50 dark:bg-orange-900/20 hover:border-orange-500 dark:hover:border-orange-500 transition-all group"
                        >
                            {method === PaymentMethod.CASH && <Banknote size={28} className="text-green-600 group-hover:scale-110 transition-transform" />}
                            {method === PaymentMethod.CARD && <CreditCard size={28} className="text-blue-600 group-hover:scale-110 transition-transform" />}
                            {(method === PaymentMethod.BKASH || method === PaymentMethod.NAGAD) && <Smartphone size={28} className="text-pink-600 group-hover:scale-110 transition-transform" />}
                            <span className="font-bold text-gray-700 dark:text-gray-300">{method}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-6">
                    {orderType === OrderType.DINE_IN && !selectedTable && (
                         <p className="text-red-500 text-center text-sm font-bold">Please select a table first!</p>
                    )}
                    {(viewMode === 'CART' && !selectedTable && orderType === OrderType.DINE_IN) ? null : (
                        <button 
                            onClick={() => handlePlaceOrder(PaymentMethod.CASH)}
                            className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold mt-2 hover:bg-slate-900"
                        >
                             Quick Cash Pay
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Table Manager Modal */}
      {showTableManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col border dark:border-gray-700">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><LayoutGrid size={24}/> Table Management</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Add, Edit, Merge or Delete tables</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAddTable} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700">
                            <Plus size={18} /> Add Table
                        </button>
                        <button onClick={() => setShowTableManager(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <X size={24}/>
                        </button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-900 flex-1">
                    {state.tables.map(table => {
                        // Find Next Reservation
                        const nextRes = table.reservations 
                            ?.filter(r => new Date(r.dateTime) > new Date())
                            .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];

                        return (
                        <div key={table.id} className={`relative bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-2 ${table.status === 'OCCUPIED' ? 'border-red-400' : table.status === 'RESERVED' ? 'border-purple-400' : 'border-transparent'} hover:shadow-md transition-all group`}>
                            {/* Header / Name Edit */}
                            <div className="flex justify-between items-start mb-3">
                                {editingTableId === table.id ? (
                                    <div className="flex items-center gap-1 w-full">
                                        <input 
                                            autoFocus
                                            value={editTableName}
                                            onChange={e => setEditTableName(e.target.value)}
                                            className="w-full text-sm border rounded p-1 dark:bg-gray-700 dark:text-white"
                                            onKeyDown={e => e.key === 'Enter' && handleSaveTable(table)}
                                        />
                                        <button onClick={() => handleSaveTable(table)} className="text-green-600 p-1"><Check size={16}/></button>
                                    </div>
                                ) : (
                                    <h4 className="font-bold text-lg text-gray-800 dark:text-white">{table.name}</h4>
                                )}
                                <div className="flex gap-1">
                                    <button onClick={() => handleStartEditTable(table)} className="text-blue-500 p-1 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"><Edit2 size={14}/></button>
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTable(table); }} 
                                        className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>

                            {/* Status & Actions */}
                            <div className="space-y-2">
                                <div className={`text-xs font-bold uppercase px-2 py-1 rounded w-fit ${
                                    table.status === 'OCCUPIED' ? 'bg-red-100 text-red-700' : 
                                    table.status === 'RESERVED' ? 'bg-purple-100 text-purple-700' : 
                                    'bg-green-100 text-green-700'
                                }`}>
                                    {table.status}
                                </div>
                                
                                {table.status === 'OCCUPIED' && (
                                     <button 
                                        onClick={() => {
                                            if(table.currentOrderId) {
                                                const order = state.orders.find(o => o.id === table.currentOrderId);
                                                if (order) handlePrintActiveBill(); // Use the active bill printer logic
                                            }
                                        }} 
                                        className="w-full py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded flex items-center justify-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-600"
                                     >
                                         <FileText size={12} /> Print Bill
                                     </button>
                                )}

                                <button 
                                    onClick={() => handleOpenReservation(table)}
                                    className="w-full py-1.5 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-xs font-bold rounded flex items-center justify-center gap-1 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                >
                                    <CalendarClock size={14} /> {table.status === 'RESERVED' ? 'Manage Res.' : 'Reserve / Calendar'}
                                </button>
                            </div>
                            
                            {/* Upcoming Reservation Summary */}
                            {nextRes && (
                                <div className="mt-3 pt-2 border-t dark:border-gray-700">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">Next Booking</p>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded text-xs text-purple-800 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                                        <div className="flex items-center gap-1 font-bold mb-0.5">
                                            <Clock size={12}/>
                                            {new Date(nextRes.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium truncate max-w-[80px]">{nextRes.customerName}</span>
                                            <span className="bg-white dark:bg-purple-900 px-1.5 py-0.5 rounded text-[10px] border border-purple-200 dark:border-purple-700 shadow-sm">{nextRes.guests} ppl</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )})}
                </div>
            </div>
        </div>
      )}

      {/* Split Order Modal */}
      {showSplitModal && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col h-[600px] border dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2"><ArrowRightLeft size={20}/> Split / Move Items</h3>
                    <button onClick={() => setShowSplitModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                     <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Select items to move from <strong>Table {state.tables.find(t=>t.id === activeOrder.tableId)?.name.replace('Table', '')}</strong></p>
                     <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                         {activeOrder.items.map((item, idx) => (
                             <button 
                                key={item.cartItemId + idx}
                                onClick={() => handleToggleSplitItem(item.cartItemId)}
                                className={`text-xs px-2 py-1 rounded border ${itemsToSplit.includes(item.cartItemId) ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white border-gray-300 text-gray-700'}`}
                             >
                                 {item.quantity}x {item.name}
                             </button>
                         ))}
                     </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Move to Table:</label>
                    <div className="grid grid-cols-3 gap-2">
                        {state.tables.filter(t => t.id !== activeOrder.tableId).map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSplitTargetTableId(t.id)}
                                className={`p-3 rounded-lg border text-sm font-bold transition-all ${
                                    splitTargetTableId === t.id 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                    : t.status === 'OCCUPIED' 
                                        ? 'bg-red-50 text-red-700 border-red-200' 
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                                }`}
                            >
                                {t.name}
                                {t.status === 'OCCUPIED' && <span className="block text-[10px] font-normal">Merge</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t dark:border-gray-700">
                    <button 
                        onClick={handleSplitOrder}
                        disabled={itemsToSplit.length === 0 || !splitTargetTableId}
                        className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-700"
                    >
                        Confirm Split / Move
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Reservation Modal */}
      {reservationModal.isOpen && reservationModal.table && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 border dark:border-gray-700">
                 <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Reservations for {reservationModal.table.name}</h3>
                 
                 {/* New Reservation Form */}
                 <div className="space-y-3 mb-6">
                     <input className="w-full p-2 border dark:border-gray-600 rounded bg-transparent dark:text-white" placeholder="Customer Name" value={resName} onChange={e=>setResName(e.target.value)} />
                     <input className="w-full p-2 border dark:border-gray-600 rounded bg-transparent dark:text-white" placeholder="Phone" value={resPhone} onChange={e=>setResPhone(e.target.value)} />
                     <div className="flex gap-2">
                        <input type="datetime-local" className="flex-1 p-2 border dark:border-gray-600 rounded bg-transparent dark:text-white" value={resTime} onChange={e=>setResTime(e.target.value)} />
                        <input type="number" className="w-20 p-2 border dark:border-gray-600 rounded bg-transparent dark:text-white" value={resGuests} onChange={e=>setResGuests(parseInt(e.target.value))} min={1} />
                     </div>
                     <button onClick={handleBookReservation} className="w-full bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700">Add Reservation</button>
                 </div>

                 {/* Existing Reservations List */}
                 <div className="border-t dark:border-gray-700 pt-4">
                     <h4 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-2 uppercase">Upcoming</h4>
                     <div className="space-y-2 max-h-40 overflow-y-auto">
                         {reservationModal.table.reservations?.length ? (
                             reservationModal.table.reservations.map(res => (
                                 <div key={res.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm">
                                     <div>
                                         <p className="font-bold text-gray-800 dark:text-white">{new Date(res.dateTime).toLocaleString()}</p>
                                         <p className="text-xs text-gray-500 dark:text-gray-300">{res.customerName} ({res.guests} ppl)</p>
                                     </div>
                                     <button onClick={() => handleCancelReservation(reservationModal.table!.id, res.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 p-1 rounded"><X size={16}/></button>
                                 </div>
                             ))
                         ) : (
                             <p className="text-sm text-gray-400 italic">No upcoming reservations</p>
                         )}
                     </div>
                 </div>

                 <button onClick={() => setReservationModal({ isOpen: false, table: null })} className="mt-4 w-full py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300 font-bold">Close</button>
             </div>
          </div>
      )}

      {/* Print Modal */}
      {printData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2"><Printer size={18}/> {printData.title}</h3>
                    <button onClick={() => setPrintData(null)} className="hover:text-gray-300"><X size={20}/></button>
                </div>
                <div className="p-4 bg-gray-100 overflow-y-auto flex-1 flex justify-center">
                    <div className="bg-white p-4 shadow-md text-xs font-mono border-x-4 border-dashed border-gray-300 w-full max-w-[300px]">
                         <pre className="whitespace-pre-wrap leading-tight text-black">{printData.content}</pre>
                    </div>
                </div>
                <div className="p-4 bg-white border-t flex gap-2">
                    <button onClick={() => { window.print(); }} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">Print Now</button>
                    <button onClick={() => setPrintData(null)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded font-bold hover:bg-gray-300">Close</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};