import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePos } from '../context/PosContext';
import { OrderStatus, Order, OrderType, PaymentMethod, CartItem, Table } from '../types';
import { Search, FileText, DollarSign, RotateCcw, Printer, Ban, Filter, Check, AlertCircle, CreditCard, X, Banknote, Smartphone, CheckCircle, StickyNote, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

export const OrderHistory: React.FC = () => {
  const { state, dispatch } = usePos();
  const { settings } = state;
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPayment, setFilterPayment] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Modal State
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [orderToSettle, setOrderToSettle] = useState<Order | null>(null);
  
  // Void Confirmation State
  const [voidConfirmation, setVoidConfirmation] = useState<{ isOpen: boolean; order: Order | null }>({
    isOpen: false,
    order: null
  });
  
  // Detail View State
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Print Modal State
  const [printData, setPrintData] = useState<{title: string, content: string} | null>(null);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterType, filterPayment, searchQuery]);

  const filteredOrders = state.orders
    .filter(order => {
        if (filterStatus !== 'ALL' && order.status !== filterStatus) return false;
        if (filterType !== 'ALL' && order.type !== filterType) return false;
        
        if (filterPayment !== 'ALL') {
            if (filterPayment === 'UNPAID') {
                if (order.paymentMethod) return false;
            } else {
                if (order.paymentMethod !== filterPayment) return false;
            }
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const invoiceStr = order.invoiceNumber ? order.invoiceNumber.toLowerCase() : '';
            return order.id.toLowerCase().includes(q) || 
                   invoiceStr.includes(q) ||
                   order.customerPhone?.includes(q) ||
                   order.customerName?.toLowerCase().includes(q);
        }
        return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const totalRevenue = filteredOrders
    .filter(o => o.status !== OrderStatus.CANCELLED && o.paymentMethod)
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED: return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case OrderStatus.CANCELLED: return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case OrderStatus.PENDING: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case OrderStatus.COOKING: return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case OrderStatus.READY: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  const handleRecall = (order: Order) => {
    if (window.confirm(`Recall items from Order #${order.invoiceNumber || order.id.slice(-4)} to current cart?`)) {
        navigate('/', { state: { recalledItems: order.items } });
    }
  };

  // Re-using the Receipt Generation Logic locally for History
  const generateReceiptText = (order: Order) => {
    const line = "-".repeat(32);
    const center = (str: string) => {
        const pad = Math.max(0, Math.floor((32 - str.length) / 2));
        return " ".repeat(pad) + str;
    };

    let text = "";
    text += center(settings.invoiceHeader || "RECEIPT") + "\n";
    text += center(settings.storeName) + "\n";
    if (settings.address) text += center(settings.address) + "\n";
    if (settings.phone) text += center(settings.phone) + "\n";
    text += `${line}\n`;
    
    text += `Date: ${new Date(order.timestamp).toLocaleString('en-GB', { hour12: true })}\n`;
    text += `Invoice: #${order.invoiceNumber || order.id.slice(-6).toUpperCase()}\n`;
    text += `Type: ${order.type}\n`;
    if (order.tableId) {
        const tableName = state.tables.find(t => t.id === order.tableId)?.name || 'Unknown Table';
        text += `Table: ${tableName}\n`;
    }
    text += `${line}\n`;

    text += `Qty Item             Price\n`;
    order.items.forEach(item => {
            const modsTotal = item.modifiers ? item.modifiers.reduce((acc, m) => acc + m.price, 0) : 0;
            const total = ((item.price + modsTotal) * item.quantity).toFixed(2);
            const name = item.name.substring(0, 16).padEnd(16);
            const qty = item.quantity.toString().padEnd(3);
            text += `${qty} ${name} ${total.padStart(8)}\n`;
    });
    
    text += `${line}\n`;
    
    // Recalculate breakdown for display
    const subtotal = order.items.reduce((acc, i) => {
        const modsTotal = i.modifiers ? i.modifiers.reduce((mAcc, m) => mAcc + m.price, 0) : 0;
        return acc + ((i.price + modsTotal) * i.quantity);
    }, 0);

    const taxAmt = settings.vatEnabled ? subtotal * (settings.vatRate / 100) : 0;
    const svc = (settings.serviceChargeEnabled && order.type === OrderType.DINE_IN) ? subtotal * (settings.serviceChargeRate / 100) : 0;
    // Note: Stored totalAmount includes everything. We try to reconstruct the view.
    
    text += `Subtotal:    ${subtotal.toFixed(2).padStart(10)}\n`;
    if (settings.vatEnabled) text += `VAT (${settings.vatRate}%):    ${taxAmt.toFixed(2).padStart(10)}\n`;
    if (settings.serviceChargeEnabled && svc > 0) text += `S.Charge:    ${svc.toFixed(2).padStart(10)}\n`;
    
    text += `${line}\n`;
    text += `TOTAL:       ${settings.currencySymbol}${order.totalAmount.toFixed(2).padStart(9)}\n`;
    text += `${line}\n`;
    
    text += `Payment: ${order.paymentMethod || 'UNPAID'}\n`;
    if (settings.invoiceFooter) {
        text += center(settings.invoiceFooter) + "\n";
    } else {
        text += center("Thank You!") + "\n";
    }
    
    return text;
  };

  const handlePrint = (order: Order) => {
    const content = generateReceiptText(order);
    setPrintData({ title: `Invoice #${order.invoiceNumber}`, content });
  };

  const handleUpdateStatus = (order: Order, newStatus: OrderStatus) => {
    if (newStatus === OrderStatus.CANCELLED) {
        setVoidConfirmation({ isOpen: true, order });
        return;
    }
    
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId: order.id, status: newStatus } });

    // Free table if completed
    if (newStatus === OrderStatus.COMPLETED && order.tableId) {
        const currentTable = state.tables.find(t => t.id === order.tableId);
        if (currentTable && currentTable.currentOrderId === order.id) {
             dispatch({ type: 'UPDATE_TABLE_STATUS', payload: { tableId: order.tableId, status: 'AVAILABLE' } });
        }
    }
  };

  const confirmVoidOrder = () => {
      const order = voidConfirmation.order;
      if (!order) return;

      dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId: order.id, status: OrderStatus.CANCELLED } });

      if (order.tableId) {
        const currentTable = state.tables.find(t => t.id === order.tableId);
        if (currentTable && currentTable.currentOrderId === order.id) {
             dispatch({ type: 'UPDATE_TABLE_STATUS', payload: { tableId: order.tableId, status: 'AVAILABLE' } });
        }
      }
      setVoidConfirmation({ isOpen: false, order: null });
  };

  const openSettleModal = (order: Order) => {
      setOrderToSettle(order);
      setShowSettleModal(true);
  };

  const handleSettlePayment = (method: PaymentMethod) => {
      if (!orderToSettle) return;
      
      // 1. Update Payment Method
      dispatch({ 
          type: 'UPDATE_ORDER_PAYMENT', 
          payload: { orderId: orderToSettle.id, paymentMethod: method } 
      });

      // 2. Mark as COMPLETED if not already (and free table)
      if (orderToSettle.status !== OrderStatus.COMPLETED) {
          dispatch({ 
              type: 'UPDATE_ORDER_STATUS', 
              payload: { orderId: orderToSettle.id, status: OrderStatus.COMPLETED } 
          });
          
          // Free table if applicable
          if (orderToSettle.tableId) {
             const currentTable = state.tables.find(t => t.id === orderToSettle.tableId);
             if (currentTable && currentTable.currentOrderId === orderToSettle.id) {
                 dispatch({ type: 'UPDATE_TABLE_STATUS', payload: { tableId: orderToSettle.tableId, status: 'AVAILABLE' } });
             }
          }
      }

      setShowSettleModal(false);
      setOrderToSettle(null);
  };

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Order History</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">View and manage all past transactions</p>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                    <DollarSign size={18} />
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Revenue (Collected)</p>
                    <p className="font-bold text-lg text-gray-800 dark:text-white">৳{totalRevenue.toLocaleString()}</p>
                </div>
            </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 space-y-4 transition-colors">
            {/* Search */}
            <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search by Order ID, Invoice #, Phone..." 
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white transition-all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
            
            {/* Filter Options */}
            <div className="flex flex-col xl:flex-row gap-6 border-t dark:border-gray-700 pt-4">
                {/* Order Type Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    <span className="text-xs font-bold text-gray-400 uppercase shrink-0 flex items-center gap-1">
                        <Filter size={12}/> Type:
                    </span>
                    {['ALL', OrderType.DINE_IN, OrderType.TAKE_AWAY, OrderType.DELIVERY].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${
                                filterType === type 
                                ? 'bg-orange-500 text-white shadow-sm' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            {type === 'ALL' ? 'All' : type.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <div className="hidden xl:block w-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Payment Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    <span className="text-xs font-bold text-gray-400 uppercase shrink-0 flex items-center gap-1">
                        <Filter size={12}/> Payment:
                    </span>
                    {['ALL', 'UNPAID', PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.BKASH, PaymentMethod.NAGAD].map(method => (
                        <button
                            key={method}
                            onClick={() => setFilterPayment(method)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${
                                filterPayment === method 
                                ? 'bg-purple-600 text-white shadow-sm' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            {method === 'ALL' ? 'All' : method}
                        </button>
                    ))}
                </div>

                <div className="hidden xl:block w-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Order Status Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    <span className="text-xs font-bold text-gray-400 uppercase shrink-0 flex items-center gap-1">
                        <Filter size={12}/> Status:
                    </span>
                    {['ALL', OrderStatus.COMPLETED, OrderStatus.PENDING, OrderStatus.CANCELLED].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${
                                filterStatus === status 
                                ? 'bg-slate-700 text-white shadow-sm' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            {status === 'ALL' ? 'All' : status}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                        <tr>
                            <th className="p-4 font-medium">Invoice / Order ID</th>
                            <th className="p-4 font-medium">Date & Time</th>
                            <th className="p-4 font-medium">Customer / Table</th>
                            <th className="p-4 font-medium">Payment</th>
                            <th className="p-4 font-medium">Total</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentItems.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-400 dark:text-gray-600">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <FileText size={40} className="opacity-20" />
                                        <p>No orders found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            currentItems.map(order => (
                                <React.Fragment key={order.id}>
                                <tr className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group cursor-pointer" onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}>
                                    <td className="p-4 font-bold text-gray-700 dark:text-gray-200">
                                        {order.invoiceNumber ? (
                                            <span className="text-orange-600 dark:text-orange-400">{order.invoiceNumber}</span>
                                        ) : (
                                            <span>#{order.id.slice(-6).toUpperCase()}</span>
                                        )}
                                        <div className="mt-1">
                                             <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300 font-bold">{order.type.replace('_', ' ')}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-400">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{new Date(order.timestamp).toLocaleDateString()}</span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            {order.tableId ? (
                                                <span className="font-medium text-gray-800 dark:text-gray-200">Table {state.tables.find(t => t.id === order.tableId)?.name.replace('Table ', '')}</span>
                                            ) : (
                                                <span className="font-medium text-gray-500 dark:text-gray-400">N/A</span>
                                            )}
                                            {order.customerPhone && <span className="text-xs text-gray-400 dark:text-gray-500">{order.customerPhone}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {order.paymentMethod ? (
                                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                                                <Check size={14} /> {order.paymentMethod}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-500 font-bold text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full w-fit">
                                                <AlertCircle size={12} /> UNPAID
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 font-bold text-gray-800 dark:text-white">৳{order.totalAmount.toFixed(2)}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="p-4" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-center gap-2 items-center">
                                            {/* Settle Button for Unpaid Orders */}
                                            {!order.paymentMethod && order.status !== OrderStatus.CANCELLED && (
                                                <button 
                                                    onClick={() => openSettleModal(order)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg transition-colors text-xs font-bold shadow-sm"
                                                    title="Settle Payment"
                                                >
                                                    <CreditCard size={14} />
                                                    <span className="hidden sm:inline">Settle</span>
                                                </button>
                                            )}

                                            <button 
                                                onClick={() => handleRecall(order)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors text-xs font-bold shadow-sm"
                                                title="Recall Order to Cart"
                                            >
                                                <RotateCcw size={14} /> 
                                                <span className="hidden sm:inline">Recall</span>
                                            </button>
                                            
                                            <button 
                                                onClick={() => handlePrint(order)}
                                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                title="Print Bill"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            
                                            {/* Mark Completed & Void Actions */}
                                            {order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.COMPLETED && (
                                                <>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(order, OrderStatus.COMPLETED)}
                                                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                                        title="Mark Completed"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(order, OrderStatus.CANCELLED)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                        title="Void Order"
                                                    >
                                                        <Ban size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedOrderId === order.id && (
                                    <tr className="bg-gray-50 dark:bg-gray-750 animate-in fade-in slide-in-from-top-2">
                                        <td colSpan={7} className="p-4">
                                            <div className="ml-10 text-sm">
                                                <p className="font-bold text-gray-500 dark:text-gray-400 mb-2 text-xs uppercase">Order Details</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                                                            <div className="flex justify-between">
                                                                <span className="font-medium text-gray-800 dark:text-gray-200">{item.quantity}x {item.name}</span>
                                                                <span className="text-gray-500 dark:text-gray-400">৳{item.price * item.quantity}</span>
                                                            </div>
                                                            {item.modifiers && (
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{item.modifiers.map(m => m.name).join(', ')}</p>
                                                            )}
                                                            {item.notes && (
                                                                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1 italic flex items-center gap-1"><StickyNote size={10}/> {item.notes}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Footer */}
            {filteredOrders.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 gap-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing <span className="font-bold text-gray-800 dark:text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-gray-800 dark:text-white">{Math.min(indexOfLastItem, filteredOrders.length)}</span> of <span className="font-bold text-gray-800 dark:text-white">{filteredOrders.length}</span> entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handlePageChange(currentPage - 1)} 
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center px-2 gap-1">
                             <span className="text-sm font-medium text-gray-800 dark:text-white">Page {currentPage} of {totalPages}</span>
                        </div>
                        <button 
                            onClick={() => handlePageChange(currentPage + 1)} 
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Settle Payment Modal */}
        {showSettleModal && orderToSettle && (
             <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-gray-700">
                    <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Settle Payment</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {orderToSettle.invoiceNumber ? `Invoice #${orderToSettle.invoiceNumber}` : `Order #${orderToSettle.id.slice(-6).toUpperCase()}`}
                            </p>
                        </div>
                        <button onClick={() => setShowSettleModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center border border-green-100 dark:border-green-800">
                            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold mb-1 tracking-wide">Total Amount Due</p>
                            <p className="text-3xl font-bold text-green-700 dark:text-green-400">৳{orderToSettle.totalAmount.toFixed(2)}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Payment Method</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handleSettlePayment(PaymentMethod.CASH)} 
                                    className="flex flex-col items-center gap-2 p-4 border dark:border-gray-600 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500 dark:hover:border-green-500 transition-all group"
                                >
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-green-200 dark:group-hover:bg-green-800">
                                        <Banknote className="text-green-600 dark:text-green-400" size={24} />
                                    </div>
                                    <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-green-700 dark:group-hover:text-green-400">Cash</span>
                                </button>
                                <button 
                                    onClick={() => handleSettlePayment(PaymentMethod.CARD)} 
                                    className="flex flex-col items-center gap-2 p-4 border dark:border-gray-600 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
                                >
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-800">
                                        <CreditCard className="text-blue-600 dark:text-blue-400" size={24} />
                                    </div>
                                    <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400">Card</span>
                                </button>
                                <button 
                                    onClick={() => handleSettlePayment(PaymentMethod.BKASH)} 
                                    className="flex flex-col items-center gap-2 p-4 border dark:border-gray-600 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:border-pink-500 dark:hover:border-pink-500 transition-all group"
                                >
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-pink-200 dark:group-hover:bg-pink-800">
                                        <span className="text-xl font-bold text-pink-600 dark:text-pink-400">b</span>
                                    </div>
                                    <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-pink-700 dark:group-hover:text-pink-400">bKash</span>
                                </button>
                                <button 
                                    onClick={() => handleSettlePayment(PaymentMethod.NAGAD)} 
                                    className="flex flex-col items-center gap-2 p-4 border dark:border-gray-600 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-500 dark:hover:border-orange-500 transition-all group"
                                >
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-orange-200 dark:group-hover:bg-orange-800">
                                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400">ন</span>
                                    </div>
                                    <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-orange-700 dark:group-hover:text-orange-400">Nagad</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        )}

        {/* Void Confirmation Modal */}
        {voidConfirmation.isOpen && voidConfirmation.order && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-gray-700">
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Void Order?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                            Are you sure you want to void Order <span className="font-bold">#{voidConfirmation.order.id.slice(-6).toUpperCase()}</span>? 
                            <br/>This action cannot be undone and will remove the order from sales reports.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setVoidConfirmation({ isOpen: false, order: null })}
                                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmVoidOrder}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-colors"
                            >
                                Void Order
                            </button>
                        </div>
                    </div>
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