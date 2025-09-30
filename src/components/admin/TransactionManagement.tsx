import React, { useState, useEffect, useCallback } from "react";
import { apiMethods } from "../../lib/api";

interface Transaction {
  id: number;
  user_id: number;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  reference_type: string | null;
  status: string;
  payment_method: string | null;
  external_reference: string | null;
  extra_data: string | null;
  created_at: string;
  updated_at: string | null;
  user_email: string | null;
  user_username: string | null;
}

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    user_id: "",
    transaction_type: "",
    search: ""
  });
  const [searchInputs, setSearchInputs] = useState({
    user_id: "",
    search: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Helper function to highlight search terms in text
  const highlightSearchTerm = useCallback((text: string, searchTerm: string) => {
    if (!searchTerm.trim()) {
      return text;
    }
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <span key={index} className="bg-yellow-300 text-black font-semibold px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, filters]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors
      const params = new URLSearchParams({
        page: currentPage.toString(),
        size: "20"
      });
      
      if (filters.user_id) params.append("user_id", filters.user_id);
      if (filters.transaction_type) params.append("transaction_type", filters.transaction_type);
      if (filters.search) params.append("search", filters.search);

      const response = await apiMethods.get(`/api/admin/transactions?${params}`);
      setTransactions(response);
      setAllTransactions(response);
    } catch (err: any) {
      setError(err.message || "Failed to fetch transactions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setCurrentPage(1);
  };

  const handleSearchInputChange = (key: string, value: string) => {
    setSearchInputs({ ...searchInputs, [key]: value });
  };

  const handleSearchSubmit = (key: string) => {
    setFilters({ ...filters, [key]: searchInputs[key as keyof typeof searchInputs] });
    setCurrentPage(1);
  };

  // Real-time filtering like users page
  const filteredTransactions = allTransactions.filter(transaction => {
    const searchTerm = searchInputs.search.toLowerCase();
    const userSearchTerm = searchInputs.user_id.toLowerCase();
    
    if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm)) {
      return false;
    }
    
    if (userSearchTerm && !transaction.user_id.toString().includes(userSearchTerm)) {
      return false;
    }
    
    if (filters.transaction_type && transaction.transaction_type !== filters.transaction_type) {
      return false;
    }
    
    return true;
  });

  const handleKeyPress = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(key);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "deposit":
        return "bg-green-500/20 text-green-400";
      case "withdrawal":
        return "bg-red-500/20 text-red-400";
      case "bet_placed":
        return "bg-blue-500/20 text-blue-400";
      case "bet_won":
        return "bg-emerald-500/20 text-emerald-400";
      case "bet_lost":
        return "bg-orange-500/20 text-orange-400";
      case "manual_adjustment":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      case "cancelled":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getAmountColor = (amount: number) => {
    if (amount > 0) return "text-green-400";
    if (amount < 0) return "text-red-400";
    return "text-gray-400";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          {/* Transaction Loading Animation */}
          <div className="relative mb-8">
            {/* Central Transaction Icon */}
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded animate-pulse mx-auto"></div>
            
            {/* Financial Flow */}
            <div className="absolute inset-0 w-24 h-24 mx-auto">
              <div className="absolute top-2 left-4 w-3 h-2 bg-green-500/70 rounded-sm animate-bounce"></div>
              <div className="absolute top-6 right-4 w-3 h-3 bg-red-500/70 rounded-sm animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="absolute top-4 left-6 w-3 h-4 bg-blue-500/70 rounded-sm animate-bounce" style={{animationDelay: '0.4s'}}></div>
              <div className="absolute top-8 right-6 w-3 h-2 bg-purple-500/70 rounded-sm animate-bounce" style={{animationDelay: '0.6s'}}></div>
            </div>
            
            {/* Flow Lines */}
            <div className="absolute inset-0 w-24 h-24 mx-auto">
              <div className="absolute top-2 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500/30 via-transparent to-green-500/30"></div>
              <div className="absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500/30 via-transparent to-red-500/30"></div>
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/30 via-transparent to-blue-500/30"></div>
            </div>
          </div>
          
          <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-green-400 bg-clip-text text-transparent mb-2">
            Loading Transactions
          </h3>
          <p className="text-gray-400 text-sm">Processing financial data and transaction history...</p>
          
          {/* Progress bars */}
          <div className="flex justify-center space-x-1 mt-6">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="w-1.5 h-4 bg-gradient-to-t from-purple-500/30 to-blue-500/30 rounded-full animate-pulse"
                style={{animationDelay: `${i * 0.3}s`}}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 backdrop-blur-2xl border border-purple-500/30 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-2xl">💳</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Transaction Management</h1>
              <p className="text-gray-300/90 text-lg">Monitor financial transactions and payment activities</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{transactions.length}</div>
            <div className="text-sm text-gray-400">Total Transactions</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">User ID</label>
            <input
              type="text"
              placeholder="Filter by user ID... (Press Enter to search)"
              value={searchInputs.user_id}
              onChange={(e) => handleSearchInputChange("user_id", e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, "user_id")}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Transaction Type</label>
            <select
              value={filters.transaction_type}
              onChange={(e) => handleFilterChange("transaction_type", e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
            >
              <option value="">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="bet_placed">Bet Placed</option>
              <option value="bet_won">Bet Won</option>
              <option value="bet_lost">Bet Lost</option>
              <option value="manual_adjustment">Manual Adjustment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Search Description</label>
            <input
              type="text"
              placeholder="Search by description... (Press Enter to search)"
              value={searchInputs.search}
              onChange={(e) => handleSearchInputChange("search", e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, "search")}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 ml-4 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Transaction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{highlightSearchTerm(transaction.user_username || '', searchInputs.search)}</div>
                      <div className="text-sm text-gray-400">{highlightSearchTerm(transaction.user_email || '', searchInputs.search)}</div>
                      <div className="text-xs text-gray-500">ID: {highlightSearchTerm(transaction.user_id.toString(), searchInputs.search)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                          {transaction.transaction_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300">{highlightSearchTerm(transaction.description, searchInputs.search)}</div>
                      {transaction.payment_method && (
                        <div className="text-xs text-gray-500">Method: {transaction.payment_method}</div>
                      )}
                      {transaction.external_reference && (
                        <div className="text-xs text-gray-500">Ref: {transaction.external_reference}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-lg font-bold ${getAmountColor(transaction.amount)}`}>
                      {transaction.amount > 0 ? '+' : ''}${transaction.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">
                      <div>Before: ${transaction.balance_before.toFixed(2)}</div>
                      <div className="text-white font-medium">After: ${transaction.balance_after.toFixed(2)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">
                      <div>{new Date(transaction.created_at).toLocaleDateString()}</div>
                      <div className="text-xs">{new Date(transaction.created_at).toLocaleTimeString()}</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Showing {filteredTransactions.length} transactions
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-white">Page {currentPage}</span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            ${filteredTransactions.filter(t => t.transaction_type === 'deposit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Total Deposits</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">
            ${Math.abs(filteredTransactions.filter(t => t.transaction_type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Total Withdrawals</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            ${Math.abs(filteredTransactions.filter(t => t.transaction_type === 'bet_placed').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Total Bet Amount</div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">
            {filteredTransactions.length}
          </div>
          <div className="text-sm text-gray-400">Total Transactions</div>
        </div>
      </div>
    </div>
  );
}
