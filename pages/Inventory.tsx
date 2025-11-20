import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { Package, AlertTriangle, PlusCircle, Layers, Edit2, Trash2, X, Save, Minus, Plus } from 'lucide-react';
import { InventoryItem } from '../types';

export const Inventory: React.FC = () => {
  const { state, dispatch } = usePos();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [threshold, setThreshold] = useState('');

  const openModal = (item?: InventoryItem) => {
      if (item) {
          setEditingId(item.id);
          setItemName(item.name);
          setQuantity(item.quantity.toString());
          setUnit(item.unit);
          setThreshold(item.threshold.toString());
      } else {
          setEditingId(null);
          setItemName('');
          setQuantity('');
          setUnit('kg');
          setThreshold('5');
      }
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const payload: InventoryItem = {
          id: editingId || `INV-${Date.now()}`,
          name: itemName,
          quantity: parseFloat(quantity) || 0,
          unit: unit,
          threshold: parseFloat(threshold) || 0
      };

      if (editingId) {
          dispatch({ type: 'UPDATE_INVENTORY', payload });
      } else {
          dispatch({ type: 'ADD_INVENTORY', payload });
      }
      closeModal();
  };

  const handleDelete = (id: string) => {
      if (window.confirm('Are you sure you want to remove this item from inventory?')) {
          dispatch({ type: 'DELETE_INVENTORY', payload: id });
      }
  };

  const quickAdjust = (item: InventoryItem, amount: number) => {
      const newQuantity = Math.max(0, item.quantity + amount);
      dispatch({ 
          type: 'UPDATE_INVENTORY', 
          payload: { ...item, quantity: newQuantity } 
      });
  };

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 h-full overflow-y-auto transition-colors duration-200">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
              <Package className="text-orange-600" /> Inventory Management
          </h1>
          <button 
            onClick={() => openModal()}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200 dark:shadow-none"
          >
             <PlusCircle size={20} /> Add Stock
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {state.inventory.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                  <Layers size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">No inventory items found.</p>
                  <p className="text-sm mt-1">Add stock items to start tracking.</p>
              </div>
          ) : (
              state.inventory.map(item => {
                  const isLow = item.quantity <= item.threshold;
                  return (
                    <div key={item.id} className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-t-4 transition-all hover:shadow-md ${isLow ? 'border-red-500' : 'border-green-500'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{item.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">ID: {item.id.slice(-4)}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openModal(item)} className="text-gray-400 hover:text-blue-500 transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        
                        <div className="flex items-end gap-2 mb-4">
                            <span className={`text-4xl font-bold ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
                                {item.quantity}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 font-medium mb-1.5">{item.unit}</span>
                            {isLow && <AlertTriangle className="text-red-500 mb-2 ml-auto animate-pulse" size={24} />}
                        </div>

                        {/* Quick Adjust Buttons */}
                        <div className="flex items-center gap-2 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
                            <button onClick={() => quickAdjust(item, -1)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"><Minus size={14} /></button>
                            <span className="text-xs font-bold w-4 text-center text-gray-600 dark:text-gray-300">Adj</span>
                            <button onClick={() => quickAdjust(item, 1)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300"><Plus size={14} /></button>
                        </div>

                        <div className="pt-4 border-t dark:border-gray-700 flex justify-between items-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Alert at: {item.threshold} {item.unit}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${isLow ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>
                                {isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                        </div>
                    </div>
                  );
              })
          )}
       </div>

       {/* Add/Edit Modal */}
       {isModalOpen && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border dark:border-gray-700">
                   <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                       <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Item' : 'Add New Stock'}</h3>
                       <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
                   </div>
                   
                   <form onSubmit={handleSubmit} className="p-6 space-y-4">
                       <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name</label>
                           <input 
                                required
                                type="text" 
                                value={itemName} 
                                onChange={e => setItemName(e.target.value)}
                                className="w-full p-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" 
                                placeholder="e.g. Basmati Rice" 
                           />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                               <input 
                                    required
                                    type="number" 
                                    step="0.01"
                                    value={quantity} 
                                    onChange={e => setQuantity(e.target.value)}
                                    className="w-full p-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" 
                                    placeholder="0" 
                               />
                           </div>
                           <div>
                               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                               <input 
                                    required
                                    type="text" 
                                    value={unit} 
                                    onChange={e => setUnit(e.target.value)}
                                    className="w-full p-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" 
                                    placeholder="kg, L, pcs" 
                               />
                           </div>
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Low Stock Alert Threshold</label>
                           <input 
                                required
                                type="number" 
                                step="0.01"
                                value={threshold} 
                                onChange={e => setThreshold(e.target.value)}
                                className="w-full p-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" 
                                placeholder="5" 
                           />
                           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You will be notified when stock falls below this level.</p>
                       </div>

                       <div className="pt-4 flex gap-3">
                           <button type="button" onClick={closeModal} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                           <button type="submit" className="flex-1 py-2.5 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 dark:shadow-none transition-colors flex justify-center items-center gap-2">
                               <Save size={18} /> Save Item
                           </button>
                       </div>
                   </form>
               </div>
           </div>
       )}
    </div>
  );
};