import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, DollarSign, User, Calendar, CreditCard, ArrowLeft } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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
                id_proof,
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
        .select("id, name, phone, id_proof")
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
      // Find all credits for the selected customer
      const customerIdRaw = formData.get("customer_id");
      const customerId = customerIdRaw ? parseInt(customerIdRaw) : NaN;

      // Validation: customer must be selected
      if (!customerId || isNaN(customerId)) {
        toast({
          title: "Select customer",
          description: "Please select a customer before recording a payment.",
          variant: "destructive",
        });
        return;
      }
      const paymentAmount = parseFloat(formData.get("amount"));
      
      const { data: credits } = await supabase
        .from("credits")
        .select("id, amount, status")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      
      if (!credits || credits.length === 0) {
        throw new Error("No credit found for this customer");
      }

      // Calculate total outstanding
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("amount, credit_id")
        .in("credit_id", credits.map(c => c.id));

      const totalCredit = credits.reduce((sum, c) => sum + parseFloat(c.amount), 0);
      const totalPaid = (existingPayments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const outstanding = totalCredit - totalPaid;

      // Store payment data and show confirmation
      setPendingPaymentData({
        credit_id: credits[0].id,
        amount: paymentAmount,
        payment_method: formData.get("payment_method"),
        payment_date: formData.get("payment_date"),
        created_by: user?.id,
        customerId,
        isFullPayment: paymentAmount >= outstanding,
        outstanding
      });
      
      setPaymentConfirmOpen(true);
    } catch (error) {
      console.error("Error preparing payment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to prepare payment",
        variant: "destructive",
      });
    }
  };

  const confirmPayment = async () => {
    if (!pendingPaymentData) return;

    try {
      // Insert payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          credit_id: pendingPaymentData.credit_id,
          amount: pendingPaymentData.amount,
          payment_method: pendingPaymentData.payment_method,
          payment_date: pendingPaymentData.payment_date,
          created_by: pendingPaymentData.created_by
        }]);

      if (paymentError) throw paymentError;

      // Update credit status
      if (pendingPaymentData.isFullPayment) {
        // Mark as paid
        const { error: statusError } = await supabase
          .from("credits")
          .update({ status: "paid" })
          .eq("customer_id", pendingPaymentData.customerId);

        if (statusError) throw statusError;

        toast({
          title: "Success",
          description: "Full payment recorded successfully. Customer marked as paid.",
        });
      } else {
        // Mark as partial
        const { error: statusError } = await supabase
          .from("credits")
          .update({ status: "partial" })
          .eq("customer_id", pendingPaymentData.customerId);

        if (statusError) throw statusError;

        toast({
          title: "Success",
          description: "Partial payment recorded successfully. Payment status updated globally.",
        });
      }

      setPaymentConfirmOpen(false);
      setPendingPaymentData(null);
      setIsAddDialogOpen(false);
      setSelectedCustomerId("");
      fetchPayments();
      fetchCustomersWithCredit();
    } catch (error) {
      console.error("Error recording payment:", error);
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

  const filteredPayments = payments.filter(payment => {
    const term = searchTerm.toLowerCase();
    const name = payment.credits?.customers?.name?.toLowerCase() || '';
    const phone = payment.credits?.customers?.phone?.toLowerCase() || '';
    const aadhar = payment.credits?.customers?.id_proof?.toLowerCase() || '';
    const method = payment.payment_method?.toLowerCase() || '';
    return (
      name.includes(term) ||
      phone.includes(term) ||
      aadhar.includes(term) ||
      method.includes(term)
    );
  });

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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/#dashboard')}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-600">Track payment transactions</p>
          </div>
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
                <Select name="customer_id" required value={String(selectedCustomerId)} onValueChange={val => setSelectedCustomerId(val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <div className="px-2 py-2 sticky top-0 bg-white z-10">
                      <Input
                        type="text"
                        placeholder="Search customer..."
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        className="w-full border rounded px-2 py-1"
                        autoFocus
                      />
                    </div>
                    {(Array.isArray(customers) ? customers : [])
                      .filter(c => {
                        if (!c) return false;
                        const search = customerSearch.toLowerCase();
                        if (!search) return true;
                        const nameMatch = typeof c.name === 'string' && c.name.toLowerCase().includes(search);
                        const phoneMatch = typeof c.phone === 'string' && c.phone.toLowerCase().includes(search);
                        const aadharMatch = typeof c.id_proof === 'string' && c.id_proof.toLowerCase().includes(search);
                        return nameMatch || phoneMatch || aadharMatch;
                      })
                      .map((customer) => (
                        <SelectItem key={customer.id} value={String(customer.id)}>
                          {customer.name} {customer.phone ? `📞${customer.phone}` : ""} {customer.id_proof ? `• Aadhar ${customer.id_proof}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
              <Button type="submit" className="w-full" disabled={!selectedCustomerId}>
                Record Payment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Name,Phone,Addhar..."
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
                      <span className="ml-2">{payment.credits?.customers?.phone ? `📞${payment.credits?.customers?.phone}` : ''}{payment.credits?.customers?.id_proof ? ` • Aadhar ${payment.credits?.customers?.id_proof}` : ''}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Confirmation Dialog */}
      <AlertDialog open={paymentConfirmOpen} onOpenChange={setPaymentConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <DollarSign className="h-5 w-5" />
              Confirm Payment
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to record this payment?</p>
              {pendingPaymentData && (
                <>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                    <p><span className="font-semibold">Amount:</span> {pendingPaymentData.amount && new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(pendingPaymentData.amount)}</p>
                    <p><span className="font-semibold">Outstanding:</span> {pendingPaymentData.outstanding && new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(pendingPaymentData.outstanding)}</p>
                    <p><span className="font-semibold">Payment Type:</span> {pendingPaymentData.isFullPayment ? 'Full Payment' : 'Partial Payment'}</p>
                  </div>
                  {pendingPaymentData.isFullPayment && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ This will mark the customer as paid and remove them from Outstanding and Credits sections.
                    </p>
                  )}
                  {!pendingPaymentData.isFullPayment && (
                    <p className="text-sm text-orange-600 font-medium">
                      ⚠ This is a partial payment. The payment status will be updated globally.
                    </p>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPaymentConfirmOpen(false);
              setPendingPaymentData(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPayment}
              className="bg-green-600 hover:bg-green-700 focus:ring-green-600"
            >
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Payments;