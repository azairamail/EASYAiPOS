import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { getBusinessInsights } from '../services/gemini';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Sparkles, TrendingUp, BarChart3, PieChart } from 'lucide-react';

export const Reports: React.FC = () => {
  const { state } = usePos();
  const [insights, setInsights] = useState<string>("");
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Aggregate Hourly Sales Data
  const salesData = useMemo(() => {
    if (state.orders.length === 0) return [];

    // Initialize 24 hours
    const data = Array.from({ length: 24 }, (_, i) => ({
        name: i === 0 ? '12am' : i === 12 ? '12pm' : i > 12 ? `${i-12}pm` : `${i}am`,
        hour: i,
        sales: 0
    }));

    state.orders.forEach(order => {
        if (order.status !== 'CANCELLED' && order.timestamp) {
            const date = new Date(order.timestamp);
            // Check for valid date
            if (!isNaN(date.getTime())) {
                const hour = date.getHours();
                // Safety check to ensure hour is within bounds (0-23)
                if (data[hour]) {
                    data[hour].sales += order.totalAmount;
                }
            }
        }
    });

    // Return hours 9am to 11pm for cleaner chart unless there's data elsewhere
    return data.filter(d => d.sales > 0 || (d.hour >= 9 && d.hour <= 23));
  }, [state.orders]);

  // Aggregate Top Selling Items
  const categoryData = useMemo(() => {
    const itemCounts: Record<string, number> = {};
    
    state.orders.forEach(order => {
        if (order.status !== 'CANCELLED') {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        }
    });

    return Object.entries(itemCounts)
        .map(([name, orders]) => ({ name, orders }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 7); // Top 7 items
  }, [state.orders]);

  const totalSales = state.orders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((a, b) => a + b.totalAmount, 0);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    const result = await getBusinessInsights(state.orders, state.inventory);
    setInsights(result);
    setLoadingInsights(false);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Business Intelligence</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Stat Cards */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-blue-500 transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">৳{totalSales.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-green-500 transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{state.orders.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-orange-500 transition-colors">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Inventory Alerts</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{state.inventory.filter(i => i.quantity < i.threshold).length}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-80 transition-colors">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><TrendingUp size={18}/> Hourly Sales Trend</h3>
                {salesData.length > 0 && salesData.some(d => d.sales > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff', borderRadius: '8px' }} 
                                formatter={(value: number) => [`৳${value}`, 'Sales']}
                            />
                            <Line type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={3} dot={{r: 4}} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales data available</div>
                )}
             </div>

             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-80 transition-colors">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><BarChart3 size={18}/> Top Selling Items</h3>
                {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" opacity={0.2} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#9ca3af'}} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff', borderRadius: '8px' }} />
                            <Bar dataKey="orders" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">No order data available</div>
                )}
             </div>
        </div>

        {/* AI Section */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Sparkles size={120} />
             </div>
             
             <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-4">
                     <div className="bg-indigo-500 p-2 rounded-lg"><Sparkles size={24} className="text-white" /></div>
                     <h2 className="text-2xl font-bold">Gemini AI Business Analyst</h2>
                 </div>
                 
                 <p className="text-slate-300 mb-6 max-w-2xl">
                     Get real-time insights on your restaurant's performance. Our AI analyzes your sales patterns, inventory levels, and customer preferences to suggest improvements.
                 </p>

                 {insights ? (
                     <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 animate-in fade-in slide-in-from-bottom-4">
                         <h4 className="font-bold text-indigo-300 mb-2 uppercase text-xs tracking-wider">Analysis Report</h4>
                         <div className="prose prose-invert">
                             <p className="whitespace-pre-line leading-relaxed">{insights}</p>
                         </div>
                         <button 
                            onClick={() => setInsights("")} 
                            className="mt-4 text-sm text-slate-400 hover:text-white underline"
                         >
                            Clear Analysis
                         </button>
                     </div>
                 ) : (
                     <button 
                        onClick={fetchInsights}
                        disabled={loadingInsights || state.orders.length === 0}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        {loadingInsights ? (
                            <>Analyzing Data...</>
                        ) : (
                            <>Generate Insights <TrendingUp size={18} /></>
                        )}
                     </button>
                 )}
             </div>
        </div>
    </div>
  );
};