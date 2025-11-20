import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { TeamMember, Role } from '../types';
import { User, Lock, ChevronRight, ShieldCheck, UserPlus, AlertTriangle } from 'lucide-react';

export const LockScreen: React.FC = () => {
  const { state, dispatch } = usePos();
  const { teamMembers } = state;
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleLogin = () => {
    if (!selectedMember) return;
    
    if (selectedMember.pin === pin) {
      dispatch({ type: 'LOGIN_STAFF', payload: selectedMember });
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  const handleInitializeAdmin = () => {
      const defaultAdmin: TeamMember = {
          id: 'ADMIN-001',
          name: 'Admin',
          role: Role.ADMIN,
          pin: '1234'
      };
      dispatch({ type: 'ADD_TEAM_MEMBER', payload: defaultAdmin });
      // Automatically select the new admin to speed up login
      setTimeout(() => setSelectedMember(defaultAdmin), 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[600px] flex overflow-hidden border border-gray-700">
        
        {/* Left Side: User Selection */}
        <div className="w-1/2 bg-slate-800 p-8 flex flex-col border-r border-gray-700">
          <div className="mb-8">
             <h1 className="text-3xl font-bold text-white flex items-center gap-3">
               <div className="bg-orange-500 p-2 rounded-lg"><Lock size={24} /></div>
               Bhoj POS
             </h1>
             <p className="text-slate-400 mt-2">Select your profile to login</p>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
             {teamMembers.length === 0 ? (
                 <div className="text-center text-gray-400 mt-10 flex flex-col items-center gap-4 p-6 bg-slate-700/50 rounded-xl border border-slate-600 border-dashed">
                     <div className="opacity-70 bg-slate-600 p-3 rounded-full"><ShieldCheck size={32} /></div>
                     <div>
                        <h3 className="text-white font-bold text-lg">System Not Initialized</h3>
                        <p className="text-sm">No users found in the database.</p>
                     </div>
                     <button 
                        onClick={handleInitializeAdmin}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm shadow-lg w-full justify-center"
                     >
                         <UserPlus size={16} /> Create Default Admin
                     </button>
                     <div className="text-xs text-slate-400 bg-slate-800 p-2 rounded w-full">
                        <p><strong>Default Creds:</strong></p>
                        <p>PIN: <span className="font-mono text-white">1234</span></p>
                     </div>
                 </div>
             ) : (
                 teamMembers.map(member => (
                   <button
                     key={member.id}
                     onClick={() => { setSelectedMember(member); setPin(''); setError(''); }}
                     className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                       selectedMember?.id === member.id 
                       ? 'bg-orange-600 text-white shadow-lg scale-[1.02]' 
                       : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                     }`}
                   >
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            selectedMember?.id === member.id ? 'bg-white text-orange-600' : 'bg-slate-600 text-slate-300'
                        }`}>
                            {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                            <p className="font-bold">{member.name}</p>
                            <p className="text-xs opacity-70 uppercase tracking-wider">{member.role}</p>
                        </div>
                     </div>
                     {selectedMember?.id === member.id && <ChevronRight />}
                   </button>
                 ))
             )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-700 text-center text-slate-500 text-xs">
             <p>Protected System • Authorized Access Only</p>
          </div>
        </div>

        {/* Right Side: PIN Pad */}
        <div className="w-1/2 bg-slate-900 p-8 flex flex-col items-center justify-center">
            {selectedMember ? (
                <div className="w-full max-w-xs animate-in fade-in slide-in-from-right-8">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-slate-700 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white">
                            {selectedMember.name.charAt(0)}
                        </div>
                        <h2 className="text-2xl font-bold text-white">Hello, {selectedMember.name}</h2>
                        <p className="text-slate-400">Enter your PIN to continue</p>
                    </div>

                    {/* PIN Dots */}
                    <div className="flex justify-center gap-4 mb-8 h-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className={`w-4 h-4 rounded-full transition-all ${
                                i < pin.length ? 'bg-orange-500 scale-110' : 'bg-slate-700'
                            }`} />
                        ))}
                    </div>
                    
                    {error && <p className="text-red-500 text-center mb-4 text-sm font-bold animate-pulse bg-red-900/20 py-1 px-3 rounded-full inline-block mx-auto">{error}</p>}

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num.toString())}
                                className="h-16 rounded-xl bg-slate-800 text-white text-xl font-bold hover:bg-slate-700 transition-colors shadow-sm border border-slate-800 hover:border-slate-600"
                            >
                                {num}
                            </button>
                        ))}
                        <button onClick={() => setPin('')} className="h-16 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">Clear</button>
                        <button onClick={() => handleNumberClick('0')} className="h-16 rounded-xl bg-slate-800 text-white text-xl font-bold hover:bg-slate-700 transition-colors shadow-sm border border-slate-800 hover:border-slate-600">0</button>
                        <button onClick={handleBackspace} className="h-16 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">⌫</button>
                    </div>
                    
                    <button 
                        onClick={handleLogin}
                        className="w-full mt-8 py-4 bg-orange-600 text-white rounded-xl font-bold text-lg hover:bg-orange-700 transition-colors shadow-lg shadow-orange-900/20"
                    >
                        Unlock POS
                    </button>
                </div>
            ) : (
                <div className="text-center text-slate-500">
                    <div className="mb-6 opacity-20"><Lock size={80} className="mx-auto" /></div>
                    <h2 className="text-2xl font-bold text-slate-400 mb-2">Locked</h2>
                    <p className="text-lg">Select a user from the left to login</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};