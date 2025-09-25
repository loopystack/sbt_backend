import React, { useState, useEffect } from "react";
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
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, filters]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        size: "20"
      });
      
      if (filters.user_id) params.append("user_id", filters.user_id);
      if (filters.transaction_type) params.append("transaction_type", filters.transaction_type);

      const response = await apiMethods.get(`/api/admin/transactions?${params}`);
      setTransactions(response);
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Transaction Management</h2>
          <p className="text-gray-400">Monitor all financial transactions and activities</p>
        </div>
        <div className="text-sm text-gray-400">
          Total Transactions: {transactions.length}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">User ID</label>
            <input
              type="text"
              placeholder="Filter by user ID..."
              value={filters.user_id}
              onChange={(e) => handleFilterChange("user_id", e.target.value)}
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
              placeholder="Search by description..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
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
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{transaction.user_username}</div>
                      <div className="text-sm text-gray-400">{transaction.user_email}</div>
                      <div className="text-xs text-gray-500">ID: {transaction.user_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                          {transaction.transaction_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300">{transaction.description}</div>
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
          Showing {transactions.length} transactions
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
            ${transactions.filter(t => t.transaction_type === 'deposit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Total Deposits</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">
            ${Math.abs(transactions.filter(t => t.transaction_type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Total Withdrawals</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            ${Math.abs(transactions.filter(t => t.transaction_type === 'bet_placed').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Total Bet Amount</div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">
            {transactions.length}
          </div>
          <div className="text-sm text-gray-400">Total Transactions</div>
        </div>
      </div>
    </div>
  );
}
