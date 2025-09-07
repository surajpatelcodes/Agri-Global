import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, DollarSign, User, Calendar, CreditCard } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
    fetchCustomersWithCredit();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          credits (
            id,
            amount,
            description,
            customers (
              id,
              name,
              phone,
              created_by
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Only show payments where the customer was added by the logged-in user
      const filtered = (data || []).filter(payment => payment.credits?.customers?.created_by === user?.id);
      setPayments(filtered);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch only customers added by user who have taken credit
  const fetchCustomersWithCredit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Get all customers added by user
      const { data: customers, error: custError } = await supabase
        .from("customers")
        .select("id, name, phone")
        .eq("created_by", user?.id);
      if (custError) throw custError;
      // Get credits for those customers
      const { data: credits, error: credError } = await supabase
        .from("credits")
        .select("customer_id")
        .eq("issued_by", user?.id);
      if (credError) throw credError;
      const creditedCustomerIds = new Set((credits || []).map(c => c.customer_id));
      const filtered = (customers || []).filter(c => creditedCustomerIds.has(c.id));
      setCustomers(filtered);
    } catch (error) {
      console.error("Error fetching customers with credit:", error);
      setCustomers([]);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Find the latest credit for the selected customer
      const customerId = parseInt(formData.get("customer_id"));
      const { data: credits } = await supabase
        .from("credits")
        .select("id")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1);
      const creditId = credits?.[0]?.id;
      if (!creditId) throw new Error("No credit found for this customer");
      const paymentData = {
        credit_id: creditId,
        amount: parseFloat(formData.get("amount")),
        payment_method: formData.get("payment_method"),
        payment_date: formData.get("payment_date"),
        created_by: user?.id,
      };
      const { error } = await supabase
        .from("payments")
        .insert([paymentData]);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      setIsAddDialogOpen(false);
      fetchPayments();
      e.target.reset();
    } catch (error) {
      console.error("Error adding payment:", error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const filteredPayments = payments.filter(payment =>
    payment.credits?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.payment_method?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Payments</h1>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Track payment transactions</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
              <DialogDescription>
                Fill in the payment details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer</Label>
                <Input
                  type="text"
                  placeholder="Search customer..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="mb-2"
                />
                <select name="customer_id" required className="w-full p-2 border rounded">
                  <option value="">Select customer</option>
                  {(Array.isArray(customers) ? customers : [])
                    .filter(c => {
                      if (!c) return false;
                      const nameMatch = typeof c.name === 'string' && c.name.toLowerCase().includes(customerSearch.toLowerCase());
                      const phoneMatch = typeof c.phone === 'string' && c.phone.toLowerCase().includes(customerSearch.toLowerCase());
                      return nameMatch || phoneMatch;
                    })
                    .map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone ? `(${customer.phone})` : ""}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter payment amount"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select name="payment_method" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  name="payment_date"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Record Payment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search payments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? "No payments match your search." : "Start by recording your first payment."}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold">
                          {payment.credits?.customers?.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="font-bold text-lg text-green-600">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Credit Amount: {formatCurrency(payment.credits?.amount || 0)}</span>
                      </div>
                      {payment.credits?.description && (
                        <span>({payment.credits.description})</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Paid on: {formatDate(payment.payment_date)}</span>
                      </div>
                      <span>Method: {payment.payment_method?.toUpperCase()}</span>
                      <span>Payment ID: #{payment.id}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Payments;