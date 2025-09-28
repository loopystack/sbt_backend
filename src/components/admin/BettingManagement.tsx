import React, { useState, useEffect } from "react";
import { apiMethods } from "../../lib/api";

interface BettingRecord {
  id: number;
  user_id: number;
  bet_amount: number;
  potential_win: number;
  actual_profit: number | null;
  match_id: number | null;
  match_teams: string;
  match_date: string | null;
  match_league: string | null;
  match_status: string;
  selected_outcome: string;
  selected_team: string | null;
  odds_value: string;
  odds_decimal: number;
  bet_status: string;
  is_settled: boolean;
  settlement_date: string | null;
  created_at: string;
  updated_at: string | null;
  user_email: string | null;
  user_username: string | null;
}

export default function BettingManagement() {
  const [bettingRecords, setBettingRecords] = useState<BettingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    user_id: "",
    status: "",
    search: ""
  });
  const [searchInputs, setSearchInputs] = useState({
    user_id: "",
    search: ""
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchBettingRecords();
  }, [currentPage, filters]);

  const fetchBettingRecords = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        size: "20"
      });
      
      if (filters.user_id) params.append("user_id", filters.user_id);
      if (filters.status) params.append("status", filters.status);

      const response = await apiMethods.get(`/api/admin/betting-records?${params}`);
      setBettingRecords(response);
    } catch (err: any) {
      setError(err.message || "Failed to fetch betting records");
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

  const handleKeyPress = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(key);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won":
        return "bg-green-500/20 text-green-400";
      case "lost":
        return "bg-red-500/20 text-red-400";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "void":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case "finished":
        return "bg-green-500/20 text-green-400";
      case "live":
        return "bg-red-500/20 text-red-400";
      case "upcoming":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
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
          <h2 className="text-2xl font-bold text-white">Betting Records Management</h2>
          <p className="text-gray-400">Monitor and manage all betting activities</p>
        </div>
        <div className="text-sm text-gray-400">
          Total Records: {bettingRecords.length}
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
            <label className="block text-sm font-medium text-gray-400 mb-2">Bet Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="void">Void</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Search Teams</label>
            <input
              type="text"
              placeholder="Search by team names... (Press Enter to search)"
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
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Betting Records Table */}
      <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Match</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Bet Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {bettingRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{record.user_username}</div>
                      <div className="text-sm text-gray-400">{record.user_email}</div>
                      <div className="text-xs text-gray-500">ID: {record.user_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{record.match_teams}</div>
                      {record.match_league && (
                        <div className="text-sm text-gray-400">{record.match_league}</div>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMatchStatusColor(record.match_status)}`}>
                          {record.match_status}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm text-white">
                        <span className="font-medium">{record.selected_outcome}</span>
                        {record.selected_team && (
                          <span className="text-gray-400"> - {record.selected_team}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        Odds: {record.odds_value} ({record.odds_decimal.toFixed(2)})
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">
                        Bet: ${record.bet_amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-400">
                        Potential: ${record.potential_win.toFixed(2)}
                      </div>
                      {record.actual_profit !== null && (
                        <div className={`text-sm font-medium ${
                          record.actual_profit > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          Profit: ${record.actual_profit.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.bet_status)}`}>
                        {record.bet_status}
                      </span>
                      {record.is_settled && (
                        <div className="text-xs text-green-400">Settled</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">
                      <div>Created: {new Date(record.created_at).toLocaleDateString()}</div>
                      {record.settlement_date && (
                        <div>Settled: {new Date(record.settlement_date).toLocaleDateString()}</div>
                      )}
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
          Showing {bettingRecords.length} records
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
    </div>
  );
}
