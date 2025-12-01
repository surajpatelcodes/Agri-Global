import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ShoppingBag, CreditCard, Activity } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
                {title}
            </CardTitle>
            <Icon className={`h-4 w-4 ${color}`} />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalShopOwners: 0,
        activeShopsToday: 0,
        totalCredits: 0,
        totalDefaulters: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            // Fetch total shop owners
            const { count: shopOwnerCount, error: shopError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .not('shop_name', 'is', null);

            if (shopError) console.error('Error fetching shop owners:', shopError);

            // Fetch total credits
            const { count: creditCount, error: creditError } = await supabase
                .from('credits')
                .select('*', { count: 'exact', head: true });

            if (creditError) console.error('Error fetching credits:', creditError);

            // Fetch shops active today (distinct issuers of credits today)
            // Note: Supabase doesn't support distinct count easily in one query without RPC, 
            // so we fetch the data (lightweight if we only select issued_by)
            const { data: activeCredits, error: activeError } = await supabase
                .from('credits')
                .select('issued_by')
                .gte('created_at', todayISO);

            const activeShopsSet = new Set(activeCredits?.map(c => c.issued_by));
            const activeShopsCount = activeShopsSet.size;

            if (activeError) console.error('Error fetching active shops:', activeError);

            // Fetch total defaulters (distinct customers with defaulter status)
            const { data: defaulters, error: defaulterError } = await supabase
                .from('credits')
                .select('customer_id')
                .eq('status', 'defaulter');

            const defaultersSet = new Set(defaulters?.map(d => d.customer_id));
            const defaultersCount = defaultersSet.size;

            if (defaulterError) console.error('Error fetching defaulters:', defaulterError);

            setStats({
                totalShopOwners: shopOwnerCount || 0,
                activeShopsToday: activeShopsCount || 0,
                totalCredits: creditCount || 0,
                totalDefaulters: defaultersCount || 0
            });
        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();

        // Realtime subscription
        const channel = supabase
            .channel('admin-dashboard-stats')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => fetchStats()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'credits' },
                () => fetchStats()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-gray-500">Overview of the platform performance.</p>
                </div>

                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <CardHeader className="h-20" />
                                <CardContent className="h-10" />
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total Shop Owners"
                            value={stats.totalShopOwners}
                            icon={Users}
                            color="text-blue-600"
                        />
                        <StatCard
                            title="Shops Active Today"
                            value={stats.activeShopsToday}
                            icon={Activity}
                            color="text-green-600"
                        />
                        <StatCard
                            title="Total Credits Recorded"
                            value={stats.totalCredits}
                            icon={CreditCard}
                            color="text-orange-600"
                        />
                        <StatCard
                            title="Total Defaulters"
                            value={stats.totalDefaulters}
                            icon={ShoppingBag}
                            color="text-red-600"
                        />
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
