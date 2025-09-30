import React, { useState, useEffect, useCallback } from "react";
import { apiMethods } from "../../lib/api";
import { toast } from "react-toastify";

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  funds_usd: number;
  created_at: string;
  last_login: string | null;
  total_bets: number;
  total_bet_amount: number;
  total_transactions: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    is_active: true,
    is_verified: true,
    is_superuser: false,
    funds_usd: 0
  });
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionForm, setPermissionForm] = useState({
    is_superuser: false,
    is_active: true
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    fetchUsers();
  }, [currentPage]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await apiMethods.get(`/api/admin/users?page=${currentPage}&size=20&search=${searchTerm}`);
      setUsers(response);
    } catch (err: any) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      is_active: user.is_active,
      is_verified: user.is_verified,
      is_superuser: user.is_superuser,
      funds_usd: user.funds_usd
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      await apiMethods.put(`/api/admin/users/${selectedUser.id}`, editForm);
      setShowEditModal(false);
      fetchUsers();
      toast.success("User updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update user");
      toast.error("Failed to update user");
    }
  };

  const handlePermissionChange = (user: User) => {
    setSelectedUser(user);
    setPermissionForm({
      is_superuser: user.is_superuser,
      is_active: user.is_active
    });
    setShowPermissionModal(true);
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    setIsUpdating(true);
    try {
      const updateData = {
        is_superuser: permissionForm.is_superuser,
        is_active: permissionForm.is_active
      };

      console.log('🔍 Updating permissions for user:', selectedUser.username);
      console.log('🔍 Update data:', updateData);
      
      const response = await apiMethods.put(`/api/admin/users/${selectedUser.id}`, updateData);
      console.log('🔍 API response:', response);
      
      // Update local state immediately for better UX
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id 
            ? { ...user, ...updateData }
            : user
        )
      );

      setShowPermissionModal(false);
      toast.success(
        `User permissions updated! ${permissionForm.is_superuser ? 'Admin' : 'User'} access granted.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to update permissions");
      toast.error("Failed to update permissions");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickPermissionToggle = async (user: User, newPermission: boolean) => {
    try {
      await apiMethods.put(`/api/admin/users/${user.id}/permissions`, {
        is_superuser: newPermission,
        is_active: user.is_active
      });

      // Update local state immediately
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === user.id 
            ? { ...u, is_superuser: newPermission }
            : u
        )
      );

      toast.success(
        `${user.username} is now ${newPermission ? 'Admin' : 'User'}`
      );
    } catch (err: any) {
      toast.error("Failed to update permission");
    }
  };

  const handleAdjustFunds = async (userId: number, amount: number, description: string) => {
    try {
      await apiMethods.post(`/api/admin/users/${userId}/funds`, { amount, description });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to adjust funds");
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await apiMethods.delete(`/api/admin/users/${userToDelete.id}`);
      toast.success(`User ${userToDelete.username} has been deleted successfully`);
      fetchUsers(); // Refresh the user list
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    user.id.toString().includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          {/* Modern Loading Animation */}
          <div className="relative mb-8">
            {/* Central Hub */}
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse mx-auto"></div>
            
            {/* Orbiting Elements */}
            <div className="absolute inset-0 w-32 h-32 mx-auto">
              {/* First Ring */}
              <div className="absolute w-4 h-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full animate-ping"></div>
              <div className="absolute top-12 w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute top-6 right-6 w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
              <div className="absolute top-6 left-6 w-4 h-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
            </div>
            
            {/* Second Ring */}
            <div className="absolute inset-0 w-40 h-40 mx-auto">
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-emerald-500/60 rounded-full animate-bounce"></div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500/60 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-purple-500/60 rounded-full animate-bounce" style={{animationDelay: '0.6s'}}></div>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-yellow-500/60 rounded-full animate-bounce" style={{animationDelay: '0.9s'}}></div>
            </div>
            
            {/* Connecting Lines */}
            <div className="absolute inset-0 w-40 h-40 mx-auto">
              <div className="absolute top-2 left-1/2 w-0.5 h-3 bg-gradient-to-b from-emerald-500/40 to-transparent transform -translate-x-1/2"></div>
              <div className="absolute bottom-2 left-1/2 w-0.5 h-3 bg-gradient-to-t from-blue-500/40 to-transparent transform -translate-x-1/2"></div>
              <div className="absolute left-2 top-1/2 w-3 h-0.5 bg-gradient-to-r from-purple-500/40 to-transparent transform -translate-y-1/2"></div>
              <div className="absolute right-2 top-1/2 w-3 h-0.5 bg-gradient-to-l from-yellow-500/40 to-transparent transform -translate-y-1/2"></div>
            </div>
          </div>
          
          {/* Loading text */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Loading User Management
            </h3>
            <p className="text-gray-400 text-sm">Retrieving user data and permissions...</p>
            
            {/* Creative Progress Indicator */}
            <div className="flex justify-center space-x-1 mt-6">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i}
                  className="w-2 h-6 bg-gradient-to-t from-blue-500/20 to-purple-500/20 rounded-full animate-pulse"
                  style={{animationDelay: `${i * 0.2}s`}}
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
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 backdrop-blur-2xl border border-blue-500/30 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-2xl">👥</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
              <p className="text-gray-300/90 text-lg">Manage user accounts, permissions, and access controls</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{users.length}</div>
            <div className="text-sm text-gray-400">Total Users</div>
          </div>
        </div>
      </div>

      {/* Premium Search Section */}
      <div className="bg-black/40 backdrop-blur-2xl border border-gray-700/50 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🔍</span>
          </div>
          <h3 className="text-xl font-bold text-white">Search & Filter Users</h3>
        </div>
        
        <form onSubmit={handleSearch} className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users by email, username, name, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-6 py-3 bg-gradient-to-r from-gray-800/60 to-gray-700/60 backdrop-blur-xl border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50 transition-all duration-300"
            />
          </div>
          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:scale-105 transition-all duration-300 shadow-lg font-medium"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">⚠️</span>
            </div>
            <div>
              <h4 className="text-red-400 font-semibold mb-1">Operation Error</h4>
              <p className="text-red-300/90 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Premium Users Table */}
      <div className="bg-black/40 backdrop-blur-2xl border border-gray-700/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📋</span>
            </div>
            <h3 className="text-xl font-bold text-white">User Directory</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-800/60 to-gray-700/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Funds</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-white">{highlightSearchTerm(user.username, searchTerm)}</div>
                        <div className="text-sm text-gray-300">{highlightSearchTerm(user.email, searchTerm)}</div>
                        <div className="text-xs text-gray-500">ID: {highlightSearchTerm(user.id.toString(), searchTerm)}</div>
                        {user.full_name && (
                          <div className="text-xs text-gray-400">{highlightSearchTerm(user.full_name, searchTerm)}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {user.is_verified && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_superuser 
                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.is_superuser ? '👑 Admin' : '👤 User'}
                        </span>
                        <button
                          onClick={() => handleQuickPermissionToggle(user, !user.is_superuser)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                            user.is_superuser
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          }`}
                          title={user.is_superuser ? 'Remove Admin Access' : 'Grant Admin Access'}
                        >
                          {user.is_superuser ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white font-medium">
                      ${user.funds_usd.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">
                      <div>Bets: {user.total_bets}</div>
                      <div>Amount: ${user.total_bet_amount.toLocaleString()}</div>
                      <div>Transactions: {user.total_transactions}</div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePermissionChange(user)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-500/30 text-purple-300 hover:text-white rounded-xl hover:border-purple-500/50 hover:scale-105 transition-all duration-300 text-sm font-medium shadow-lg"
                        title="Manage Permissions"
                      >
                        🔐 Permissions
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-300 hover:text-white rounded-xl hover:border-blue-500/50 hover:scale-105 transition-all duration-300 text-sm font-medium shadow-lg"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleAdjustFunds(user.id, 100, "Admin bonus")}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl hover:border-emerald-500/50 hover:scale-105 transition-all duration-300 text-sm font-medium shadow-lg"
                      >
                        💰 +$100
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="px-4 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 text-red-300 hover:text-white rounded-xl hover:border-red-500/50 hover:scale-105 transition-all duration-300 text-sm font-medium shadow-lg"
                        title="Delete User"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Edit User: {selectedUser.username}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Active Status</label>
                <select
                  value={editForm.is_active.toString()}
                  onChange={(e) => setEditForm({...editForm, is_active: e.target.value === 'true'})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Verification Status</label>
                <select
                  value={editForm.is_verified.toString()}
                  onChange={(e) => setEditForm({...editForm, is_verified: e.target.value === 'true'})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Admin Status</label>
                <select
                  value={editForm.is_superuser.toString()}
                  onChange={(e) => setEditForm({...editForm, is_superuser: e.target.value === 'true'})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="false">Regular User</option>
                  <option value="true">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Funds (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.funds_usd}
                  onChange={(e) => setEditForm({...editForm, funds_usd: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:scale-105 transition-transform duration-300"
              >
                Update User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Management Modal */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Manage Permissions</h3>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{selectedUser.username}</div>
                  <div className="text-xs text-gray-400">{selectedUser.email}</div>
                  <div className="text-xs text-gray-500">ID: {selectedUser.id}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">User Role</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="user"
                      checked={!permissionForm.is_superuser}
                      onChange={() => setPermissionForm({...permissionForm, is_superuser: false})}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">👤</span>
                      <div>
                        <div className="text-sm font-medium text-white">Regular User</div>
                        <div className="text-xs text-gray-400">Standard access to betting features</div>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={permissionForm.is_superuser}
                      onChange={() => setPermissionForm({...permissionForm, is_superuser: true})}
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">👑</span>
                      <div>
                        <div className="text-sm font-medium text-white">Administrator</div>
                        <div className="text-xs text-gray-400">Full access to admin features and user management</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Account Status</label>
                <select
                  value={permissionForm.is_active.toString()}
                  onChange={(e) => setPermissionForm({...permissionForm, is_active: e.target.value === 'true'})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {permissionForm.is_superuser && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400">⚠️</span>
                    <div className="text-sm text-yellow-300">
                      <strong>Warning:</strong> Granting admin access will give this user full administrative privileges.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePermissions}
                disabled={isUpdating}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isUpdating && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
                <span>{isUpdating ? 'Updating...' : 'Update Permissions'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Delete User</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={isDeleting}
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {userToDelete.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{userToDelete.username}</div>
                  <div className="text-xs text-gray-400">{userToDelete.email}</div>
                  <div className="text-xs text-gray-500">ID: {userToDelete.id}</div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-red-400 text-xl">⚠️</span>
                <div className="text-sm font-medium text-red-300">Warning: This action cannot be undone</div>
              </div>
              <div className="text-sm text-gray-300">
                Are you sure you want to permanently delete <strong>{userToDelete.username}</strong>? 
                This will remove all user data including:
              </div>
              <ul className="text-sm text-gray-400 mt-2 ml-4 list-disc">
                <li>User account and profile</li>
                <li>Betting history and records</li>
                <li>Transaction history</li>
                <li>Account balance and funds</li>
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isDeleting && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
                <span>{isDeleting ? 'Deleting...' : 'Delete User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
