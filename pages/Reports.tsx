import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { getBusinessInsights } from '../services/gemini';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { Sparkles, TrendingUp, BarChart3, PieChart as PieChartIcon, Download, Wallet, ShoppingBag, Activity, Calendar } from 'lucide-react';

// Modern Color Palette for Charts
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#eab308', '#6366f1'];

export const Reports: React.FC = () => {
  const { state } = usePos();
  const [insights, setInsights] = useState<string>("");
  const [loadingInsights, setLoadingInsights] = useState(false);

  // --- DATA AGGREGATION HOOKS ---

  // 1. Hourly Sales Trend (Area Chart)
  const hourlyData = useMemo(() => {
    if (state.orders.length === 0) return [];
    const data = Array.from({ length: 24 }, (_, i) => ({
        name: i === 0 ? '12am' : i === 12 ? '12pm' : i > 12 ? `${i-12}pm` : `${i}am`,
        hour: i,
        sales: 0,
        orders: 0
    }));

    state.orders.forEach(order => {
        if (order.status !== 'CANCELLED' && order.timestamp) {
            const date = new Date(order.timestamp);
            if (!isNaN(date.getTime())) {
                const hour = date.getHours();
                if (data[hour]) {
                    data[hour].sales += order.totalAmount;
                    data[hour].orders += 1;
                }
            }
        }
    });
    // Filter to show business hours (e.g., 9am to 11pm) or hours with activity
    return data.filter(d => d.sales > 0 || (d.hour >= 8 && d.hour <= 23));
  }, [state.orders]);

  // 2. Top Selling Items (Bar Chart)
  const itemPerformanceData = useMemo(() => {
    const stats: Record<string, { quantity: number; revenue: number }> = {};
    
    state.orders.forEach(order => {
        if (order.status !== 'CANCELLED') {
            order.items.forEach(item => {
                if (!stats[item.name]) stats[item.name] = { quantity: 0, revenue: 0 };
                stats[item.name].quantity += item.quantity;
                stats[item.name].revenue += (item.price * item.quantity);
            });
        }
    });

    return Object.entries(stats)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue) // Sort by revenue
        .slice(0, 8);
  }, [state.orders]);

  // 3. Payment Method Distribution (Pie Chart)
  const paymentData = useMemo(() => {
      const stats: Record<string, number> = {};
      state.orders.forEach(order => {
          if (order.status !== 'CANCELLED' && order.paymentMethod) {
              stats[order.paymentMethod] = (stats[order.paymentMethod] || 0) + order.totalAmount;
          }
      });
      return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [state.orders]);

  // 4. Order Type Breakdown (Donut Chart)
  const orderTypeData = useMemo(() => {
      const stats: Record<string, number> = {};
      state.orders.forEach(order => {
          if (order.status !== 'CANCELLED') {
              stats[order.type] = (stats[order.type] || 0) + 1;
          }
      });
      return Object.entries(stats).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [state.orders]);

  // 5. Category Performance (Radar/Bar)
  const categoryData = useMemo(() => {
      const stats: Record<string, number> = {};
      state.orders.forEach(order => {
          if (order.status !== 'CANCELLED') {
              order.items.forEach(item => {
                 stats[item.category] = (stats[item.category] || 0) + (item.price * item.quantity);
              });
          }
      });
      return Object.entries(stats)
        .map(([subject, A]) => ({ subject, A, fullMark: Math.max(...Object.values(stats)) }))
        .sort((a, b) => b.A - a.A);
  }, [state.orders]);


  // --- KEY METRICS ---
  const validOrders = state.orders.filter(o => o.status !== 'CANCELLED');
  const totalSales = validOrders.reduce((a, b) => a + b.totalAmount, 0);
  const totalOrders = validOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  // Simulated Gross Profit (assuming 40% cost of goods)
  const estGrossProfit = totalSales * 0.6; 

  const fetchInsights = async () => {
    setLoadingInsights(true);
    const result = await getBusinessInsights(state.orders, state.inventory);
    setInsights(result);
    setLoadingInsights(false);
  };

  const handleExport = () => {
      const csvContent = "data:text/csv;charset=utf-8," 
          + "Date,Order ID,Type,Total,Payment\n"
          + state.orders.map(o => `${new Date(o.timestamp).toLocaleDateString()},${o.invoiceNumber || o.id},${o.type},${o.totalAmount},${o.paymentMethod || 'Unpaid'}`).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "sales_report.csv");
      document.body.appendChild(link);
      link.click();
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Activity className="text-orange-600" /> Advanced Analytics
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Real-time dashboard & AI insights</p>
            </div>
            <div className="flex gap-3">
                <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <Calendar size={16} /> Today
                </button>
                <button onClick={handleExport} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold shadow-md flex items-center gap-2 hover:bg-orange-700">
                    <Download size={16} /> Export CSV
                </button>
            </div>
        </div>

        {/* 1. KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-b-4 border-blue-500 hover:transform hover:scale-[1.02] transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase">Total Revenue</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">৳{totalSales.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <Wallet size={24} />
                    </div>
                </div>
                <p className="text-xs text-green-500 font-bold flex items-center gap-1"><TrendingUp size={12}/> +12% vs yesterday</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-b-4 border-purple-500 hover:transform hover:scale-[1.02] transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase">Total Orders</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{totalOrders}</h3>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                        <ShoppingBag size={24} />
                    </div>
                </div>
                <p className="text-xs text-gray-400">Avg Order Value: <strong>৳{avgOrderValue.toFixed(0)}</strong></p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-b-4 border-green-500 hover:transform hover:scale-[1.02] transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase">Est. Gross Profit</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">৳{estGrossProfit.toLocaleString()}</h3>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                        <TrendingUp size={24} />
                    </div>
                </div>
                <p className="text-xs text-gray-400">~60% Margin Calculated</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-b-4 border-orange-500 hover:transform hover:scale-[1.02] transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase">Low Stock Items</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{state.inventory.filter(i => i.quantity < i.threshold).length}</h3>
                    </div>
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                        <Activity size={24} />
                    </div>
                </div>
                <p className="text-xs text-red-500 font-bold">Requires Attention</p>
            </div>
        </div>

        {/* 2. Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
             {/* Sales Trend (Area Chart) - Takes up 2 cols */}
             <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-96 transition-colors border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><TrendingUp size={18}/> Hourly Sales Volume</h3>
                </div>
                {hourlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff', borderRadius: '8px' }} 
                                formatter={(value: number) => [`৳${value}`, 'Sales']}
                            />
                            <Area type="monotone" dataKey="sales" stroke="#f97316" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                )}
             </div>

             {/* Order Types (Donut Chart) */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-96 transition-colors border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><PieChartIcon size={18}/> Order Channels</h3>
                {orderTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="85%">
                        <PieChart>
                            <Pie
                                data={orderTypeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {orderTypeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderRadius: '8px', border: 'none', color: '#fff' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                )}
             </div>
        </div>

        {/* 3. Secondary Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
             {/* Top Items (Horizontal Bar) */}
             <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-80 transition-colors border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><BarChart3 size={18}/> Top Revenue Items</h3>
                {itemPerformanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={itemPerformanceData} layout="vertical" margin={{ left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" opacity={0.1} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={90} tick={{fontSize: 10, fill: '#9ca3af'}} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff', borderRadius: '8px' }}
                                formatter={(value: number) => [`৳${value}`, 'Revenue']} 
                            />
                            <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={15} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                )}
             </div>

             {/* Payment Methods (Pie) */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-80 transition-colors border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><Wallet size={18}/> Payment Methods</h3>
                {paymentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={paymentData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {paymentData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index + 2 % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderRadius: '8px', border: 'none', color: '#fff' }} formatter={(value:number) => `৳${value}`} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No payment data</div>
                )}
             </div>

             {/* Category Performance (Radar) */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-80 transition-colors border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2"><Activity size={18}/> Category Performance</h3>
                {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryData}>
                            <PolarGrid opacity={0.2} />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                            <Radar name="Revenue" dataKey="A" stroke="#ec4899" strokeWidth={2} fill="#ec4899" fillOpacity={0.5} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderRadius: '8px', border: 'none', color: '#fff' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">No category data</div>
                )}
             </div>
        </div>

        {/* 4. AI Section */}
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