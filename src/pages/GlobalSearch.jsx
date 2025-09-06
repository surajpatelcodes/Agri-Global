import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, User, Phone, DollarSign, CreditCard, Loader2, AlertCircle } from "lucide-react";

const GlobalSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter an Aadhar card number to search",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setHasSearched(true);
    
    try {
      // Search by id_proof (Aadhar) in customers table
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id_proof", searchTerm.trim())
        .single();

      if (customerError && customerError.code !== 'PGRST116') {
        throw customerError;
      }

      if (!customerData) {
        setSearchResult(null);
        return;
      }

      // Get transaction summary using the outstanding view
      const { data: outstandingData, error: outstandingError } = await supabase
        .from("customer_outstanding")
        .select("*")
        .eq("customer_id", customerData.id)
        .single();

      if (outstandingError && outstandingError.code !== 'PGRST116') {
        console.error("Error fetching outstanding data:", outstandingError);
      }

      // Get recent credits
      const { data: creditsData, error: creditsError } = await supabase
        .from("credits")
        .select("*")
        .eq("customer_id", customerData.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (creditsError) {
        console.error("Error fetching credits:", creditsError);
      }

      // Get recent payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(`
          *,
          credits!inner(customer_id)
        `)
        .eq("credits.customer_id", customerData.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
      }

      setSearchResult({
        customer: customerData,
        outstanding: outstandingData,
        credits: creditsData || [],
        payments: paymentsData || []
      });

    } catch (error) {
      console.error("Error searching customer:", error);
      toast({
        title: "Error",
        description: "Failed to search customer data",
        variant: "destructive",
      });
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'paid': return "bg-green-100 text-green-800";
      case 'partial': return "bg-yellow-100 text-yellow-800";
      case 'pending': return "bg-orange-100 text-orange-800";
      case 'defaulter': return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Global Customer Search</h1>
        <p className="text-gray-600">Search for any customer using their Aadhar card number</p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Customer
          </CardTitle>
          <CardDescription>
            Enter the Aadhar card number to view customer transaction details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Enter Aadhar card number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="text-lg"
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <>
          {searchResult ? (
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-semibold text-lg">{searchResult.customer.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-semibold">{searchResult.customer.phone || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Customer ID</p>
                      <p className="font-semibold">#{searchResult.customer.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Aadhar Number</p>
                      <p className="font-semibold">{searchResult.customer.id_proof}</p>
                    </div>
                    {searchResult.customer.address && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-semibold">{searchResult.customer.address}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Summary */}
              {searchResult.outstanding && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Transaction Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-500">Total Credits</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(searchResult.outstanding.total_credit)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-500">Total Payments</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(searchResult.outstanding.total_payments)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-gray-500">Outstanding</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(searchResult.outstanding.outstanding)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Credits */}
              {searchResult.credits.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Recent Credits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {searchResult.credits.map((credit) => (
                        <div key={credit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold">{formatCurrency(credit.amount)}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(credit.created_at).toLocaleDateString('en-IN')}
                            </p>
                            {credit.description && (
                              <p className="text-sm text-gray-600">{credit.description}</p>
                            )}
                          </div>
                          <Badge className={getStatusBadgeColor(credit.status)}>
                            {credit.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Payments */}
              {searchResult.payments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Recent Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {searchResult.payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                            </p>
                            {payment.payment_method && (
                              <p className="text-sm text-gray-600">via {payment.payment_method}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customer found</h3>
                <p className="text-gray-500">
                  No customer found with the provided Aadhar card number.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default GlobalSearch;