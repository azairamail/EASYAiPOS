import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChefHat, LogIn, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { signInWithGoogle, loginEmail, signupEmail, user } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await signupEmail(email, password);
      } else {
        await loginEmail(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setError(`Domain Not Authorized. Please add "${window.location.hostname}" to Firebase Console > Authentication > Settings > Authorized Domains.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled by user.');
      } else {
        setError('Failed to sign in with Google. ' + (err.message || ''));
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
       <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl flex overflow-hidden min-h-[600px] transition-colors">
           {/* Left Side - Branding */}
           <div className="hidden md:flex w-1/2 bg-gradient-to-br from-orange-500 to-red-600 p-12 flex-col justify-between text-white relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full opacity-10">
                   <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,71.2,32.6C60.2,43.7,49.5,53,37.9,61.1C26.3,69.2,13.8,76.1,0.5,75.3C-12.8,74.4,-26.6,65.8,-39.4,57.3C-52.2,48.8,-64,40.4,-72.2,28.9C-80.4,17.4,-85,2.8,-81.8,-10.3C-78.6,-23.4,-67.6,-35,-56.1,-43.4C-44.6,-51.8,-32.6,-57,-20.8,-65.7C-9,-74.4,2.6,-86.6,14.8,-87.2C27,-87.8,30.5,-95,44.7,-76.4Z" transform="translate(100 100)" />
                   </svg>
               </div>
               
               <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-orange-600">
                          <ChefHat size={32} />
                      </div>
                      <h1 className="text-3xl font-bold">Bhoj POS</h1>
                  </div>
                  <p className="text-lg text-orange-100 font-light">
                      The smartest way to manage your restaurant. Orders, Inventory, KDS, and AI Insights all in one place.
                  </p>
               </div>
               
               <div className="relative z-10">
                   <p className="text-sm text-orange-200">© 2025 Bhoj Systems. All rights reserved.</p>
               </div>
           </div>

           {/* Right Side - Form */}
           <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-white dark:bg-gray-800">
               <div className="max-w-sm mx-auto w-full">
                   <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
                   <p className="text-gray-500 dark:text-gray-400 mb-8">{isSignup ? 'Start your restaurant journey today' : 'Sign in to access your dashboard'}</p>

                   {error && (
                       <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 p-3 rounded-lg mb-6 flex items-start gap-2 text-sm break-words">
                           <AlertCircle size={16} className="mt-0.5 shrink-0" />
                           <span>{error}</span>
                       </div>
                   )}

                   <form onSubmit={handleSubmit} className="space-y-4">
                       <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                           <div className="relative">
                               <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                               <input 
                                  type="email" 
                                  required 
                                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all bg-white dark:bg-gray-700 dark:text-white"
                                  placeholder="you@restaurant.com"
                                  value={email}
                                  onChange={e => setEmail(e.target.value)}
                               />
                           </div>
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                           <div className="relative">
                               <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                               <input 
                                  type="password" 
                                  required 
                                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all bg-white dark:bg-gray-700 dark:text-white"
                                  placeholder="••••••••"
                                  value={password}
                                  onChange={e => setPassword(e.target.value)}
                               />
                           </div>
                       </div>
                       
                       <button 
                           type="submit"
                           disabled={loading}
                           className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                       >
                           {loading ? 'Processing...' : (isSignup ? 'Sign Up' : 'Sign In')} 
                           {!loading && <ArrowRight size={18} />}
                       </button>
                   </form>

                   <div className="my-6 flex items-center gap-4">
                       <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                       <span className="text-xs text-gray-400 font-medium uppercase">Or continue with</span>
                       <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                   </div>

                   <button 
                       onClick={handleGoogleLogin}
                       type="button"
                       className="w-full py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                   >
                       <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                       Google
                   </button>

                   <div className="mt-8 text-center">
                       <p className="text-sm text-gray-500 dark:text-gray-400">
                           {isSignup ? "Already have an account?" : "Don't have an account?"} {' '}
                           <button 
                               onClick={() => setIsSignup(!isSignup)}
                               className="text-orange-600 dark:text-orange-400 font-bold hover:underline"
                           >
                               {isSignup ? 'Sign In' : 'Sign Up'}
                           </button>
                       </p>
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
};