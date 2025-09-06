import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, User, Phone, MapPin, Store, Users, Sparkles, IdCard } from "lucide-react";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

      const { error } = await supabase
        .from("customers")
        .insert([customerData]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Customer added successfully to the network",
      });

      setIsAddDialogOpen(false);
      fetchCustomers();
      e.target.reset();
    } catch (error) {
      console.error("Error adding customer:", error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const customerData = {
        name: formData.get("name"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        id_proof: formData.get("id_proof"),
      };

      const { error } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", editingCustomer.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Customer updated successfully",
      });

      setEditingCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error("Error updating customer:", error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Customer deleted successfully",
      });

      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const CustomerForm = ({ customer, onSubmit, title, description }) => (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Full Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={customer?.name || ""}
              placeholder="Enter customer's full name"
              className="h-11 border-gray-200 focus:border-green-500 transition-all duration-300"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={customer?.phone || ""}
              placeholder="Enter phone number"
              className="h-11 border-gray-200 focus:border-green-500 transition-all duration-300"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-semibold text-gray-700">Address</Label>
          <Input
            id="address"
            name="address"
            defaultValue={customer?.address || ""}
            placeholder="Enter complete address"
            className="h-11 border-gray-200 focus:border-green-500 transition-all duration-300"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="id_proof" className="text-sm font-semibold text-gray-700">ID Proof</Label>
          <Input
            id="id_proof"
            name="id_proof"
            defaultValue={customer?.id_proof || ""}
            placeholder="Aadhaar, PAN, Voter ID, etc."
            className="h-11 border-gray-200 focus:border-green-500 transition-all duration-300"
            required
          />
        </div>
        
        <Button type="submit" className="w-full h-12 btn-3d bg-gradient-primary hover:shadow-primary font-semibold">
          <Sparkles className="h-4 w-4 mr-2" />
          {customer ? "Update Customer" : "Add Customer"}
        </Button>
      </form>
    </div>
  );

  if (loading) {
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-gray-900">Customer Network</h1>
              <p className="text-gray-600 text-lg">Manage customers across all connected shops</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-200">
              <Store className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Cross-Shop Access</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">{customers.length} Total</span>
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
                Add a new customer to the cross-shop network. This customer will be visible to all connected shops.
              </DialogDescription>
            </DialogHeader>
            <CustomerForm onSubmit={handleAddCustomer} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Section */}
      <div className="flex items-center space-x-4">
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
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="card-3d hover-glow group cursor-pointer border-0 shadow-lg overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-heading text-gray-900 group-hover:text-green-600 transition-colors duration-300">
                        {customer.name}
                      </CardTitle>
                      <CardDescription className="text-gray-500 font-medium">
                        Customer ID: #{customer.id}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-blue-50 rounded-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomer(customer);
                      }}
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-50 rounded-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomer(customer.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {customer.phone && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer.phone}</p>
                      <p className="text-xs text-gray-500">Phone Number</p>
                    </div>
                  </div>
                )}
                
                {customer.address && (
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl">
                    <div className="p-2 bg-blue-100 rounded-lg mt-0.5">
                      <MapPin className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer.address}</p>
                      <p className="text-xs text-gray-500">Address</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1 rounded-xl">
                    <IdCard className="h-3 w-3 mr-1" />
                    {customer.id_proof}
                  </Badge>
                  
                  <div className="text-xs text-gray-400">
                    Added {new Date(customer.created_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
              Update customer information in the cross-shop network.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm customer={editingCustomer} onSubmit={handleEditCustomer} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;