import React, { useState, useRef } from 'react';
import { usePos } from '../context/PosContext';
import { Store, DollarSign, FileText, Users, Save, Trash2, Plus, Shield, Database, Download, Upload, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Role, TeamMember } from '../types';

export const Settings: React.FC = () => {
  const { state, dispatch } = usePos();
  const { settings, teamMembers } = state;

  const [activeTab, setActiveTab] = useState<'GENERAL' | 'FINANCE' | 'INVOICE' | 'TEAM' | 'DATA'>('GENERAL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local State for Forms (auto-fill from context)
  const [storeName, setStoreName] = useState(settings.storeName);
  const [branchName, setBranchName] = useState(settings.branchName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [currency, setCurrency] = useState(settings.currencySymbol);

  const [vatRate, setVatRate] = useState(settings.vatRate.toString());
  const [vatEnabled, setVatEnabled] = useState(settings.vatEnabled);
  const [scRate, setScRate] = useState(settings.serviceChargeRate.toString());
  const [scEnabled, setScEnabled] = useState(settings.serviceChargeEnabled);

  const [invoiceHeader, setInvoiceHeader] = useState(settings.invoiceHeader);
  const [invoiceFooter, setInvoiceFooter] = useState(settings.invoiceFooter);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix || 'INV-');
  const [invoiceStartingNumber, setInvoiceStartingNumber] = useState(settings.invoiceStartingNumber?.toString() || '1001');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');

  // Team Management State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [tmName, setTmName] = useState('');
  const [tmRole, setTmRole] = useState<Role>(Role.CASHIER);
  const [tmPin, setTmPin] = useState('');

  const handleSaveSettings = () => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        storeName,
        branchName,
        address,
        phone,
        email,
        currencySymbol: currency,
        vatRate: parseFloat(vatRate) || 0,
        vatEnabled,
        serviceChargeRate: parseFloat(scRate) || 0,
        serviceChargeEnabled: scEnabled,
        invoiceHeader,
        invoiceFooter,
        invoicePrefix,
        invoiceStartingNumber: parseInt(invoiceStartingNumber) || 1001,
        logoUrl
      }
    });
    alert('Settings saved successfully!');
  };

  const handleAddTeamMember = () => {
      const newMember: TeamMember = {
          id: editingMember ? editingMember.id : `USR-${Date.now()}`,
          name: tmName,
          role: tmRole,
          pin: tmPin
      };

      if (editingMember) {
          dispatch({ type: 'UPDATE_TEAM_MEMBER', payload: newMember });
      } else {
          dispatch({ type: 'ADD_TEAM_MEMBER', payload: newMember });
      }
      closeTeamModal();
  };

  const handleDeleteTeamMember = (id: string) => {
      if (window.confirm('Are you sure you want to remove this user?')) {
          dispatch({ type: 'DELETE_TEAM_MEMBER', payload: id });
      }
  };

  const openTeamModal = (member?: TeamMember) => {
      if (member) {
          setEditingMember(member);
          setTmName(member.name);
          setTmRole(member.role);
          setTmPin(member.pin || '');
      } else {
          setEditingMember(null);
          setTmName('');
          setTmRole(Role.CASHIER);
          setTmPin('');
      }
      setIsTeamModalOpen(true);
  };

  const closeTeamModal = () => {
      setIsTeamModalOpen(false);
      setEditingMember(null);
  };

  // Backup & Restore Functions
  const handleBackup = () => {
      const backupData = {
          version: "1.0",
          timestamp: new Date().toISOString(),
          data: {
              menu: state.menu,
              inventory: state.inventory,
              tables: state.tables,
              orders: state.orders,
              settings: state.settings,
              teamMembers: state.teamMembers
          }
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `bhoj_pos_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              
              if (!json.data || !json.data.menu || !json.data.settings) {
                  throw new Error("Invalid backup file format.");
              }

              if (window.confirm("Are you sure you want to restore this backup? Current data will be overwritten.")) {
                  dispatch({ type: 'RESTORE_DATA', payload: json.data });
                  alert("Data restored successfully!");
              }
          } catch (err) {
              alert("Failed to restore data: " + err);
          } finally {
              if (fileInputRef.current) fileInputRef.current.value = "";
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="flex h-full bg-gray-100 dark:bg-gray-900 transition-colors overflow-hidden">
      {/* Sidebar Navigation for Settings */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
          <div className="p-6 border-b dark:border-gray-700">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Master Configuration</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
              <button 
                onClick={() => setActiveTab('GENERAL')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'GENERAL' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'}`}
              >
                  <Store size={18} /> General & Branch
              </button>
              <button 
                onClick={() => setActiveTab('FINANCE')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'FINANCE' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'}`}
              >
                  <DollarSign size={18} /> Invoice & VAT
              </button>
              <button 
                onClick={() => setActiveTab('INVOICE')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'INVOICE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'}`}
              >
                  <FileText size={18} /> Receipt Config
              </button>
              <button 
                onClick={() => setActiveTab('TEAM')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'TEAM' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'}`}
              >
                  <Users size={18} /> Users & Roles
              </button>
              <button 
                onClick={() => setActiveTab('DATA')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'DATA' ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'}`}
              >
                  <Database size={18} /> Data & Backup
              </button>
          </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
          
          {/* General Tab */}
          {activeTab === 'GENERAL' && (
              <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Store Information</h2>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store Name</label>
                              <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch Name/ID</label>
                              <input type="text" value={branchName} onChange={e => setBranchName(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                          <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" rows={3} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency Symbol</label>
                          <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="৳, $, €" />
                      </div>
                  </div>
              </div>
          )}

          {/* Finance Tab */}
          {activeTab === 'FINANCE' && (
              <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Tax & Service Charges</h2>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
                          <div>
                              <h3 className="font-bold text-gray-800 dark:text-white">VAT / Tax</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Applied to subtotal</p>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                  <input type="number" value={vatRate} onChange={e => setVatRate(e.target.value)} className="w-16 p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white text-right" />
                                  <span className="text-gray-500">%</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={vatEnabled} onChange={e => setVatEnabled(e.target.checked)} className="sr-only peer" />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                              </label>
                          </div>
                      </div>

                      <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
                          <div>
                              <h3 className="font-bold text-gray-800 dark:text-white">Service Charge</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Applied to dine-in orders only</p>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                  <input type="number" value={scRate} onChange={e => setScRate(e.target.value)} className="w-16 p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white text-right" />
                                  <span className="text-gray-500">%</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={scEnabled} onChange={e => setScEnabled(e.target.checked)} className="sr-only peer" />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                              </label>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* Invoice Tab */}
          {activeTab === 'INVOICE' && (
              <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Receipt Customization</h2>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Number Prefix</label>
                            <input type="text" value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="INV-" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Invoice Number</label>
                            <input type="number" value={invoiceStartingNumber} onChange={e => setInvoiceStartingNumber(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="1001" />
                            <p className="text-[10px] text-gray-400 mt-1">Auto-increments for each new order</p>
                        </div>
                      </div>

                      {/* LOGO URL INPUT */}
                      <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt Logo URL</label>
                           <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={logoUrl} 
                                    onChange={e => setLogoUrl(e.target.value)} 
                                    className="flex-1 p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" 
                                    placeholder="https://example.com/logo.png" 
                                />
                                <button 
                                    onClick={() => setLogoUrl('https://cdn-icons-png.flaticon.com/512/3170/3170733.png')}
                                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600"
                                    title="Use Placeholder"
                                >
                                    <ImageIcon size={18} />
                                </button>
                           </div>
                           <p className="text-xs text-gray-400 mt-1">Provide a direct link to an image. It will appear on the left side of the receipt header.</p>
                           {logoUrl && (
                               <div className="mt-2 p-2 border border-dashed border-gray-300 rounded w-fit">
                                   <img src={logoUrl} alt="Logo Preview" className="h-12 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                               </div>
                           )}
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt Header (Title)</label>
                          <input type="text" value={invoiceHeader} onChange={e => setInvoiceHeader(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="EASYPOS RECEIPT" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Footer Message</label>
                          <textarea value={invoiceFooter} onChange={e => setInvoiceFooter(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" rows={3} placeholder="Thank you come again!" />
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-dashed border-gray-300 dark:border-gray-600 text-center">
                          <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">PREVIEW</p>
                          <div className="inline-block bg-white text-black p-4 shadow text-left font-mono text-xs w-64">
                              <div className="flex items-center gap-2 mb-2">
                                  {logoUrl && <img src={logoUrl} className="h-8 w-8 object-contain" alt="logo" />}
                                  <div className="flex-1 text-center font-bold">{invoiceHeader}</div>
                              </div>
                              <div className="text-center mb-2">{storeName}</div>
                              <div className="text-center mb-4">{address}</div>
                              <div className="border-b border-dashed border-black mb-2"></div>
                              <div className="flex justify-between"><span>Order:</span><span>{invoicePrefix}{invoiceStartingNumber}</span></div>
                              <div className="border-b border-dashed border-black mb-2"></div>
                              <div className="flex justify-between"><span>Item A</span><span>100.00</span></div>
                              <div className="flex justify-between"><span>Item B</span><span>50.00</span></div>
                              <div className="border-b border-dashed border-black my-2"></div>
                              <div className="flex justify-between font-bold"><span>Total</span><span>150.00</span></div>
                              <div className="border-b border-dashed border-black my-2"></div>
                              <div className="text-center mt-4">{invoiceFooter}</div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* Team Tab */}
          {activeTab === 'TEAM' && (
              <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white">User Management</h2>
                      <button onClick={() => openTeamModal()} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-700 transition-colors">
                          <Plus size={18} /> Add User
                      </button>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-left">
                          <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                              <tr>
                                  <th className="p-4 font-medium">Name</th>
                                  <th className="p-4 font-medium">Role</th>
                                  <th className="p-4 font-medium">PIN/Access</th>
                                  <th className="p-4 font-medium text-right">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-gray-700">
                              {teamMembers.length === 0 ? (
                                  <tr><td colSpan={4} className="p-8 text-center text-gray-400">No team members added yet.</td></tr>
                              ) : (
                                  teamMembers.map(member => (
                                      <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                          <td className="p-4 font-medium text-gray-800 dark:text-white">{member.name}</td>
                                          <td className="p-4">
                                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                  member.role === Role.ADMIN ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                  member.role === Role.MANAGER ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                                  member.role === Role.KITCHEN ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                              }`}>
                                                  {member.role}
                                              </span>
                                          </td>
                                          <td className="p-4 text-gray-500 dark:text-gray-400 font-mono">****</td>
                                          <td className="p-4 text-right">
                                              <button onClick={() => openTeamModal(member)} className="text-blue-600 hover:underline mr-3">Edit</button>
                                              <button onClick={() => handleDeleteTeamMember(member.id)} className="text-red-600 hover:underline">Delete</button>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* Data & Backup Tab */}
          {activeTab === 'DATA' && (
              <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Data Management</h2>
                  
                  <div className="grid gap-6">
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                          <h3 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2"><Download size={20} className="text-blue-500"/> Backup Data</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Export all restaurant data (Menu, Orders, Inventory, Users, Settings) as a JSON file. Keep this file safe.</p>
                          <button 
                            onClick={handleBackup}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"
                          >
                              <Download size={16} /> Download Backup
                          </button>
                      </div>

                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                          <h3 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2"><Upload size={20} className="text-green-500"/> Restore Data</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Restore a previously exported JSON backup file. <strong className="text-red-500">Warning: This will overwrite all current data.</strong></p>
                          <div className="flex items-center gap-3">
                              <input 
                                type="file" 
                                accept=".json" 
                                ref={fileInputRef}
                                onChange={handleRestore}
                                className="hidden"
                              />
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-green-700 transition-colors"
                              >
                                  <Upload size={16} /> Upload Backup File
                              </button>
                          </div>
                      </div>

                      <div className="bg-red-50 dark:bg-red-900/10 rounded-xl shadow-sm p-6 border border-red-200 dark:border-red-900/30">
                          <h3 className="font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2"><RefreshCw size={20}/> System Reset</h3>
                          <p className="text-sm text-red-600 dark:text-red-300 mb-4">This will clear all orders, inventory, and menu items. Store settings and users will be preserved. Use with caution.</p>
                          <button 
                            onClick={() => {
                                if(window.confirm("Are you sure? This will delete ALL Orders, Menu Items, Tables and Inventory.")) {
                                    dispatch({ type: 'RESTORE_DATA', payload: { orders: [], menu: [], tables: [], inventory: [] } });
                                    alert("System reset complete.");
                                }
                            }}
                            className="bg-white dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                              <RefreshCw size={16} /> Clear Business Data
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* Global Save Button (except for Team/Data tab which has its own modal logic) */}
          {activeTab !== 'TEAM' && activeTab !== 'DATA' && (
              <div className="max-w-2xl mx-auto mt-6 flex justify-end">
                  <button onClick={handleSaveSettings} className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-700 shadow-lg shadow-orange-200 dark:shadow-none transition-all transform hover:scale-105">
                      <Save size={20} /> Save Configuration
                  </button>
              </div>
          )}

          {/* Team Member Modal */}
          {isTeamModalOpen && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border dark:border-gray-700 animate-in zoom-in duration-200">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{editingMember ? 'Edit User' : 'Add New User'}</h3>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                              <input type="text" value={tmName} onChange={e => setTmName(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500" placeholder="John Doe" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                              <select value={tmRole} onChange={e => setTmRole(e.target.value as Role)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500">
                                  {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access PIN (4-6 digits)</label>
                              <input type="password" value={tmPin} onChange={e => setTmPin(e.target.value)} className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-500" placeholder="1234" />
                          </div>
                          <div className="flex gap-3 pt-2">
                              <button onClick={closeTeamModal} className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold">Cancel</button>
                              <button onClick={handleAddTeamMember} className="flex-1 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700">Save User</button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};