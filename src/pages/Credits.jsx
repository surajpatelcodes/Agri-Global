import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, CreditCard, User, Calendar as CalendarIcon, DollarSign, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Credits = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPartialPaymentDialogOpen, setIsPartialPaymentDialogOpen] = useState(false);
  const [selectedCreditForPartial, setSelectedCreditForPartial] = useState(null);
  const [partialPaymentDate, setPartialPaymentDate] = useState(new Date());
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [defaulterConfirmOpen, setDefaulterConfirmOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [creditHistoryDialogOpen, setCreditHistoryDialogOpen] = useState(false);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null);
  const [creditHistoryData, setCreditHistoryData] = useState([]);
  const [creditHistoryLoading, setCreditHistoryLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch credits summary using optimized SQL function
  const fetchCreditsSummary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase.rpc('get_customer_credits_summary', {
      user_id: user.id
    });

    if (error) throw error;
    return data || [];
  };

  // Fetch customers with credit using optimized SQL function
  const fetchCustomersWithCredit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase.rpc('get_all_customers', {
      user_id: user.id
    });

    if (error) throw error;
    return data || [];
  };

  // Fetch customer credit history
  const fetchCreditHistory = async (customerId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    setCreditHistoryLoading(true);
    try {
      console.log("Fetching credit history for customer:", customerId, "user:", user.id);
      
      const { data, error } = await supabase.rpc('get_customer_credit_history', {
        customer_id: customerId,
        user_id: user.id
      });

      console.log("Credit history response:", { data, error });

      if (error) throw error;
      setCreditHistoryData(data || []);
    } catch (error) {
      console.error("Error fetching credit history:", error);
      toast({
        title: "Error",
        description: "Failed to fetch credit history: " + error.message,
        variant: "destructive",
      });
      setCreditHistoryData([]);
    } finally {
      setCreditHistoryLoading(false);
    }
  };

  // Use React Query for credits summary
  const { data: creditsSummary = [], isLoading, error, refetch } = useQuery({
    queryKey: ['credits-summary'],
    queryFn: fetchCreditsSummary,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Use React Query for customers with credit
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-with-credit'],
    queryFn: fetchCustomersWithCredit,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Subscribe to real-time changes
  useEffect(() => {
    let creditsSubscription;

    try {
      creditsSubscription = supabase
        .channel('credits-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'credits',
        }, () => {
          refetch();
        })
        .subscribe();
    } catch (err) {
      console.error("Error setting up subscription:", err);
    }

    return () => {
      if (creditsSubscription) supabase.removeChannel(creditsSubscription);
    };
  }, [refetch]);

  const handleAddCredit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const creditData = {
        customer_id: parseInt(formData.get("customer_id")),
        amount: parseFloat(formData.get("amount")),
        description: formData.get("description"),
        issued_by: user?.id,
        status: "pending"
      };

      const { error } = await supabase
        .from("credits")
        .insert([creditData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credit issued successfully",
      });

      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['credits-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-credit'] });
      e.target.reset();
    } catch (error) {
      console.error("Error adding credit:", error);
      toast({
        title: "Error",
        description: "Failed to issue credit",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (customerId, newStatus) => {
    if (newStatus === "partial") {
      // Open partial payment dialog instead of directly updating status
      const credit = creditsSummary.find(c => c.customer_id === customerId);
      setSelectedCreditForPartial(credit);
      setIsPartialPaymentDialogOpen(true);
      return;
    }

    // Show confirmation for defaulter status
    if (newStatus === "defaulter" || (newStatus === "pending" && creditsSummary.find(c => c.customer_id === customerId)?.status === "defaulter")) {
      setPendingStatusChange({ customerId, newStatus });
      setDefaulterConfirmOpen(true);
      return;
    }

    try {
      // Update all credits for this customer
      const { error } = await supabase
        .from("credits")
        .update({ status: newStatus })
        .eq("customer_id", customerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Customer ${newStatus === 'defaulter' ? 'marked as defaulter' : 'status updated'} successfully`,
      });

      queryClient.invalidateQueries({ queryKey: ['credits-summary'] });
    } catch (error) {
      console.error("Error updating credit status:", error);
      toast({
        title: "Error",
        description: "Failed to update credit status",
        variant: "destructive",
      });
    }
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;

    try {
      // Update all credits for this customer
      const { error } = await supabase
        .from("credits")
        .update({ status: pendingStatusChange.newStatus })
        .eq("customer_id", pendingStatusChange.customerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Customer ${pendingStatusChange.newStatus === 'defaulter' ? 'marked as defaulter' : 'defaulter status removed'} successfully`,
      });

      setDefaulterConfirmOpen(false);
      setPendingStatusChange(null);
      queryClient.invalidateQueries({ queryKey: ['credits-summary'] });
    } catch (error) {
      console.error("Error updating credit status:", error);
      toast({
        title: "Error",
        description: "Failed to update credit status",
        variant: "destructive",
      });
    }
  };

  const handlePartialPayment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const partialAmount = parseFloat(formData.get("partial_amount"));
      
      // Insert payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          credit_id: selectedCreditForPartial.id,
          amount: partialAmount,
          payment_date: format(partialPaymentDate, "yyyy-MM-dd"),
          payment_method: formData.get("payment_method") || "cash",
          created_by: user?.id
        }]);

      if (paymentError) throw paymentError;

      // Update credit status to partial
      const { error: statusError } = await supabase
        .from("credits")
        .update({ status: "partial" })
        .eq("id", selectedCreditForPartial.id);

      if (statusError) throw statusError;

      toast({
        title: "Success",
        description: "Partial payment recorded successfully",
      });

      setIsPartialPaymentDialogOpen(false);
      setSelectedCreditForPartial(null);
      queryClient.invalidateQueries({ queryKey: ['credits-summary'] });
      e.target.reset();
    } catch (error) {
      console.error("Error recording partial payment:", error);
      toast({
        title: "Error",
        description: "Failed to record partial payment",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "partial":
        return "bg-orange-100 text-orange-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "defaulter":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Aggregate credits array to determine an overall status for the customer
  const computeCustomerStatus = (credits = []) => {
    if (!Array.isArray(credits) || credits.length === 0) return 'paid';
    const statuses = new Set(credits.map(c => c.status));
    if (statuses.has('defaulter')) return 'defaulter';
    // If all paid
    if ([...statuses].every(s => s === 'paid')) return 'paid';
    if (statuses.has('partial')) return 'partial';
    if (statuses.has('pending')) return 'pending';
    // default to first credit's status
    return credits[0].status || 'paid';
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

  const filteredCredits = creditsSummary.filter(credit =>
    credit.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Credits</h1>
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

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Credits</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="text-red-600 font-semibold">Error loading credits</div>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
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
            <h1 className="text-2xl font-bold text-gray-900">Credits</h1>
            <p className="text-gray-600">Manage credit transactions</p>
          </div>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Issue Credit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue New Credit</DialogTitle>
              <DialogDescription>
                Fill in the credit details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCredit} className="space-y-4">
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
                        const aadharMatch = typeof c.id_proof === 'string' && c.id_proof.slice(-4).includes(search);
                        return nameMatch || phoneMatch || aadharMatch;
                      })
                      .map((customer) => (
                        <SelectItem key={customer.id} value={String(customer.id)}>
                          {customer.name} {customer.id_proof ? `•Aadhar ${customer.id_proof}` : ""}
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
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter credit description"
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">
                Issue Credit
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search credits..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredCredits.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No credits found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? "No credits match your search." : "Start by issuing your first credit."}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Issue Credit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCredits.map((creditSummary) => (
            <Card key={creditSummary.customer_id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold">{creditSummary.customer_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="font-bold text-lg">
                          {formatCurrency(creditSummary.total_credit_amount)}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {creditSummary.credit_count} {creditSummary.credit_count === 1 ? 'Credit' : 'Credits'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Phone: {creditSummary.customer_phone}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setSelectedCustomerHistory({ name: creditSummary.customer_name, customer_id: creditSummary.customer_id });
                        setCreditHistoryDialogOpen(true);
                        await fetchCreditHistory(creditSummary.customer_id);
                      }}
                    >
                      Credit History
                    </Button>

                    {/* Defaulter Toggle Button */}
                    <Button
                      variant={creditSummary.status === 'defaulter' ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newStatus = creditSummary.status === 'defaulter' ? 'pending' : 'defaulter';
                        handleStatusChange(creditSummary.customer_id, newStatus);
                      }}
                      className={creditSummary.status === 'defaulter' ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      {creditSummary.status === 'defaulter' ? 'Remove Defaulter' : 'Mark as Defaulter'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Partial Payment Dialog */}
      <Dialog open={isPartialPaymentDialogOpen} onOpenChange={setIsPartialPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Partial Payment</DialogTitle>
            <DialogDescription>
              Enter the partial payment details for {selectedCreditForPartial?.customers?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePartialPayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Credit Amount</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="font-semibold text-lg">
                  {selectedCreditForPartial && formatCurrency(selectedCreditForPartial.amount)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="partial_amount">Partial Payment Amount (₹)</Label>
              <Input
                id="partial_amount"
                name="partial_amount"
                type="number"
                step="0.01"
                min="0"
                max={selectedCreditForPartial?.amount}
                placeholder="Enter partial payment amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !partialPaymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {partialPaymentDate ? format(partialPaymentDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={partialPaymentDate}
                    onSelect={setPartialPaymentDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select name="payment_method" defaultValue="cash">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                Record Payment
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsPartialPaymentDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Defaulter Confirmation Dialog */}
      <AlertDialog open={defaulterConfirmOpen} onOpenChange={setDefaulterConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              {pendingStatusChange?.newStatus === 'defaulter' ? 'Mark as Defaulter' : 'Remove Defaulter Status'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusChange?.newStatus === 'defaulter'
                ? 'Are you sure you want to mark this customer as a defaulter? This will affect their credit status across all their credits and will be visible in global search. This action can be reversed later.'
                : 'Are you sure you want to remove the defaulter status from this customer? This will restore their normal credit status.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDefaulterConfirmOpen(false);
              setPendingStatusChange(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {pendingStatusChange?.newStatus === 'defaulter' ? 'Mark as Defaulter' : 'Remove Defaulter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credit History Dialog */}
      <Dialog open={creditHistoryDialogOpen} onOpenChange={setCreditHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          {/* Sticky header: customer name + aggregated status stays fixed */}
          <div className="sticky top-0 z-20 bg-white border-b shadow-sm transition-shadow dark:bg-slate-900">
            <DialogHeader className="p-4 relative pt-6">
              <div className="flex items-center gap-3">
                <DialogTitle>Credit History - {selectedCustomerHistory?.name}</DialogTitle>
              </div>
              <DialogDescription>
                Complete credit transaction history for this customer
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable transactions list */}
          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 6.5rem)' }}>
            {creditHistoryLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : creditHistoryData.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No credits found for this customer</p>
              </div>
            ) : (
              <div className="space-y-4">
                {creditHistoryData.map((credit) => (
                  <Card key={credit.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-lg">{formatCurrency(credit.amount)}</p>
                          <p className="text-sm text-gray-500">{formatDate(credit.created_at)}</p>
                          {credit.description && (
                            <p className="text-sm text-gray-600 mt-2">{credit.description}</p>
                          )}
                        </div>
                        <Badge className={getStatusColor(credit.status)}>
                          {credit.status?.charAt(0).toUpperCase() + credit.status?.slice(1)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Credits;