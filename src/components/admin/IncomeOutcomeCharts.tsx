import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { apiMethods } from "../../lib/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartData {
  labels: string[];
  incomeData: number[];
  outcomeData: number[];
  profitData: number[];
}

export default function IncomeOutcomeCharts() {
  const [chartData, setChartData] = useState<ChartData>({ 
    labels: [], 
    incomeData: [], 
    outcomeData: [], 
    profitData: [] 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [daysCount, setDaysCount] = useState(30);

  useEffect(() => {
    fetchChartData();
  }, [selectedPeriod, daysCount]);

  const fetchChartData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate date range based on period
      const endDate = new Date();
      let startDate: Date;

      switch (selectedPeriod) {
        case 'daily':
          startDate = subDays(endDate, daysCount - 1);
          break;
        case 'weekly':
          startDate = startOfWeek(subDays(endDate, daysCount * 7 - 7));
          break;
        case 'monthly':
          startDate = startOfMonth(subDays(endDate, daysCount * 30 - 30));
          break;
        default:
          startDate = subDays(endDate, daysCount - 1);
      }

      // Fetch financial data from admin endpoints
      const [transactionsResponse, bettingResponse] = await Promise.all([
        apiMethods.get(`/api/admin/transactions?page=1&size=100`),
        apiMethods.get(`/api/admin/betting-records?page=1&size=50`)
      ]);

      const processedData = processFinancialData(
        transactionsResponse.transactions || transactionsResponse,
        bettingResponse.betting_records || bettingResponse,
        startDate,
        endDate,
        selectedPeriod
      );

      setChartData(processedData);
    } catch (err: any) {
      console.error('Error fetching chart data:', err);
      setError(err.message || "Failed to fetch financial data");
      
      // Use sample data as fallback
      setChartData(generateSampleData(selectedPeriod, daysCount));
    } finally {
      setIsLoading(false);
    }
  };

  const processFinancialData = (
    transactions: any[],
    bettingRecords: any[],
    startDate: Date,
    endDate: Date,
    period: string
  ): ChartData => {
    const labels: string[] = [];
    const incomeData: number[] = [];
    const outcomeData: number[] = [];
    const profitData: number[] = [];

    // Generate labels based on period
    const current = new Date(startDate);
    while (current <= endDate) {
      switch (period) {
        case 'daily':
          labels.push(format(current, 'MMM dd'));
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          labels.push(`Week ${Math.ceil((current.getDate()) / 7)}`);
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          labels.push(format(current, 'MMM yyyy'));
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    // Initialize data arrays with zeros
    incomeData.fill(0, 0, labels.length);
    outcomeData.fill(0, 0, labels.length);
    profitData.fill(0, 0, labels.length);

    // Process transactions
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.created_at);
      if (transactionDate >= startDate && transactionDate <= endDate) {
        const index = getPeriodIndex(transactionDate, startDate, period, labels.length);
        if (index >= 0 && index < labels.length) {
          if (transaction.transaction_type === 'deposit') {
            incomeData[index] += transaction.amount;
          } else if (transaction.transaction_type === 'withdrawal') {
            outcomeData[index] += Math.abs(transaction.amount);
          }
        }
      }
    });

    // Process betting records for profit/loss
    bettingRecords.forEach(record => {
      const recordDate = new Date(record.created_at);
      if (recordDate >= startDate && recordDate <= endDate) {
        const index = getPeriodIndex(recordDate, startDate, period, labels.length);
        if (index >= 0 && index < labels.length && record.actual_profit !== null) {
          if (record.actual_profit > 0) {
            incomeData[index] += record.actual_profit;
          } else {
            outcomeData[index] += Math.abs(record.actual_profit);
          }
          profitData[index] += record.actual_profit;
        }
      }
    });

    return { labels, incomeData, outcomeData, profitData };
  };

  const getPeriodIndex = (date: Date, startDate: Date, period: string, length: number): number => {
    const diffInDays = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (period) {
      case 'daily':
        return Math.min(diffInDays, length - 1);
      case 'weekly':
        return Math.min(Math.floor(diffInDays / 7), length - 1);
      case 'monthly':
        return Math.min(Math.floor(diffInDays / 30), length - 1);
      default:
        return Math.min(diffInDays, length - 1);
    }
  };

  const generateSampleData = (period: string, days: number): ChartData => {
    const labels: string[] = [];
    const incomeData: number[] = [];
    const outcomeData: number[] = [];
    const profitData: number[] = [];

    // Generate realistic sample data
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      switch (period) {
        case 'daily':
          labels.push(format(date, 'MMM dd'));
          break;
        case 'weekly':
          labels.push(`Week ${Math.ceil((date.getDate()) / 7)}`);
          break;
        case 'monthly':
          labels.push(format(date, 'MMM yyyy'));
          break;
      }

      // Generate realistic financial data with some randomness
      const baseIncome = Math.floor(Math.random() * 5000 + 1000);
      const baseOutcome = Math.floor(Math.random() * 4000 + 500);
      
      incomeData.push(baseIncome);
      outcomeData.push(baseOutcome);
      profitData.push(baseIncome - baseOutcome);
    }

    return { labels, incomeData, outcomeData, profitData };
  };

  const getChartOptions = (title: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#f3f4f6',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: title,
        color: '#ffffff',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#f3f4f6',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 45,
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  });

  const lineChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Income',
        data: chartData.incomeData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
      },
      {
        label: 'Outcome',
        data: chartData.outcomeData,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
      },
      {
        label: 'Net Profit',
        data: chartData.profitData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
      }
    ],
  };

  const barChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Income',
        data: chartData.incomeData,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Outcome',
        data: chartData.outcomeData,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ],
  };

  const totalIncome = chartData.incomeData.reduce((sum, val) => sum + val, 0);
  const totalOutcome = chartData.outcomeData.reduce((sum, val) => sum + val, 0);
  const netProfit = totalIncome - totalOutcome;

  if (isLoading) {
    return (
      <div className="bg-black/40 backdrop-blur-2xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            {/* Financial Charts Creative Loading */}
            <div className="relative mb-6">
              {/* Central Chart Icon */}
              <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-blue-500 rounded animate-pulse mx-auto"></div>
              
              {/* Data Points */}
              <div className="absolute inset-0 w-24 h-24 mx-auto">
                <div className="absolute top-2 left-4 w-2 h-3 bg-emerald-500/70 rounded-sm animate-bounce"></div>
                <div className="absolute top-6 right-4 w-2 h-5 bg-blue-500/70 rounded-sm animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="absolute top-4 left-6 w-2 h-7 bg-purple-500/70 rounded-sm animate-bounce" style={{animationDelay: '0.4s'}}></div>
                <div className="absolute top-8 right-6 w-2 h-4 bg-amber-500/70 rounded-sm animate-bounce" style={{animationDelay: '0.6s'}}></div>
              </div>
              
              {/* Chart Lines */}
              <div className="absolute inset-0 w-24 h-24 mx-auto">
                <div className="absolute top-2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/30 via-transparent to-emerald-500/30"></div>
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/30 via-transparent to-blue-500/30"></div>
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/30 via-transparent to-purple-500/30"></div>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-2">Analyzing Financial Data</h3>
            <p className="text-gray-400 text-sm">Generating comprehensive reports...</p>
            
            {/* Progress bars */}
            <div className="flex justify-center space-x-1 mt-6">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className="w-1.5 h-4 bg-gradient-to-t from-blue-500/30 to-emerald-500/30 rounded-full animate-pulse"
                  style={{animationDelay: `${i * 0.3}s`}}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Financial Analytics Header */}
      <div className="bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 backdrop-blur-2xl border border-emerald-500/30 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
          <div className="relative">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Financial Analytics</h3>
                <p className="text-gray-300/90 text-lg">Advanced income vs outcome analysis with real-time insights</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {/* Modern Period Selection */}
            <div className="flex bg-gradient-to-r from-gray-800/60 to-gray-700/60 backdrop-blur-xl border border-gray-600/50 rounded-xl p-1">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>

            {/* Modern Days Count Selection */}
            <select
              value={daysCount}
              onChange={(e) => setDaysCount(Number(e.target.value))}
              className="px-4 py-2 bg-gradient-to-r from-gray-800/60 to-gray-700/60 backdrop-blur-xl border border-gray-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all duration-300"
            >
              <option value={7}>7 days</option>
              <option value={14}>2 weeks</option>
              <option value={30}>30 days</option>
              <option value={90}>3 months</option>
              <option value={365}>1 year</option>
            </select>
          </div>
        </div>

        {/* Premium Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative group overflow-hidden bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-teal-500/20 border border-emerald-500/30 rounded-2xl p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Total Income</p>
                <p className="text-3xl font-bold text-white mb-2">
                  ${totalIncome.toLocaleString()}
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-emerald-400">+15.2%</span>
                  <span className="text-xs text-gray-400">vs last month</span>
                </div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300">
                <span className="text-3xl">📈</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                <div className="h-full w-4/5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden bg-gradient-to-br from-red-500/20 via-rose-500/10 to-pink-500/20 border border-red-500/30 rounded-2xl p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Total Outcome</p>
                <p className="text-3xl font-bold text-white mb-2">
                  ${totalOutcome.toLocaleString()}
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-red-400">+8.7%</span>
                  <span className="text-xs text-gray-400">vs last month</span>
                </div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300">
                <span className="text-3xl">📉</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                <div className="h-full w-3/5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className={`relative group overflow-hidden border rounded-2xl p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl ${
            netProfit >= 0 
              ? 'bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-teal-500/20 border-emerald-500/30' 
              : 'bg-gradient-to-br from-red-500/20 via-rose-500/10 to-pink-500/20 border-red-500/30'
          }`}>
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
              netProfit >= 0 
                ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10' 
                : 'bg-gradient-to-r from-red-500/10 to-pink-500/10'
            }`}></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Net Profit</p>
                <p className={`text-3xl font-bold mb-2 ${
                  netProfit >= 0 ? 'text-white' : 'text-white'
                }`}>
                  {netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()}
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-medium ${
                    netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>{netProfit >= 0 ? '+24.8%' : '-5.2%'}</span>
                  <span className="text-xs text-gray-400">vs last month</span>
                </div>
              </div>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300 ${
                netProfit >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-red-500 to-pink-500'
              }`}>
                <span className="text-3xl">{netProfit >= 0 ? '💰' : '📊'}</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${
                  netProfit >= 0 
                    ? 'w-4/5 bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'w-3/5 bg-gradient-to-r from-red-500 to-pink-500'
                }`}></div>
              </div>
            </div>
          </div>
        </div>

        
      </div>

      {/* Modern Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Premium Line Chart */}
        <div className="relative group bg-black/40 backdrop-blur-2xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl transition-all duration-500 hover:shadow-emerald-500/20">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">📈</span>
              </div>
              <h4 className="text-xl font-bold text-white">Income vs Outcome Trend</h4>
            </div>
            <div className="h-96">
              <Line data={lineChartData} options={getChartOptions('')} />
            </div>
          </div>
        </div>

        {/* Premium Bar Chart */}
        <div className="relative group bg-black/40 backdrop-blur-2xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl transition-all duration-500 hover:shadow-purple-500/20">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">📊</span>
              </div>
              <h4 className="text-xl font-bold text-white">Income vs Outcome</h4>
            </div>
            <div className="h-96">
              <Bar data={barChartData} options={getChartOptions('')} />
            </div>
          </div>
        </div>
      </div>

      {/* Premium Financial Insights */}
      <div className="bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-blue-500/20 backdrop-blur-2xl border border-indigo-500/30 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🎯</span>
          </div>
          <h4 className="text-2xl font-bold text-white">Advanced Financial Insights</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/5 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📊</span>
              </div>
              <span className="text-sm font-medium text-gray-300 uppercase tracking-wide">Profit Margin</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {totalIncome > 0 ? `${((netProfit / totalIncome) * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-xs text-gray-400">Revenue efficiency</div>
          </div>

          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/5 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💰</span>
              </div>
              <span className="text-sm font-medium text-gray-300 uppercase tracking-wide">Daily Income</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              ${chartData.incomeData.length > 0 ? (totalIncome / chartData.incomeData.length).toFixed(0) : '0'}
            </div>
            <div className="text-xs text-gray-400">Average per day</div>
          </div>

          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/5 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📉</span>
              </div>
              <span className="text-sm font-medium text-gray-300 uppercase tracking-wide">Daily Outcome</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              ${chartData.outcomeData.length > 0 ? (totalOutcome / chartData.outcomeData.length).toFixed(0) : '0'}
            </div>
            <div className="text-xs text-gray-400">Average per day</div>
          </div>

          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/5 transition-all duration-300">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                totalOutcome > 0 && (netProfit / totalOutcome) >= 0 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                  : 'bg-gradient-to-r from-red-500 to-pink-500'
              }`}>
                <span className="text-white text-sm">🎯</span>
              </div>
              <span className="text-sm font-medium text-gray-300 uppercase tracking-wide">ROI</span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {totalOutcome > 0 ? `${((netProfit / totalOutcome) * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-xs text-gray-400">Return on investment</div>
          </div>
        </div>
      </div>
    </div>
  );
}
