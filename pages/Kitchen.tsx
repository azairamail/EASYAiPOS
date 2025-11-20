import React, { useState, useEffect, useRef } from 'react';
import { usePos } from '../context/PosContext';
import { OrderStatus } from '../types';
import { Clock, CheckCircle, ChefHat, AlertCircle, StickyNote, Volume2, VolumeX } from 'lucide-react';

export const Kitchen: React.FC = () => {
  const { state, dispatch } = usePos();
  
  // Initialize from local storage so the setting persists across reloads
  const [isSoundOn, setIsSoundOn] = useState(() => localStorage.getItem('kdsSound') === 'true');
  
  // Track processed orders to prevent repeat notifications
  const processedOrderIds = useRef<Set<string>>(new Set());
  const firstRun = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio context on mount
  useEffect(() => {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audioRef.current.volume = 1.0; 
      
      // Pre-load the IDs present at mount so we don't blast sound on refresh
      if (firstRun.current) {
          state.orders.forEach(o => processedOrderIds.current.add(o.id));
          firstRun.current = false;
      }
  }, []);

  const toggleSound = () => {
      const newState = !isSoundOn;
      setIsSoundOn(newState);
      localStorage.setItem('kdsSound', String(newState));

      // Crucial: Play immediately on user interaction to unlock browser autoplay policies
      if (newState && audioRef.current) {
          audioRef.current.play().catch(e => console.log("Audio unlock check:", e));
      }
  };

  // Watch for new orders to play sound
  useEffect(() => {
      // Find truly new orders that we haven't seen in this session
      const newOrders = state.orders.filter(o => !processedOrderIds.current.has(o.id));
      
      if (newOrders.length > 0) {
          // Update the ref with new IDs immediately to prevent double firing
          newOrders.forEach(o => processedOrderIds.current.add(o.id));

          // Logic: Only play sound if the new order is PENDING.
          const hasNewPendingOrder = newOrders.some(o => o.status === OrderStatus.PENDING);

          if (isSoundOn && hasNewPendingOrder && audioRef.current) {
              // Reset time to 0 to allow rapid replays
              audioRef.current.currentTime = 0;
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                  playPromise.catch(error => {
                      console.warn("Audio playback blocked. User interaction required.", error);
                  });
              }
          }
      }
  }, [state.orders, isSoundOn]);

  // Filter active orders
  const activeOrders = state.orders.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED);

  const advanceOrder = (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus = OrderStatus.PENDING;
    if (currentStatus === OrderStatus.PENDING) nextStatus = OrderStatus.COOKING;
    else if (currentStatus === OrderStatus.COOKING) nextStatus = OrderStatus.READY;
    else if (currentStatus === OrderStatus.READY) nextStatus = OrderStatus.COMPLETED;

    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status: nextStatus } });
    
    // Free table if completed
    if (nextStatus === OrderStatus.COMPLETED) {
        const order = state.orders.find(o => o.id === orderId);
        if (order && order.tableId) {
             dispatch({ type: 'UPDATE_TABLE_STATUS', payload: { tableId: order.tableId, status: 'AVAILABLE' } });
        }
    }
  };

  const getStatusColor = (status: OrderStatus) => {
      switch(status) {
          case OrderStatus.PENDING: return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300';
          case OrderStatus.COOKING: return 'bg-orange-100 dark:bg-orange-900/30 border-orange-400 dark:border-orange-700 text-orange-800 dark:text-orange-300';
          case OrderStatus.READY: return 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-700 text-green-800 dark:text-green-300';
          default: return 'bg-gray-100 dark:bg-gray-700';
      }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
           <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
             <ChefHat size={28} className="text-gray-700 dark:text-gray-300" />
           </div>
           <div>
               <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Kitchen Display System</h1>
               <p className="text-xs text-gray-500 dark:text-gray-400">Real-time order tracking</p>
           </div>
        </div>

        <div className="flex items-center gap-4">
            {/* Sound Toggle */}
            <button 
                onClick={toggleSound}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    isSoundOn 
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                title={isSoundOn ? "Sound Notifications ON" : "Sound Notifications OFF"}
            >
                {isSoundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                <span className="hidden md:inline">{isSoundOn ? 'Sound ON' : 'Sound OFF'}</span>
            </button>

            <div className="flex gap-4 text-sm font-medium bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400"></span> Pending</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400"></span> Cooking</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-400"></span> Ready</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeOrders.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600">
                <CheckCircle size={64} className="mb-4 opacity-20" />
                <p className="text-xl">All caught up! No active orders.</p>
            </div>
        ) : (
            activeOrders.map(order => (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 transition-colors h-fit">
                {/* Header */}
                <div className={`p-3 border-b dark:border-gray-700 flex justify-between items-center ${getStatusColor(order.status)} bg-opacity-30`}>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base">#{order.invoiceNumber || order.id.slice(-4)}</h3>
                        <span className="flex items-center gap-1 text-[10px] font-medium opacity-80 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded shadow-sm">
                            <Clock size={10} />
                            {new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                    <div className="text-right">
                         <p className="font-bold text-sm">{order.tableId ? `Table ${state.tables.find(t=>t.id === order.tableId)?.name.replace('Table ', '')}` : 'Takeaway'}</p>
                    </div>
                </div>

                {/* Items - Compact List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 text-gray-800 dark:text-gray-200">
                    {order.items.map((item, idx) => (
                        <div key={item.cartItemId || idx} className="border-b border-dashed dark:border-gray-600 pb-2 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-sm w-6">{item.quantity}x</span>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold leading-tight">{item.name}</p>
                                    {item.modifiers && item.modifiers.length > 0 && (
                                        <p className="text-[10px] text-orange-700 dark:text-orange-400 font-medium mt-0.5 flex flex-wrap gap-1">
                                            {item.modifiers.map(m => <span key={m.name} className="bg-orange-50 dark:bg-orange-900/30 px-1 rounded border border-orange-100 dark:border-orange-800">{m.name}</span>)}
                                        </p>
                                    )}
                                    {item.notes && (
                                        <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-1.5 rounded mt-1 flex items-start gap-1.5">
                                            <StickyNote size={12} className="mt-0.5 shrink-0" />
                                            <span className="italic leading-tight font-medium">{item.notes}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action Button */}
                <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <button 
                        onClick={() => advanceOrder(order.id, order.status)}
                        className={`w-full py-2 rounded-lg font-bold text-sm text-white transition-colors flex items-center justify-center gap-2 ${
                            order.status === OrderStatus.PENDING ? 'bg-orange-500 hover:bg-orange-600' :
                            order.status === OrderStatus.COOKING ? 'bg-green-500 hover:bg-green-600' :
                            'bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500'
                        }`}
                    >
                        {order.status === OrderStatus.PENDING && <>Start Cooking <ChefHat size={14}/></>}
                        {order.status === OrderStatus.COOKING && <>Mark Ready <CheckCircle size={14}/></>}
                        {order.status === OrderStatus.READY && <>Serve Order <CheckCircle size={14}/></>}
                    </button>
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};