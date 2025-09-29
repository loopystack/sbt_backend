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
        apiMethods.get(`/api/admin/transactions?page=1&size=1000`),
        apiMethods.get(`/api/admin/betting-records?page=1&size=1000`)
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
      <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-400">Loading financial charts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Financial Analytics</h3>
            <p className="text-gray-400">Income vs Outcome Analysis</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Period Selection */}
            <div className="flex bg-gray-800/50 rounded-lg p-1">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    selectedPeriod === period
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>

            {/* Days Count Selection */}
            <select
              value={daysCount}
              onChange={(e) => setDaysCount(Number(e.target.value))}
              className="px-3 py-1.5 bg-gray-800/50 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={7}>7 days</option>
              <option value={14}>2 weeks</option>
              <option value={30}>30 days</option>
              <option value={90}>3 months</option>
              <option value={365}>1 year</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Income</p>
                <p className="text-2xl font-bold text-green-400">
                  ${totalIncome.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 text-lg">📈</span>
              </div>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Outcome</p>
                <p className="text-2xl font-bold text-red-400">
                  ${totalOutcome.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <span className="text-red-400 text-lg">📉</span>
              </div>
            </div>
          </div>

          <div className={`border rounded-lg p-4 ${
            netProfit >= 0 
              ? 'bg-green-500/10 border-green-500/20' 
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Net Profit</p>
                <p className={`text-2xl font-bold ${
                  netProfit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                netProfit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                <span className={`text-lg ${
                  netProfit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>{netProfit >= 0 ? '💰' : '📊'}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-orange-400">⚠️</span>
              <p className="text-orange-400 text-sm">
                {error} - Showing sample data instead.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
          <div className="h-80">
            <Line data={lineChartData} options={getChartOptions('Income vs Outcome Trend')} />
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
          <div className="h-80">
            <Bar data={barChartData} options={getChartOptions('Income vs Outcome Comparison')} />
          </div>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Financial Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Profit Margin</span>
              <span className={`font-semibold ${
                totalIncome > 0 
                  ? netProfit / totalIncome >= 0 ? 'text-green-400' : 'text-red-400'
                  : 'text-gray-400'
              }`}>
                {totalIncome > 0 ? `${((netProfit / totalIncome) * 100).toFixed(2)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Avg Daily Income</span>
              <span className="font-semibold text-green-400">
                ${chartData.incomeData.length > 0 ? (totalIncome / chartData.incomeData.length).toFixed(0) : '0'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Avg Daily Outcome</span>
              <span className="font-semibold text-red-400">
                ${chartData.outcomeData.length > 0 ? (totalOutcome / chartData.outcomeData.length).toFixed(0) : '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">ROI</span>
              <span className={`font-semibold ${
                totalOutcome > 0 
                  ? (netProfit / totalOutcome) >= 0 ? 'text-green-400' : 'text-red-400'
                  : 'text-gray-400'
              }`}>
                {totalOutcome > 0 ? `${((netProfit / totalOutcome) * 100).toFixed(2)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
