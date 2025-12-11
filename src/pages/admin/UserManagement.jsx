import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, ShieldAlert } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchUsers = async () => {
        try {
            setLoading(true);
            // Fetch profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*');

            if (profilesError) throw profilesError;

            // Fetch user roles
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('*');

            if (rolesError) throw rolesError;

            // Merge data
            const mergedUsers = profiles.map(profile => ({
                ...profile,
                user_roles: roles.filter(r => r.user_id === profile.id)
            }));

            setUsers(mergedUsers || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast({
                title: "Error",
                description: "Failed to load users.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const toggleAdminRole = async (userId, currentRoles) => {
        try {
            const isAdmin = currentRoles?.some(r => r.role === 'admin');

            if (isAdmin) {
                // Remove admin role
                const { error } = await supabase
                    .from('user_roles')
                    .delete()
                    .eq('user_id', userId)
                    .eq('role', 'admin');

                if (error) throw error;
            } else {
                // Add admin role
                const { error } = await supabase
                    .from('user_roles')
                    .insert({
                        user_id: userId,
                        role: 'admin'
                    });

                if (error) throw error;
            }

            toast({
                title: "Success",
                description: `User role updated successfully.`,
            });

            fetchUsers();
        } catch (error) {
            console.error('Error updating role:', error);
            toast({
                title: "Error",
                description: "Failed to update user role.",
                variant: "destructive",
            });
        }
    };

    const updateUserStatus = async (userId, newStatus) => {
        try {
            // If approving, first confirm the user's email via edge function
            if (newStatus === 'approved') {
                const { data, error: confirmError } = await supabase.functions.invoke('confirm-user-email', {
                    body: { userId }
                });

                if (confirmError) {
                    console.error('Error confirming email:', confirmError);
                    toast({
                        title: "Error",
                        description: "Failed to confirm user email. Please try again.",
                        variant: "destructive",
                    });
                    return;
                }

                if (data?.error) {
                    console.error('Edge function error:', data.error);
                    toast({
                        title: "Error",
                        description: data.error || "Failed to confirm user email.",
                        variant: "destructive",
                    });
                    return;
                }
            }

            // Update the profile status
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', userId);

            if (error) throw error;

            toast({
                title: "Success",
                description: `User ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully.`,
            });

            fetchUsers();
        } catch (error) {
            console.error('Error updating status:', error);
            toast({
                title: "Error",
                description: "Failed to update user status.",
                variant: "destructive",
            });
        }
    };

    const pendingUsers = users.filter(u => u.status === 'pending');
    const activeUsers = users.filter(u => u.status !== 'pending' && u.status !== 'rejected');

    const UserTable = ({ data, showActions = true }) => (
        <div className="bg-white rounded-lg border shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Shop Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                            </TableCell>
                        </TableRow>
                    ) : data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                No users found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((user) => {
                            const isAdmin = user.user_roles?.some(r => r.role === 'admin');
                            return (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                                    <TableCell>{user.shop_name || 'N/A'}</TableCell>
                                    <TableCell>{user.phone || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.status === 'approved' ? 'default' : 'secondary'} className={user.status === 'approved' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}>
                                            {user.status || 'Approved'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {isAdmin ? (
                                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
                                                Admin
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-gray-500">
                                                User
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {user.status === 'pending' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => updateUserStatus(user.id, 'approved')}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => updateUserStatus(user.id, 'rejected')}
                                                >
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                        {user.status !== 'pending' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleAdminRole(user.id, user.user_roles)}
                                                className={isAdmin ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-purple-600 hover:text-purple-700 hover:bg-purple-50"}
                                            >
                                                {isAdmin ? (
                                                    <>
                                                        <ShieldAlert className="w-4 h-4 mr-2" />
                                                        Revoke Admin
                                                    </>
                                                ) : (
                                                    <>
                                                        <Shield className="w-4 h-4 mr-2" />
                                                        Make Admin
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                        <p className="text-gray-500">Manage users, approvals, and roles.</p>
                    </div>
                    <Button onClick={fetchUsers} variant="outline" size="sm">
                        Refresh
                    </Button>
                </div>

                <div className="space-y-4">
                    <div className="flex space-x-4 border-b">
                        <button
                            className="pb-2 border-b-2 border-green-600 font-medium text-green-600"
                        >
                            All Users
                        </button>
                        {/* Simple tab implementation for now, can be enhanced with Tabs component */}
                    </div>

                    {/* Showing all users for now, filtering can be added with Tabs component */}
                    <div className="space-y-8">
                        {pendingUsers.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold mb-3 text-orange-600 flex items-center">
                                    <ShieldAlert className="w-5 h-5 mr-2" />
                                    Pending Approvals ({pendingUsers.length})
                                </h2>
                                <UserTable data={pendingUsers} />
                            </div>
                        )}

                        <div>
                            <h2 className="text-lg font-semibold mb-3 text-gray-700">Active Users</h2>
                            <UserTable data={activeUsers} />
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default UserManagement;
