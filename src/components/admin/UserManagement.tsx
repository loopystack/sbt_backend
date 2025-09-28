import React, { useState, useEffect } from "react";
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
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-400">Manage users, permissions, and account settings</p>
        </div>
        <div className="text-sm text-gray-400">
          Total Users: {users.length}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl p-6">
        <form onSubmit={handleSearch} className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users by email, username, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:scale-105 transition-transform duration-300"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-black/30 backdrop-blur-xl border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
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
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{user.username}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                        {user.full_name && (
                          <div className="text-xs text-gray-500">{user.full_name}</div>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePermissionChange(user)}
                        className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                        title="Manage Permissions"
                      >
                        🔐 Permissions
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleAdjustFunds(user.id, 100, "Admin bonus")}
                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                      >
                        +$100
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm flex items-center justify-center"
                        title="Delete User"
                      >
                        <svg 
                          className="w-4 h-4" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                          />
                        </svg>
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
