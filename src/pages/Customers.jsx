import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, User, Phone, MapPin, Users, Sparkles, IdCard, CreditCard, ArrowLeft } from "lucide-react";

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [pendingEditData, setPendingEditData] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Open add-customer dialog when URL contains ?add=1 and clean up on close
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsAddDialogOpen(params.get('add') === '1');
  }, [location.search]);

  const handleDialogChange = (open) => {
    setIsAddDialogOpen(open);
    if (!open) {
      const params = new URLSearchParams(location.search);
      params.delete('add');
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  };

  // Fetch customers with transactions using optimized SQL function
  const fetchCustomersWithTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase.rpc('get_customer_transactions', {
      user_id: user.id
    });

    if (error) throw error;
    return data || [];
  };

  // Use React Query for caching and automatic refetches
  const { data: customers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['customers-with-transactions'],
    queryFn: fetchCustomersWithTransactions,
    staleTime: 10 * 60 * 1000,      // 10 minutes fresh
    gcTime: 30 * 60 * 1000,          // 30 minutes cache retention
    retry: 2,
    refetchOnWindowFocus: false,     // Already disabled in queryClient
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
          // Refetch on changes (will use cache if fresh)
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

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const customerData = {
        name: formData.get("name"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        id_proof: formData.get("id_proof"),
        created_by: user?.id,
      };

      // Check if customer with this Aadhaar already exists
      const { data: existingCustomer, error: checkError } = await supabase
        .from("customers")
        .select("id, name, phone, created_by")
        .eq("id_proof", customerData.id_proof)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingCustomer) {
        toast({
          title: "Customer Already Exists",
          description: `A customer with this Aadhaar already exists: ${existingCustomer.name} (${existingCustomer.phone}). ${existingCustomer.created_by === user.id ? 'You can now issue credits to them.' : 'This is a shared customer available across all shops.'}`,
          duration: 5000,
        });
        setIsAddDialogOpen(false);
        e.target.reset();
        queryClient.invalidateQueries({ queryKey: ['customers-with-transactions'] });
        return;
      }

      // Create new customer if doesn't exist
      const { error } = await supabase
        .from("customers")
        .insert([customerData]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Customer added successfully and is now available to all shops",
      });

      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['customers-with-transactions'] });
      e.target.reset();
    } catch (error) {
      console.error("Error adding customer:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add customer",
        variant: "destructive",
      });
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const customerData = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      address: formData.get("address"),
      id_proof: formData.get("id_proof"),
    };

    // Store the data and show confirmation
    setPendingEditData(customerData);
    setEditConfirmOpen(true);
  };

  const confirmEditCustomer = async () => {
    try {
      const { error } = await supabase
        .from("customers")
        .update(pendingEditData)
        .eq("id", editingCustomer.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Customer updated successfully",
      });

      setEditingCustomer(null);
      setEditConfirmOpen(false);
      setPendingEditData(null);
      queryClient.invalidateQueries({ queryKey: ['customers-with-transactions'] });
    } catch (error) {
      console.error("Error updating customer:", error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
      setEditConfirmOpen(false);
    }
  };

  const handleDeleteCustomer = (customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteCustomer = async () => {
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerToDelete.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Customer deleted successfully",
      });

      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['customers-with-transactions'] });
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
      setDeleteConfirmOpen(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const CustomerForm = ({ customer, onSubmit, title, description }) => {
    const [errors, setErrors] = useState({});

    const validateForm = (formData) => {
      const newErrors = {};
      const name = formData.get("name");
      const phone = formData.get("phone");
      const address = formData.get("address");
      const idProof = formData.get("id_proof");

      if (name && name.length < 5) {
        newErrors.name = "Name must be at least 5 characters";
      }
      if (phone && !/^[6-9]\d{9}$/.test(phone)) {
        newErrors.phone = "Please enter a valid 10-digit Indian mobile number";
      }
      if (address && address.length < 10) {
        newErrors.address = "Address must be at least 10 characters";
      }
      if (idProof && !/^\d{12}$/.test(idProof)) {
        newErrors.idProof = "Aadhaar number must be exactly 12 digits";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      if (validateForm(formData)) {
        onSubmit(e);
        setErrors({});
      }
    };

    return (
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={customer?.name || ""}
                placeholder="Enter customer's full name"
                className="h-11 border-gray-200 focus:border-green-500 transition-all duration-300"
                minLength={5}
                maxLength={100}
                required
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={customer?.phone || ""}
                placeholder="10-digit mobile number"
                className="h-11 border-gray-200 focus:border-green-500 transition-all duration-300"
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                required
              />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-semibold text-gray-700">
              Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="address"
              name="address"
              defaultValue={customer?.address || ""}
              placeholder="Enter complete address (min 10 characters)"
              className="h-11 border-gray-200 focus:border-green-500 transition-all duration-300"
              minLength={10}
              maxLength={500}
              required
            />
            {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="id_proof" className="text-sm font-semibold text-gray-700">
              Aadhaar Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="id_proof"
              name="id_proof"
              type="tel"
              defaultValue={customer?.id_proof || ""}
              placeholder="12-digit Aadhaar number"
              className="h-11 border-gray-200 focus:border-green-500 transition-all duration-300"
              maxLength={12}
              pattern="[0-9]{12}"
              required
            />
            {errors.idProof && <p className="text-xs text-red-500">{errors.idProof}</p>}
          </div>
          
          <Button type="submit" className="w-full h-12 btn-3d bg-gradient-primary hover:shadow-primary font-semibold">
            <Sparkles className="h-4 w-4 mr-2" />
            {customer ? "Update Customer" : "Add Customer"}
          </Button>
        </form>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="responsive-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
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
        <h1 className="text-2xl font-bold text-gray-900">My Customers</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="text-red-600 font-semibold">Error loading customers</div>
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
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/#dashboard')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-gray-900">My Customers</h1>
              <p className="text-gray-600 text-lg">Manage your customers and their transactions</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">{customers.length} Customers</span>
            </div>
          </div>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-3d bg-gradient-primary hover:shadow-primary px-6 py-3 h-auto">
              <Plus className="h-5 w-5 mr-2" />
              <span className="font-semibold">Add Customer</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-heading flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                Add New Customer
              </DialogTitle>
              <DialogDescription className="text-base">
                Add a new customer to your customer list and manage their transactions.
              </DialogDescription>
            </DialogHeader>
            <CustomerForm onSubmit={handleAddCustomer} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search customers by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 border-gray-200 focus:border-green-500 transition-all duration-300 rounded-xl"
          />
        </div>
      </div>

      {/* Customer Grid */}
      {filteredCustomers.length === 0 ? (
        <Card className="card-3d hover-lift border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
                <User className="h-12 w-12 text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-semibold text-gray-900 mb-2">
                  {searchTerm ? "No customers found" : "No customers yet"}
                </h3>
                <p className="text-gray-500 text-base mb-6">
                  {searchTerm 
                    ? "Try adjusting your search terms or check spelling." 
                    : "Start building your customer network by adding your first customer."
                  }
                </p>
              </div>
              {!searchTerm && (
                <Button 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="btn-3d bg-gradient-primary hover:shadow-primary px-8 py-3 h-auto"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  <span className="font-semibold">Add Your First Customer</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="responsive-grid">
          {filteredCustomers.map((customer) => {
            return (
            <Card key={customer.id} className="card-3d hover-glow group cursor-pointer border-0 shadow-lg overflow-hidden flex flex-col h-full">
               <CardHeader className="pb-3 sm:pb-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl sm:rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base sm:text-lg md:text-xl font-heading text-gray-900 group-hover:text-green-600 transition-colors duration-300 truncate">
                          {customer.name}
                        </CardTitle>
                        {!customer.created_by_current_user && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-50 text-blue-600 border-blue-200">
                            Shared
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs sm:text-sm text-gray-500 font-medium truncate">
                        ID: #{customer.id}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-blue-50 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomer(customer);
                      }}
                      disabled={!customer.created_by_current_user}
                      title={!customer.created_by_current_user ? "Only the shop that created this customer can edit" : "Edit customer"}
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-50 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomer(customer);
                      }}
                      disabled={!customer.created_by_current_user}
                      title={!customer.created_by_current_user ? "Only the shop that created this customer can delete" : "Delete customer"}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 sm:space-y-4 flex-1">
                {customer.phone && (
                  <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl">
                    <div className="p-1.5 sm:p-2 bg-green-100 rounded-md sm:rounded-lg flex-shrink-0">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{customer.phone}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Phone Number</p>
                    </div>
                  </div>
                )}
                
                {customer.address && (
                  <div className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-md sm:rounded-lg mt-0.5 flex-shrink-0">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2">{customer.address}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Address</p>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-xs w-fit">
                    <IdCard className="h-3 w-3 mr-1" />
                    <span className="truncate">{customer.id_proof}</span>
                  </Badge>
                  
                  <div className="text-[10px] sm:text-xs text-gray-400">
                    Added {new Date(customer.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>

                {/* Transaction Summary */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
                  <div className="text-center p-1.5 sm:p-2 bg-blue-50 rounded-md sm:rounded-lg">
                    <div className="text-xs sm:text-sm font-semibold text-blue-600 truncate" title="Your total credit issued">₹{customer.total_credit.toFixed(0)}</div>
                    <div className="text-[10px] sm:text-xs text-blue-500">Your Credit</div>
                  </div>
                  <div className="text-center p-1.5 sm:p-2 bg-green-50 rounded-md sm:rounded-lg">
                    <div className="text-xs sm:text-sm font-semibold text-green-600 truncate" title="Your payments received">₹{customer.total_payments.toFixed(0)}</div>
                    <div className="text-[10px] sm:text-xs text-green-500">Your Paid</div>
                  </div>
                  <div className="text-center p-1.5 sm:p-2 bg-orange-50 rounded-md sm:rounded-lg">
                    <div className="text-xs sm:text-sm font-semibold text-orange-600 truncate" title="Outstanding from your shop">₹{customer.outstanding.toFixed(0)}</div>
                    <div className="text-[10px] sm:text-xs text-orange-500">Due</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
              Edit Customer
            </DialogTitle>
            <DialogDescription className="text-base">
              Update customer information and manage their transactions.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm customer={editingCustomer} onSubmit={handleEditCustomer} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Customer
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete <span className="font-semibold text-gray-900">{customerToDelete?.name}</span>?</p>
              <p className="text-sm text-red-600">This action cannot be undone. All associated records will be permanently deleted.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmOpen(false);
              setCustomerToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCustomer}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Confirmation Dialog */}
      <AlertDialog open={editConfirmOpen} onOpenChange={setEditConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
              <Edit className="h-5 w-5" />
              Confirm Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update <span className="font-semibold text-gray-900">{editingCustomer?.name}</span>'s information? This will modify their biodata records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setEditConfirmOpen(false);
              setPendingEditData(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEditCustomer}
              className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-600"
            >
              Confirm Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;