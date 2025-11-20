import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { getMenuDescription } from '../services/gemini';
import { Plus, Wand2, Image as ImageIcon, Save, Edit2, Trash2, X, RefreshCw, AlertTriangle, Tag, Minus } from 'lucide-react';
import { MenuItem, Modifier } from '../types';

export const MenuManage: React.FC = () => {
  const { state, dispatch } = usePos();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [inStock, setInStock] = useState(true);
  const [itemQuantity, setItemQuantity] = useState('');
  
  // Modifier State
  const [modifiersList, setModifiersList] = useState<Modifier[]>([]);
  const [modNameInput, setModNameInput] = useState('');
  const [modPriceInput, setModPriceInput] = useState('');
  
  const [loadingDesc, setLoadingDesc] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null; name: string | null }>({
    isOpen: false,
    id: null,
    name: null,
  });

  const resetForm = () => {
      setName('');
      setCategory('');
      setPrice('');
      setDesc('');
      setImageUrl(`https://picsum.photos/200/200?random=${Date.now()}`);
      setInStock(true);
      setItemQuantity('');
      setModifiersList([]);
      setModNameInput('');
      setModPriceInput('');
      setEditingId(null);
      setIsFormOpen(false);
  };

  const handleAddNew = () => {
      resetForm();
      setImageUrl(`https://picsum.photos/200/200?random=${Date.now()}`);
      setIsFormOpen(true);
  };

  const handleEdit = (item: MenuItem) => {
      setEditingId(item.id);
      setName(item.name);
      setCategory(item.category);
      setPrice(item.price.toString());
      setDesc(item.description || '');
      setImageUrl(item.image || '');
      setInStock(item.inStock);
      setItemQuantity(item.quantity ? item.quantity.toString() : '');
      setModifiersList(item.availableModifiers || []);
      setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
      setDeleteConfirmation({ isOpen: true, id, name });
  };

  const confirmDelete = () => {
      if (deleteConfirmation.id) {
          dispatch({ type: 'DELETE_MENU_ITEM', payload: deleteConfirmation.id });
      }
      setDeleteConfirmation({ isOpen: false, id: null, name: null });
  };

  const handleToggleStock = (item: MenuItem) => {
      const updatedItem = { ...item, inStock: !item.inStock };
      dispatch({ type: 'UPDATE_MENU_ITEM', payload: updatedItem });
  };

  const handleQuantityAdjust = (item: MenuItem, delta: number) => {
      const currentQty = item.quantity || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      const updatedItem = {
          ...item,
          quantity: newQty,
          // Auto-update inStock status based on quantity
          inStock: newQty > 0 ? true : false
      };
      dispatch({ type: 'UPDATE_MENU_ITEM', payload: updatedItem });
  };

  const handleGenerateDesc = async () => {
      if(!name) return alert("Please enter a name first");
      setLoadingDesc(true);
      const generated = await getMenuDescription(name, category);
      setDesc(generated);
      setLoadingDesc(false);
  };

  const handleRandomizeImage = () => {
      setImageUrl(`https://picsum.photos/200/200?random=${Date.now()}`);
  };

  // Modifier Handlers
  const handleAddModifier = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (modNameInput.trim()) {
          const price = parseFloat(modPriceInput) || 0;
          // Check if exists by name
          if (!modifiersList.some(m => m.name.toLowerCase() === modNameInput.trim().toLowerCase())) {
              setModifiersList([...modifiersList, { name: modNameInput.trim(), price }]);
          }
          setModNameInput('');
          setModPriceInput('');
      }
  };

  const handleRemoveModifier = (modName: string) => {
      setModifiersList(modifiersList.filter(mod => mod.name !== modName));
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const itemPayload: MenuItem = {
          id: editingId || Date.now().toString(),
          name,
          category,
          price: parseFloat(price) || 0,
          description: desc,
          inStock,
          quantity: itemQuantity ? parseInt(itemQuantity) : undefined,
          image: imageUrl,
          availableModifiers: modifiersList.length > 0 ? modifiersList : undefined
      };

      if (editingId) {
          dispatch({ type: 'UPDATE_MENU_ITEM', payload: itemPayload });
      } else {
          dispatch({ type: 'ADD_MENU_ITEM', payload: itemPayload });
      }
      
      resetForm();
  };

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen h-full overflow-y-auto transition-colors duration-200">
       <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Menu Management</h1>
          {!isFormOpen && (
            <button 
                onClick={handleAddNew}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-orange-700 transition-colors"
            >
                <Plus size={20} /> Add New Item
            </button>
          )}
       </div>

       {isFormOpen && (
           <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-8 border border-orange-100 dark:border-gray-700 animate-in slide-in-from-top-4 transition-colors">
               <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Dish' : 'Add New Dish'}</h2>
                    <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24}/></button>
               </div>
               
               <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Left Column: Inputs */}
                   <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name</label>
                            <input required value={name} onChange={e=>setName(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors" placeholder="e.g. Beef Tehari" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                <input required value={category} onChange={e=>setCategory(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors" placeholder="e.g. Rice" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (BDT)</label>
                                <input required type="number" value={price} onChange={e=>setPrice(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors" placeholder="0.00" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Qty</label>
                                <input type="number" value={itemQuantity} onChange={e=>setItemQuantity(e.target.value)} className="w-full border dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors" placeholder="Optional" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <div className="flex gap-2">
                                <textarea required value={desc} onChange={e=>setDesc(e.target.value)} className="flex-1 border dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors" rows={3} placeholder="Enter description..." />
                                <button 
                                    type="button" 
                                    onClick={handleGenerateDesc}
                                    disabled={loadingDesc}
                                    className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 rounded-lg font-medium flex flex-col items-center justify-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800 w-24"
                                >
                                    <Wand2 size={20} />
                                    <span className="text-xs text-center">{loadingDesc ? '...' : 'AI Write'}</span>
                                </button>
                            </div>
                        </div>
                        
                        {/* Enhanced Modifier Section */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Tag size={14} /> Modifiers / Options
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    value={modNameInput} 
                                    onChange={e=>setModNameInput(e.target.value)} 
                                    className="flex-[2] border dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors" 
                                    placeholder="Option Name (e.g. Spicy)" 
                                />
                                <input 
                                    type="number"
                                    value={modPriceInput} 
                                    onChange={e=>setModPriceInput(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddModifier())}
                                    className="flex-1 border dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors" 
                                    placeholder="Price (0)" 
                                />
                                <button 
                                    type="button"
                                    onClick={() => handleAddModifier()}
                                    className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 min-h-[2rem]">
                                {modifiersList.length === 0 ? (
                                    <span className="text-xs text-gray-400 italic p-1">No modifiers added</span>
                                ) : (
                                    modifiersList.map((mod, idx) => (
                                        <span key={idx} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                            <span>{mod.name} <span className="text-orange-600 dark:text-orange-400 ml-0.5 font-bold">+{mod.price}</span></span>
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveModifier(mod.name)}
                                                className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <input 
                                type="checkbox" 
                                id="inStock" 
                                checked={inStock} 
                                onChange={e => setInStock(e.target.checked)}
                                className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-gray-300 dark:border-gray-600"
                            />
                            <label htmlFor="inStock" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">Available / In Stock</label>
                        </div>
                   </div>

                   {/* Right Column: Image Preview & URL */}
                   <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 h-fit">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Image</label>
                        <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-3 relative group">
                            {imageUrl ? (
                                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                    <ImageIcon size={40} />
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-2 mb-2">
                             <input 
                                value={imageUrl} 
                                onChange={e=>setImageUrl(e.target.value)} 
                                className="flex-1 border dark:border-gray-600 rounded-lg p-2 text-xs focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700 dark:text-white transition-colors" 
                                placeholder="https://..." 
                             />
                             <button 
                                type="button"
                                onClick={handleRandomizeImage}
                                className="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                title="Random Image"
                             >
                                 <RefreshCw size={18} />
                             </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Enter an image URL or click randomize.</p>
                   </div>

                   {/* Footer Buttons */}
                   <div className="md:col-span-2 flex justify-end gap-3 border-t dark:border-gray-700 pt-4 mt-2">
                       <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                       <button type="submit" className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 flex items-center gap-2">
                           <Save size={18} /> {editingId ? 'Update Item' : 'Save Item'}
                       </button>
                   </div>
               </form>
           </div>
       )}

       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
           <table className="w-full text-left">
               <thead className="bg-gray-50 dark:bg-gray-750 border-b dark:border-gray-700">
                   <tr>
                       <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Image</th>
                       <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Details</th>
                       <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Category</th>
                       <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Price</th>
                       <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Status & Stock</th>
                       <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                   </tr>
               </thead>
               <tbody className="divide-y dark:divide-gray-700">
                   {state.menu.map(item => (
                       <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${!item.inStock ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                           <td className="p-4">
                               <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden border border-gray-100 dark:border-gray-700 relative">
                                   <img 
                                        src={item.image} 
                                        alt="" 
                                        className={`w-full h-full object-cover ${!item.inStock ? 'grayscale opacity-60' : ''}`} 
                                   />
                                   {!item.inStock && (
                                       <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                           <div className="bg-white/80 rounded-full p-1 shadow-sm">
                                               <AlertTriangle size={12} className="text-red-600" />
                                           </div>
                                       </div>
                                   )}
                               </div>
                           </td>
                           <td className="p-4">
                               <div className="flex items-center gap-2">
                                   <p className={`font-bold ${!item.inStock ? 'text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{item.name}</p>
                                   {!item.inStock && (
                                       <span title="Out of Stock">
                                           <AlertTriangle size={16} className="text-red-500" />
                                       </span>
                                   )}
                               </div>
                               <p className="text-xs text-gray-400 dark:text-gray-500 font-normal truncate max-w-[200px]">{item.description}</p>
                               {item.availableModifiers && (
                                   <div className="flex flex-wrap gap-1 mt-1">
                                       {item.availableModifiers.map(mod => (
                                           <span key={mod.name} className="text-[9px] bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-1.5 rounded border border-orange-100 dark:border-orange-800">
                                               {mod.name} {mod.price > 0 ? `(+${mod.price})` : ''}
                                           </span>
                                       ))}
                                   </div>
                               )}
                           </td>
                           <td className="p-4 text-gray-600 dark:text-gray-300">
                               <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-medium">{item.category}</span>
                           </td>
                           <td className="p-4 font-bold text-gray-800 dark:text-white">৳{item.price}</td>
                           <td className="p-4">
                               <div className="flex items-center gap-4">
                                   {/* Toggle Switch */}
                                   <div className="flex flex-col items-center gap-1">
                                       <button 
                                           onClick={() => handleToggleStock(item)}
                                           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                                               item.inStock ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                           }`}
                                           title={item.inStock ? "Mark as Out of Stock" : "Mark as In Stock"}
                                       >
                                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                               item.inStock ? 'translate-x-6' : 'translate-x-1'
                                           }`} />
                                       </button>
                                       <span className={`text-[10px] font-bold ${
                                           item.inStock 
                                           ? 'text-green-700 dark:text-green-300' 
                                           : 'text-gray-500 dark:text-gray-400'
                                       }`}>
                                           {item.inStock ? 'In Stock' : 'Sold Out'}
                                       </span>
                                   </div>

                                   {/* Quantity Quick Adjust */}
                                   <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                                       <button 
                                            onClick={() => handleQuantityAdjust(item, -1)}
                                            className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 rounded transition-colors"
                                       >
                                           <Minus size={14} />
                                       </button>
                                       <div className="w-8 text-center font-mono text-sm font-bold text-gray-800 dark:text-white">
                                           {item.quantity !== undefined ? item.quantity : '-'}
                                       </div>
                                       <button 
                                            onClick={() => handleQuantityAdjust(item, 1)}
                                            className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 rounded transition-colors"
                                       >
                                           <Plus size={14} />
                                       </button>
                                   </div>
                               </div>
                           </td>
                           <td className="p-4 text-right">
                               <div className="flex justify-end gap-2">
                                   <button 
                                        onClick={() => handleEdit(item)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                                        title="Edit"
                                   >
                                       <Edit2 size={16} />
                                   </button>
                                   <button 
                                        onClick={() => handleDeleteClick(item.id, item.name)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                                        title="Delete"
                                   >
                                       <Trash2 size={16} />
                                   </button>
                               </div>
                           </td>
                       </tr>
                   ))}
               </tbody>
           </table>
       </div>

       {/* Delete Confirmation Modal */}
       {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-gray-700">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Item?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Are you sure you want to delete <span className="font-bold text-gray-800 dark:text-gray-200">"{deleteConfirmation.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmation({ isOpen: false, id: null, name: null })}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};