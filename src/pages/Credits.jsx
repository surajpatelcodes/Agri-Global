import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Plus, Search, CreditCard, User, Calendar as CalendarIcon, DollarSign, ArrowLeft, Check, ChevronsUpDown, CheckCircle2, Pencil, Wallet, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";

const Credits = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPartialPaymentDialogOpen, setIsPartialPaymentDialogOpen] = useState(false);
  const [selectedCreditForPartial, setSelectedCreditForPartial] = useState(null);
  const [partialPaymentDate, setPartialPaymentDate] = useState(new Date());
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [defaulterConfirmOpen, setDefaulterConfirmOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [creditHistoryDialogOpen, setCreditHistoryDialogOpen] = useState(false);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null);
  const [creditHistoryData, setCreditHistoryData] = useState([]);
  const [creditHistoryLoading, setCreditHistoryLoading] = useState(false);
  const [markPaidConfirmOpen, setMarkPaidConfirmOpen] = useState(false);
  const [selectedCreditForMarkPaid, setSelectedCreditForMarkPaid] = useState(null);

  // New states for payment from history
  const [historyPartialPaymentOpen, setHistoryPartialPaymentOpen] = useState(false);
  const [historyPartialAmount, setHistoryPartialAmount] = useState("");
  const [historyPartialDate, setHistoryPartialDate] = useState(new Date());
  const [historyPartialMethod, setHistoryPartialMethod] = useState("cash");
  const [historyPartialConfirmOpen, setHistoryPartialConfirmOpen] = useState(false);

  // New states for edit credit transaction
  const [editCreditOpen, setEditCreditOpen] = useState(false);
  const [selectedCreditForEdit, setSelectedCreditForEdit] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPasswordConfirmOpen, setEditPasswordConfirmOpen] = useState(false);
  const [editPassword, setEditPassword] = useState("");

  // New states for individual transaction partial payment
  const [transactionPartialPaymentOpen, setTransactionPartialPaymentOpen] = useState(false);
  const [selectedCreditForTransactionPartial, setSelectedCreditForTransactionPartial] = useState(null);
  const [transactionPartialAmount, setTransactionPartialAmount] = useState("");
  const [transactionPartialDate, setTransactionPartialDate] = useState(new Date());
  const [transactionPartialMethod, setTransactionPartialMethod] = useState("cash");
  const [editLoading, setEditLoading] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get("openIssue") === "true") {
      setIsAddDialogOpen(true);
    }
  }, [searchParams]);

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
      logger.log("Fetching credit history for customer:", customerId, "user:", user.id);

      const { data, error } = await supabase.rpc('get_customer_credit_history', {
        customer_id: customerId,
        user_id: user.id
      });

      logger.log("Credit history response:", { data, error });

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
    let userId;

    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        userId = user.id;
        creditsSubscription = supabase
          .channel('credits-changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'credits',
            filter: `issued_by=eq.${userId}`
          }, () => {
            refetch();
          })
          .subscribe();
      } catch (err) {
        console.error("Error setting up subscription:", err);
      }
    };

    setupSubscription();

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
      queryClient.invalidateQueries({ queryKey: ['credits-summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['customers-with-credit'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'active' });
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

      queryClient.invalidateQueries({ queryKey: ['credits-summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['customers-with-credit'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'active' });
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
      queryClient.invalidateQueries({ queryKey: ['credits-summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['customers-with-credit'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'active' });
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
      queryClient.invalidateQueries({ queryKey: ['credits-summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'active' });
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



  const handleMarkAsPaid = async () => {
    if (!selectedCreditForMarkPaid) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('mark_credit_as_paid', {
        p_credit_id: selectedCreditForMarkPaid.id,
        p_user_id: user.id
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message);

      toast({
        title: "Success",
        description: `Credit marked as paid. Recorded payment of ${formatCurrency(data.amount_paid)}`,
      });

      setMarkPaidConfirmOpen(false);
      setSelectedCreditForMarkPaid(null);

      // Refresh data
      if (selectedCustomerHistory) {
        await fetchCreditHistory(selectedCustomerHistory.customer_id);
      }
      queryClient.invalidateQueries({ queryKey: ['credits-summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['customers-with-credit'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['customers-with-transactions'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'active' });

    } catch (error) {
      console.error("Error marking credit as paid:", error);
      toast({
        title: "Error",
        description: "Failed to mark credit as paid: " + error.message,
        variant: "destructive",
      });
    }
  };

  // Handle payment from credit history - auto-distribute to pending credits
  const handleHistoryPartialPayment = async () => {
    if (!historyPartialAmount || !selectedCustomerHistory) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const paymentAmount = parseFloat(historyPartialAmount);

      if (paymentAmount <= 0) {
        toast({
          title: "Error",
          description: "Payment amount must be greater than 0",
          variant: "destructive",
        });
        return;
      }

      // Get the first pending credit to link the payment to
      const pendingCredits = creditHistoryData.filter(c => c.status !== 'paid');
      if (pendingCredits.length === 0) {
        toast({
          title: "Error",
          description: "No pending credits found for this customer",
          variant: "destructive",
        });
        return;
      }

      // Link payment to the oldest pending credit
      const targetCredit = pendingCredits[pendingCredits.length - 1]; // oldest first

      // Insert payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          credit_id: targetCredit.id,
          amount: paymentAmount,
          payment_date: format(historyPartialDate, "yyyy-MM-dd"),
          payment_method: historyPartialMethod,
          created_by: user?.id
        }]);

      if (paymentError) throw paymentError;

      // Update credit status to partial
      const { error: statusError } = await supabase
        .from("credits")
        .update({ status: "partial" })
        .eq("id", targetCredit.id);

      if (statusError) throw statusError;

      toast({
        title: "Success",
        description: `Payment of ${formatCurrency(paymentAmount)} recorded successfully`,
      });

      // Reset states
      setHistoryPartialConfirmOpen(false);
      setHistoryPartialPaymentOpen(false);
      setHistoryPartialAmount("");
      setHistoryPartialDate(new Date());
      setHistoryPartialMethod("cash");

      // Refresh data
      if (selectedCustomerHistory) {
        await fetchCreditHistory(selectedCustomerHistory.customer_id);
      }
      queryClient.invalidateQueries({ queryKey: ['credits-summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['customers-with-credit'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['customers-with-transactions'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'active' });

    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: "Failed to record payment: " + error.message,
        variant: "destructive",
      });
    }
  };

  // Handle edit credit with password confirmation
  const handleEditCredit = async () => {
    if (!selectedCreditForEdit || !editPassword) return;

    setEditLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Verify password by re-authenticating
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: editPassword
      });

      if (authError) {
        toast({
          title: "Authentication Failed",
          description: "Incorrect password. Please try again.",
          variant: "destructive",
        });
        setEditLoading(false);
        return;
      }

      // Update credit
      const updateData = {};
      if (editAmount && parseFloat(editAmount) > 0) {
        updateData.amount = parseFloat(editAmount);
      }
      if (editDescription !== undefined) {
        updateData.description = editDescription;
      }

      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No Changes",
          description: "No changes were made to the credit.",
        });
        setEditLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("credits")
        .update(updateData)
        .eq("id", selectedCreditForEdit.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Credit transaction updated successfully",
      });

      // Reset states
      setEditPasswordConfirmOpen(false);
      setEditCreditOpen(false);
      setSelectedCreditForEdit(null);
      setEditAmount("");
      setEditDescription("");
      setEditPassword("");

      // Refresh data
      if (selectedCustomerHistory) {
        await fetchCreditHistory(selectedCustomerHistory.customer_id);
      }
      queryClient.invalidateQueries({ queryKey: ['credits-summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['customers-with-credit'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['customers-with-transactions'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'active' });

    } catch (error) {
      console.error("Error updating credit:", error);
      toast({
        title: "Error",
        description: "Failed to update credit: " + error.message,
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  // Handle partial payment for individual transaction from dropdown menu
  const handleTransactionPartialPayment = async () => {
    if (!transactionPartialAmount || !selectedCreditForTransactionPartial) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const paymentAmount = parseFloat(transactionPartialAmount);
      const outstandingAmount = selectedCreditForTransactionPartial.outstanding ?? selectedCreditForTransactionPartial.amount;

      if (paymentAmount <= 0) {
        toast({
          title: "Error",
          description: "Payment amount must be greater than 0",
          variant: "destructive",
        });
        return;
      }

      // Validate payment doesn't exceed outstanding amount
      if (paymentAmount > outstandingAmount) {
        toast({
          title: "Error",
          description: `Payment amount cannot exceed outstanding balance of ${formatCurrency(outstandingAmount)}`,
          variant: "destructive",
        });
        return;
      }

      // Insert payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          credit_id: selectedCreditForTransactionPartial.id,
          amount: paymentAmount,
          payment_date: format(transactionPartialDate, "yyyy-MM-dd"),
          payment_method: transactionPartialMethod,
          created_by: user?.id
        }]);

      if (paymentError) throw paymentError;

      // Update credit status to partial
      const { error: statusError } = await supabase
        .from("credits")
        .update({ status: "partial" })
        .eq("id", selectedCreditForTransactionPartial.id);

      if (statusError) throw statusError;

      toast({
        title: "Success",
        description: `Partial payment of ${formatCurrency(paymentAmount)} recorded successfully`,
      });

      // Reset states
      setTransactionPartialPaymentOpen(false);
      setSelectedCreditForTransactionPartial(null);
      setTransactionPartialAmount("");
      setTransactionPartialDate(new Date());
      setTransactionPartialMethod("cash");

      // Refresh data
      if (selectedCustomerHistory) {
        await fetchCreditHistory(selectedCustomerHistory.customer_id);
      }
      queryClient.invalidateQueries({ queryKey: ['credits-summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['customers-with-credit'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['customers-with-transactions'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'active' });

    } catch (error) {
      console.error("Error recording partial payment:", error);
      toast({
        title: "Error",
        description: "Failed to record partial payment: " + error.message,
        variant: "destructive",
      });
    }
  };

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
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerOpen}
                      className="w-full justify-between"
                    >
                      {selectedCustomerId
                        ? customers.find((customer) => String(customer.id) === selectedCustomerId)?.name
                        : "Select customer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => {
                                setSelectedCustomerId(String(customer.id));
                                setCustomerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCustomerId === String(customer.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {customer.name} {customer.id_proof ? `• ${customer.id_proof}` : ""}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <input type="hidden" name="customer_id" value={selectedCustomerId} />
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
                          {formatCurrency(creditSummary.outstanding_amount ?? creditSummary.total_credit_amount)}
                        </span>
                        {creditSummary.total_payments > 0 && (
                          <span className="text-sm text-gray-500">
                            (Paid: {formatCurrency(creditSummary.total_payments)})
                          </span>
                        )}
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

      {/* Mark as Paid Confirmation Dialog */}
      <AlertDialog open={markPaidConfirmOpen} onOpenChange={setMarkPaidConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Confirm Payment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this credit of <span className="font-bold text-gray-900">{selectedCreditForMarkPaid && formatCurrency(selectedCreditForMarkPaid.amount)}</span> as fully paid?
              <br /><br />
              This will record a payment for the remaining outstanding amount and update the credit status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setMarkPaidConfirmOpen(false);
              setSelectedCreditForMarkPaid(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsPaid}
              className="bg-green-600 hover:bg-green-700 focus:ring-green-600"
            >
              Mark as Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credit History Dialog */}
      <Dialog open={creditHistoryDialogOpen} onOpenChange={setCreditHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          {/* Sticky header: customer name */}
          <div className="sticky top-0 z-20 bg-white border-b shadow-sm transition-shadow dark:bg-slate-900">
            <DialogHeader className="p-4 relative pt-6 pr-12">
              <DialogTitle className="truncate">Credit History - {selectedCustomerHistory?.name}</DialogTitle>
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
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">
                              {formatCurrency(credit.outstanding ?? credit.amount)}
                            </p>
                            {credit.total_paid > 0 && (
                              <span className="text-sm text-green-600">
                                (Paid: {formatCurrency(credit.total_paid)})
                              </span>
                            )}
                          </div>
                          {credit.total_paid > 0 && (
                            <p className="text-xs text-gray-400">
                              Original: {formatCurrency(credit.amount)}
                            </p>
                          )}
                          <p className="text-sm text-gray-500">{formatDate(credit.created_at)}</p>
                          {credit.description && (
                            <p className="text-sm text-gray-600 mt-2">{credit.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={getStatusColor(credit.status)}>
                            {credit.status?.charAt(0).toUpperCase() + credit.status?.slice(1)}
                          </Badge>

                          {/* Three-dot Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {/* Mark as Paid option - only show if not already paid */}
                              {credit.status !== 'paid' && (
                                <DropdownMenuItem
                                  className="text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer"
                                  onClick={() => {
                                    setSelectedCreditForMarkPaid(credit);
                                    setMarkPaidConfirmOpen(true);
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}

                              {/* Partial Payment option - only show if not already paid */}
                              {credit.status !== 'paid' && (
                                <DropdownMenuItem
                                  className="text-orange-600 focus:text-orange-700 focus:bg-orange-50 cursor-pointer"
                                  onClick={() => {
                                    setSelectedCreditForTransactionPartial(credit);
                                    setTransactionPartialAmount("");
                                    setTransactionPartialDate(new Date());
                                    setTransactionPartialMethod("cash");
                                    setTransactionPartialPaymentOpen(true);
                                  }}
                                >
                                  <Wallet className="h-4 w-4 mr-2" />
                                  Partial Payment
                                </DropdownMenuItem>
                              )}

                              {credit.status !== 'paid' && <DropdownMenuSeparator />}

                              {/* Edit option - always available */}
                              <DropdownMenuItem
                                className="text-blue-600 focus:text-blue-700 focus:bg-blue-50 cursor-pointer"
                                onClick={() => {
                                  setSelectedCreditForEdit(credit);
                                  setEditAmount(String(credit.amount));
                                  setEditDescription(credit.description || "");
                                  setEditCreditOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Partial Payment Dialog */}
      <Dialog open={historyPartialPaymentOpen} onOpenChange={setHistoryPartialPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              Receive Payment
            </DialogTitle>
            <DialogDescription>
              Record a payment for {selectedCustomerHistory?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="history_partial_amount">Payment Amount (₹)</Label>
              <Input
                id="history_partial_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter payment amount"
                value={historyPartialAmount}
                onChange={(e) => setHistoryPartialAmount(e.target.value)}
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
                      !historyPartialDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {historyPartialDate ? format(historyPartialDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={historyPartialDate}
                    onSelect={setHistoryPartialDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={historyPartialMethod} onValueChange={setHistoryPartialMethod}>
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
              <Button
                className="flex-1"
                onClick={() => setHistoryPartialConfirmOpen(true)}
                disabled={!historyPartialAmount || parseFloat(historyPartialAmount) <= 0}
              >
                Receive Payment
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setHistoryPartialPaymentOpen(false);
                  setHistoryPartialAmount("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <AlertDialog open={historyPartialConfirmOpen} onOpenChange={setHistoryPartialConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-blue-600 flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Confirm Payment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to receive a payment of{" "}
              <span className="font-bold text-gray-900">
                {historyPartialAmount && formatCurrency(parseFloat(historyPartialAmount))}
              </span>
              {" "}from {selectedCustomerHistory?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHistoryPartialConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHistoryPartialPayment}
              className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
            >
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Credit Dialog */}
      <Dialog open={editCreditOpen} onOpenChange={setEditCreditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Edit Credit Transaction
            </DialogTitle>
            <DialogDescription>
              Modify the credit details. This requires password confirmation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Editing a credit transaction requires your account password for security.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_amount">Amount (₹)</Label>
              <Input
                id="edit_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter new amount"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                placeholder="Enter description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => setEditPasswordConfirmOpen(true)}
                disabled={!editAmount || parseFloat(editAmount) <= 0}
              >
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditCreditOpen(false);
                  setSelectedCreditForEdit(null);
                  setEditAmount("");
                  setEditDescription("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Confirmation Dialog for Edit */}
      <AlertDialog open={editPasswordConfirmOpen} onOpenChange={setEditPasswordConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600 flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Confirm Password
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please enter your account password to confirm this modification.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="confirm_password">Password</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Enter your password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setEditPasswordConfirmOpen(false);
              setEditPassword("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditCredit}
              disabled={!editPassword || editLoading}
              className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
            >
              {editLoading ? "Verifying..." : "Confirm & Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transaction Partial Payment Dialog (from dropdown menu) */}
      <Dialog open={transactionPartialPaymentOpen} onOpenChange={setTransactionPartialPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-orange-600" />
              Record Partial Payment
            </DialogTitle>
            <DialogDescription>
              Record a partial payment for this credit.
              <br />
              <span className="font-semibold">Outstanding: {selectedCreditForTransactionPartial && formatCurrency(selectedCreditForTransactionPartial.outstanding ?? selectedCreditForTransactionPartial.amount)}</span>
              {selectedCreditForTransactionPartial?.total_paid > 0 && (
                <span className="text-green-600 ml-2">
                  (Already paid: {formatCurrency(selectedCreditForTransactionPartial.total_paid)})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_partial_amount">Payment Amount (₹)</Label>
              <Input
                id="transaction_partial_amount"
                type="number"
                step="0.01"
                min="0"
                max={selectedCreditForTransactionPartial?.outstanding ?? selectedCreditForTransactionPartial?.amount}
                placeholder="Enter payment amount"
                value={transactionPartialAmount}
                onChange={(e) => setTransactionPartialAmount(e.target.value)}
              />
              {transactionPartialAmount && parseFloat(transactionPartialAmount) > (selectedCreditForTransactionPartial?.outstanding ?? selectedCreditForTransactionPartial?.amount ?? 0) && (
                <p className="text-sm text-red-500">
                  Amount exceeds outstanding balance of {formatCurrency(selectedCreditForTransactionPartial?.outstanding ?? selectedCreditForTransactionPartial?.amount)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !transactionPartialDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transactionPartialDate ? format(transactionPartialDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={transactionPartialDate}
                    onSelect={setTransactionPartialDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_payment_method">Payment Method</Label>
              <Select value={transactionPartialMethod} onValueChange={setTransactionPartialMethod}>
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
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={handleTransactionPartialPayment}
                disabled={
                  !transactionPartialAmount ||
                  parseFloat(transactionPartialAmount) <= 0 ||
                  parseFloat(transactionPartialAmount) > (selectedCreditForTransactionPartial?.outstanding ?? selectedCreditForTransactionPartial?.amount ?? 0)
                }
              >
                Record Payment
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTransactionPartialPaymentOpen(false);
                  setSelectedCreditForTransactionPartial(null);
                  setTransactionPartialAmount("");
                  setTransactionPartialDate(new Date());
                  setTransactionPartialMethod("cash");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Credits;