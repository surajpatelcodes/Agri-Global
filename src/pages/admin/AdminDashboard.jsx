import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Users, ShoppingBag, CreditCard, Activity, IndianRupee,
    TrendingUp, AlertTriangle, Clock, ArrowRight, Wallet, UserCheck
} from 'lucide-react';

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const StatCard = ({ title, value, icon: Icon, color, hint, accent }) => (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
        <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
            <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>
                <Icon className="h-4 w-4" />
            </div>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
        </CardContent>
    </Card>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalShopOwners: 0,
        pendingApprovals: 0,
        activeShopsToday: 0,
        totalCredits: 0,
        totalDefaulters: 0,
        totalCreditAmount: 0,
        totalPaymentsAmount: 0,
        pendingAmount: 0,
        creditsToday: 0,
        paymentsToday: 0,
    });
    const [trend, setTrend] = useState([]); // last 7 days
    const [topShops, setTopShops] = useState([]);
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();
            const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);
            const weekAgoISO = weekAgo.toISOString();

            const [
                profilesRes, pendingRes, creditsRes, paymentsRes,
                creditsWeekRes, paymentsWeekRes, recentCreditsRes
            ] = await Promise.all([
                supabase.from('profiles').select('id, status, shop_name', { count: 'exact' }),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('credits').select('id, amount, status, customer_id, issued_by, created_at'),
                supabase.from('payments').select('id, amount, created_at, created_by'),
                supabase.from('credits').select('amount, created_at, issued_by').gte('created_at', weekAgoISO),
                supabase.from('payments').select('amount, created_at').gte('created_at', weekAgoISO),
                supabase.from('credits').select('id, amount, status, created_at, customer_id, issued_by').order('created_at', { ascending: false }).limit(8),
            ]);

            const profiles = profilesRes.data || [];
            const credits = creditsRes.data || [];
            const payments = paymentsRes.data || [];

            const totalCreditAmount = credits.reduce((s, c) => s + Number(c.amount || 0), 0);
            const totalPaymentsAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
            const pendingAmount = Math.max(totalCreditAmount - totalPaymentsAmount, 0);

            const creditsTodayCount = credits.filter(c => c.created_at >= todayISO).length;
            const paymentsTodayCount = payments.filter(p => p.created_at >= todayISO).length;

            const activeShopsSet = new Set(
                credits.filter(c => c.created_at >= todayISO).map(c => c.issued_by).filter(Boolean)
            );
            const defaultersSet = new Set(
                credits.filter(c => c.status === 'defaulter').map(c => c.customer_id)
            );

            // 7-day trend
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today); d.setDate(d.getDate() - i);
                const key = d.toISOString().slice(0, 10);
                days.push({ key, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), credits: 0, payments: 0 });
            }
            (creditsWeekRes.data || []).forEach(c => {
                const k = (c.created_at || '').slice(0, 10);
                const d = days.find(x => x.key === k); if (d) d.credits += Number(c.amount || 0);
            });
            (paymentsWeekRes.data || []).forEach(p => {
                const k = (p.created_at || '').slice(0, 10);
                const d = days.find(x => x.key === k); if (d) d.payments += Number(p.amount || 0);
            });

            // Top shops by issued credit
            const shopMap = new Map();
            credits.forEach(c => {
                if (!c.issued_by) return;
                const cur = shopMap.get(c.issued_by) || { issued_by: c.issued_by, total: 0, count: 0 };
                cur.total += Number(c.amount || 0); cur.count += 1;
                shopMap.set(c.issued_by, cur);
            });
            const profileById = new Map(profiles.map(p => [p.id, p]));
            const top = Array.from(shopMap.values())
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map(s => ({ ...s, shop_name: profileById.get(s.issued_by)?.shop_name || 'Unknown Shop' }));

            const recentList = (recentCreditsRes.data || []).map(c => ({
                ...c,
                shop_name: profileById.get(c.issued_by)?.shop_name || 'Unknown Shop',
            }));

            setStats({
                totalShopOwners: profiles.filter(p => p.shop_name).length,
                pendingApprovals: pendingRes.count || 0,
                activeShopsToday: activeShopsSet.size,
                totalCredits: credits.length,
                totalDefaulters: defaultersSet.size,
                totalCreditAmount,
                totalPaymentsAmount,
                pendingAmount,
                creditsToday: creditsTodayCount,
                paymentsToday: paymentsTodayCount,
            });
            setTrend(days);
            setTopShops(top);
            setRecent(recentList);
        } catch (e) {
            console.error('Admin stats error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        const channel = supabase
            .channel('admin-dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAll)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'credits' }, fetchAll)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchAll)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const maxTrend = Math.max(1, ...trend.flatMap(d => [d.credits, d.payments]));

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                        <p className="text-gray-500">Real-time overview of platform performance.</p>
                    </div>
                    <Button variant="outline" onClick={fetchAll} disabled={loading}>
                        {loading ? 'Refreshing…' : 'Refresh'}
                    </Button>
                </div>

                {/* Pending approvals callout */}
                {stats.pendingApprovals > 0 && (
                    <Card className="border-orange-200 bg-orange-50/60">
                        <CardContent className="py-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
                                    <UserCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-orange-900">
                                        {stats.pendingApprovals} user{stats.pendingApprovals > 1 ? 's' : ''} awaiting approval
                                    </p>
                                    <p className="text-sm text-orange-700">Review and approve new shop owners.</p>
                                </div>
                            </div>
                            <Link to="/admin/users">
                                <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                                    Review <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Primary stats */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Total Shop Owners" value={stats.totalShopOwners} icon={Users} color="text-blue-600" accent="bg-blue-500" hint={`${stats.activeShopsToday} active today`} />
                    <StatCard title="Total Credit Issued" value={formatINR(stats.totalCreditAmount)} icon={CreditCard} color="text-orange-600" accent="bg-orange-500" hint={`${stats.totalCredits} transactions`} />
                    <StatCard title="Total Payments Received" value={formatINR(stats.totalPaymentsAmount)} icon={Wallet} color="text-green-600" accent="bg-green-500" hint={`${stats.paymentsToday} today`} />
                    <StatCard title="Outstanding Amount" value={formatINR(stats.pendingAmount)} icon={IndianRupee} color="text-red-600" accent="bg-red-500" hint={`${stats.totalDefaulters} defaulters`} />
                </div>

                {/* Secondary stats */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="Pending Approvals" value={stats.pendingApprovals} icon={Clock} color="text-amber-600" accent="bg-amber-500" />
                    <StatCard title="Active Shops Today" value={stats.activeShopsToday} icon={Activity} color="text-emerald-600" accent="bg-emerald-500" />
                    <StatCard title="Credits Today" value={stats.creditsToday} icon={TrendingUp} color="text-indigo-600" accent="bg-indigo-500" />
                    <StatCard title="Defaulters" value={stats.totalDefaulters} icon={AlertTriangle} color="text-rose-600" accent="bg-rose-500" />
                </div>

                {/* Trend + Top shops */}
                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2 border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle>7-Day Activity</CardTitle>
                            <CardDescription>Credits issued vs payments received</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-3 h-48">
                                {trend.map((d) => (
                                    <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full flex items-end gap-1 h-40">
                                            <div className="flex-1 bg-orange-200 rounded-t-md transition-all"
                                                style={{ height: `${(d.credits / maxTrend) * 100}%`, minHeight: d.credits ? '4px' : '0' }}
                                                title={`Credits: ${formatINR(d.credits)}`} />
                                            <div className="flex-1 bg-green-300 rounded-t-md transition-all"
                                                style={{ height: `${(d.payments / maxTrend) * 100}%`, minHeight: d.payments ? '4px' : '0' }}
                                                title={`Payments: ${formatINR(d.payments)}`} />
                                        </div>
                                        <span className="text-xs text-gray-500">{d.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4 mt-4 text-xs text-gray-600">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-200 rounded" /> Credits</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-300 rounded" /> Payments</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle>Top Shops</CardTitle>
                            <CardDescription>By credit volume</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {topShops.length === 0 && <p className="text-sm text-gray-500">No data yet.</p>}
                            {topShops.map((s, i) => (
                                <div key={s.issued_by} className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{s.shop_name}</p>
                                        <p className="text-xs text-gray-500">{s.count} credits</p>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">{formatINR(s.total)}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Credits</CardTitle>
                            <CardDescription>Latest credit transactions across all shops</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recent.length === 0 ? (
                            <p className="text-sm text-gray-500">No recent activity.</p>
                        ) : (
                            <div className="divide-y">
                                {recent.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between py-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                                                <ShoppingBag className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{c.shop_name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(c.created_at).toLocaleString('en-IN')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={c.status === 'defaulter' ? 'destructive' : c.status === 'paid' ? 'default' : 'secondary'}
                                                className={c.status === 'paid' ? 'bg-green-100 text-green-800 hover:bg-green-100' : c.status === 'partial' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : ''}>
                                                {c.status}
                                            </Badge>
                                            <span className="text-sm font-semibold">{formatINR(c.amount)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
