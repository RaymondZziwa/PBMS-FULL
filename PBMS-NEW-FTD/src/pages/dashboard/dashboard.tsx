import React, { useState, useEffect } from 'react';
import { 
  FaArrowUp, FaArrowDown, FaShoppingCart, FaDollarSign, 
  FaUsers, FaChartLine, FaFire, FaBell, FaBox 
} from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// Mock data functions
const generateSalesData = () => {
  return [
    { name: 'North', sales: Math.floor(Math.random() * 10000) + 5000 },
    { name: 'South', sales: Math.floor(Math.random() * 10000) + 5000 },
    { name: 'East', sales: Math.floor(Math.random() * 10000) + 5000 },
    { name: 'West', sales: Math.floor(Math.random() * 10000) + 5000 },
    { name: 'Central', sales: Math.floor(Math.random() * 10000) + 5000 },
  ];
};

const generatePerformanceData = () => {
  return [
    { name: 'Wireless Earbuds', sales: Math.floor(Math.random() * 500) + 100 },
    { name: 'Smart Watch', sales: Math.floor(Math.random() * 500) + 100 },
    { name: 'Laptop Sleeve', sales: Math.floor(Math.random() * 500) + 100 },
    { name: 'Phone Case', sales: Math.floor(Math.random() * 500) + 100 },
    { name: 'USB-C Cable', sales: Math.floor(Math.random() * 500) + 100 },
  ].sort((a, b) => b.sales - a.sales);
};

const generateRevenueData = () => {
  return [
    { day: 'Mon', revenue: Math.floor(Math.random() * 5000) + 3000 },
    { day: 'Tue', revenue: Math.floor(Math.random() * 5000) + 3000 },
    { day: 'Wed', revenue: Math.floor(Math.random() * 5000) + 3000 },
    { day: 'Thu', revenue: Math.floor(Math.random() * 5000) + 3000 },
    { day: 'Fri', revenue: Math.floor(Math.random() * 5000) + 3000 },
    { day: 'Sat', revenue: Math.floor(Math.random() * 5000) + 3000 },
    { day: 'Sun', revenue: Math.floor(Math.random() * 5000) + 3000 },
  ];
};

const generateActivityFeed = () => {
  const activities = [
    'New order #1234 placed',
    'User John Doe registered',
    'Product "Wireless Earbuds" low stock',
    'Payment of $234.50 processed',
    'Sales target achieved for North Point',
    'New customer review received',
  ];
  return activities[Math.floor(Math.random() * activities.length)];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Metric card component
const MetricCard = ({ title, value, change, icon, isPositive }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">UGX {value.toLocaleString()}</p>
          <div className={`flex items-center mt-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
            <span className="text-sm">{change}% from last week</span>
          </div>
        </div>
        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
};

const SalesDashboard = () => {
  const [salesData, setSalesData] = useState(generateSalesData());
  const [performanceData, setPerformanceData] = useState(generatePerformanceData());
  const [revenueData, setRevenueData] = useState(generateRevenueData());
  const [activities, setActivities] = useState([
    generateActivityFeed(),
    generateActivityFeed(),
    generateActivityFeed(),
    generateActivityFeed(),
    generateActivityFeed()
  ]);

  useEffect(() => {
    // Simulate live data updates
    const interval = setInterval(() => {
      setSalesData(generateSalesData());
      setPerformanceData(generatePerformanceData());
      setRevenueData(generateRevenueData());
      const newActivity = generateActivityFeed();
      setActivities(prev => [newActivity, ...prev.slice(0, 4)]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Sales Dashboard</h1>
        <p className="text-gray-600">Real-time performance metrics and analytics</p>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Total Revenue" 
          value={125430} 
          change={12.5} 
          icon={<FaDollarSign className="text-xl" />} 
          isPositive={true} 
        />
        <MetricCard 
          title="Orders" 
          value={1243} 
          change={-2.3} 
          icon={<FaShoppingCart className="text-xl" />} 
          isPositive={false} 
        />
        <MetricCard 
          title="Customers" 
          value={3421} 
          change={5.7} 
          icon={<FaUsers className="text-xl" />} 
          isPositive={true} 
        />
        <MetricCard 
          title="Conversion Rate" 
          value={4.3} 
          change={1.2} 
          icon={<FaChartLine className="text-xl" />} 
          isPositive={true} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales by Point Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Sales by Point of Sale</h2>
            <select className="border rounded-md px-3 py-2 text-sm">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last Quarter</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`UGX ${value}`, 'Sales']} />
              <Legend />
              <Bar dataKey="sales" fill="#3B82F6" name="Sales (UGX)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performing Items */}
        <div className="bg-white rounded-xl p-6 shadow-md">
  <h2 className="text-xl font-semibold text-gray-800 mb-6">Top Performing Items</h2>
  <div className="space-y-3">
    {performanceData.map((item, index) => {
      const percentage = Math.round((item.sales / performanceData.reduce((sum, curr) => sum + curr.sales, 0)) * 100);
      return (
        <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="flex items-center">
            <div className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mr-3 text-xs font-bold">
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-500">{item.sales} units sold</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-700">{percentage}%</p>
            <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
              <div 
                className="h-1 rounded-full" 
                style={{ 
                  width: `${percentage}%`, 
                  backgroundColor: COLORS[index % COLORS.length] 
                }}
              ></div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Revenue Trend (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value) => [`UGX ${value}`, 'Revenue']} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10B981" 
                strokeWidth={2}
                activeDot={{ r: 8 }} 
                name="Revenue (UGX)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Live Activity Feed</h2>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-900">{activity}</p>
                  <p className="text-xs text-gray-500">Just now</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-md bg-green-100 text-green-600">
                <FaFire className="text-lg" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Best Selling Category</p>
                <p className="text-xs text-gray-500">Electronics</p>
              </div>
            </div>
            <span className="text-sm font-medium text-green-600">+24%</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-md bg-blue-100 text-blue-600">
                <FaBell className="text-lg" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Average Order Value</p>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </div>
            </div>
            <span className="text-sm font-medium text-gray-900">$124.50</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-md bg-purple-100 text-purple-600">
                <FaBox className="text-lg" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Inventory Alert</p>
                <p className="text-xs text-gray-500">3 items low stock</p>
              </div>
            </div>
            <span className="text-sm font-medium text-red-600">Action needed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;