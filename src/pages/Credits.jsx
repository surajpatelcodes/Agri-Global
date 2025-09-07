import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, CreditCard, User, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Credits = () => {
  const [credits, setCredits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPartialPaymentDialogOpen, setIsPartialPaymentDialogOpen] = useState(false);
  const [selectedCreditForPartial, setSelectedCreditForPartial] = useState(null);
  const [partialPaymentDate, setPartialPaymentDate] = useState(new Date());
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [userId, setUserId] = useState("");
  const { toast } = useToast();
  useEffect(() => {
    let creditsSubscription;
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    fetchUser();
    fetchCredits();
    fetchCustomers();

    // Subscribe to real-time changes in credits table
    creditsSubscription = supabase
      .channel('credits-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'credits',
      }, (payload) => {
        fetchCredits();
      })
      .subscribe();

    return () => {
      if (creditsSubscription) supabase.removeChannel(creditsSubscription);
    };
  }, []);

  const fetchCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("credits")
        .select(`
          *,
          customers!inner (
            id,
            name,
            phone,
            created_by
          )
        `)
        .eq("customers.created_by", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCredits(data || []);
    } catch (error) {
      console.error("Error fetching credits:", error);
      toast({
        title: "Error",
        description: "Failed to fetch credits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, id_proof")
        .eq("created_by", user?.id)
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

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
      fetchCredits();
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

  const handleStatusChange = async (creditId, newStatus) => {
    if (newStatus === "partial") {
      // Open partial payment dialog instead of directly updating status
      const credit = credits.find(c => c.id === creditId);
      setSelectedCreditForPartial(credit);
      setIsPartialPaymentDialogOpen(true);
      return;
    }

    try {
      const { error } = await supabase
        .from("credits")
        .update({ status: newStatus })
        .eq("id", creditId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Credit status updated successfully",
      });

      fetchCredits();
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
      fetchCredits();
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const filteredCredits = credits.filter(credit =>
    credit.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    credit.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credits</h1>
          <p className="text-gray-600">Manage credit transactions</p>
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
          {filteredCredits.map((credit) => (
            <Card key={credit.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold">{credit.customers?.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="font-bold text-lg">
                          {formatCurrency(credit.amount)}
                        </span>
                      </div>
                    </div>
                    
                    {credit.description && (
                      <p className="text-gray-600 mb-3">{credit.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatDate(credit.created_at)}</span>
                      </div>
                      <span>ID: #{credit.id}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Badge className={getStatusColor(credit.status)}>
                      {credit.status.charAt(0).toUpperCase() + credit.status.slice(1)}
                    </Badge>
                    
                    <Select
                      key={`status-${credit.id}-${credit.status}`}
                      value={credit.status}
                      onValueChange={(value) => handleStatusChange(credit.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Update status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="defaulter">Defaulter</SelectItem>
                      </SelectContent>
                    </Select>
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
    </div>
  );
};

export default Credits;