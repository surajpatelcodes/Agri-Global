import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, AlertCircle, CheckCircle2, RefreshCw, User } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

const GlobalSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Debounce the search term for real-time validation
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Validate Aadhar format in real-time
  const isValidAadhar = useMemo(() => {
    if (!debouncedSearchTerm) return true; // Don't show error for empty input
    return /^\d{12}$/.test(debouncedSearchTerm.trim());
  }, [debouncedSearchTerm]);

  // Update validation error message
  useMemo(() => {
    if (!searchTerm) {
      setValidationError("");
    } else if (!isValidAadhar) {
      setValidationError("Aadhar number must be exactly 12 digits");
    } else {
      setValidationError("");
    }
  }, [searchTerm, isValidAadhar]);

  const handleSearch = async () => {
    const trimmedSearch = searchTerm.trim();

    if (!trimmedSearch) {
      toast({
        title: "Error",
        description: "Please enter an Aadhar card number to search",
        variant: "destructive",
      });
      return;
    }

    if (!isValidAadhar) {
      toast({
        title: "Invalid Aadhar Number",
        description: "Aadhar number must be exactly 12 digits",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // Phase 4: Use enhanced global search function
      const { data, error } = await supabase
        .rpc("global_search", {
          p_aadhar_no: trimmedSearch
        });

      if (error) {
        throw error;
      }

      // Check if customer was found
      if (!data) {
        setSearchResult(null);
        toast({
          title: "No Results",
          description: "No customer found with this Aadhar number",
        });
        return;
      }

      setSearchResult(data);
      toast({
        title: "Search Complete",
        description: "Enhanced customer information retrieved successfully",
      });

    } catch (error) {
      console.error("Error searching customer:", error);
      toast({
        title: "Error",
        description: "Failed to search customer data. Please try again.",
        variant: "destructive",
      });
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Refresh the search results to get latest data
  const handleRefresh = async () => {
    if (!searchResult || !searchTerm) return;
    
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .rpc("check_customer_credit_status", {
          _aadhar_number: searchTerm.trim()
        });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0 || data[0]?.outstanding_range === 'No Credit History') {
        setSearchResult(null);
        toast({
          title: "No Results",
          description: "No customer found with this Aadhar number",
        });
        return;
      }

      setSearchResult(data[0]);
      toast({
        title: "Refreshed",
        description: "Customer information updated with latest data",
      });
    } catch (error) {
      console.error("Error refreshing customer data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh customer data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'No Risk': return "bg-green-100 text-green-800";
      case 'Low Risk': return "bg-blue-100 text-blue-800";
      case 'Medium Risk': return "bg-yellow-100 text-yellow-800";
      case 'High Risk': return "bg-orange-100 text-orange-800";
      case 'Very High Risk': return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Global Customer Search</h1>
        <p className="text-gray-600">Search for any customer using their Aadhar card number</p>
      </div>

      {/* Search Section */}
      <Card className="border-2 focus-within:border-primary transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Search Customer
          </CardTitle>
          <CardDescription>
            Enter the 12-digit Aadhar card number to view customer transaction summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  placeholder="Enter 12-digit Aadhar number..."
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                    setSearchTerm(value);
                  }}
                  maxLength={12}
                  className={`text-lg h-12 pr-10 ${
                    searchTerm && (isValidAadhar ? 'border-green-500' : 'border-destructive')
                  }`}
                  aria-label="Aadhar number input"
                  aria-invalid={!!validationError}
                  aria-describedby={validationError ? "aadhar-error" : undefined}
                />
                {searchTerm && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isValidAadhar ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {validationError && (
                <p id="aadhar-error" className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {validationError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {searchTerm.length}/12 digits entered
              </p>
            </div>
            <Button 
              type="submit"
              disabled={loading || !isValidAadhar}
              className="w-full h-11 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Customer
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <>
          {searchResult ? (
            <div className="space-y-6">
              {/* Phase 4: Enhanced Global Search Results */}

              {/* Global Identity */}
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-blue-900">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    Global Customer Identity
                  </CardTitle>
                  <CardDescription>
                    Unified customer profile across all shops
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Aadhar Number</p>
                      <p className="text-lg font-semibold text-blue-900">{searchResult.global_customer.aadhar_no}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Name</p>
                      <p className="text-lg font-semibold text-blue-900">{searchResult.global_customer.name || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Phone</p>
                      <p className="text-lg font-semibold text-blue-900">{searchResult.global_customer.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shop Profiles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Shop Profiles ({searchResult.shop_profiles?.length || 0} shops)
                  </CardTitle>
                  <CardDescription>
                    Customer exists in these shops
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {searchResult.shop_profiles && searchResult.shop_profiles.length > 0 ? (
                    <div className="space-y-4">
                      {searchResult.shop_profiles.map((shop, index) => (
                        <div key={index} className={`p-4 rounded-lg border-2 ${shop.has_defaulter_credit ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${shop.has_defaulter_credit ? 'bg-red-100' : 'bg-green-100'}`}>
                                <User className={`h-4 w-4 ${shop.has_defaulter_credit ? 'text-red-600' : 'text-green-600'}`} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">Shop #{shop.shop_id}</p>
                                <p className="text-sm text-gray-600">{shop.customer_name}</p>
                              </div>
                            </div>
                            {shop.has_defaulter_credit && (
                              <Badge className="bg-red-100 text-red-800 border-red-300">
                                DEFAULTER
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Total Credit</p>
                              <p className="font-semibold text-green-600">₹{shop.total_credits.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Total Paid</p>
                              <p className="font-semibold text-blue-600">₹{shop.total_payments.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Outstanding</p>
                              <p className={`font-semibold ${shop.outstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                ₹{shop.outstanding.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No shop profiles found</p>
                  )}
                </CardContent>
              </Card>

              {/* Defaulter Transactions - Detailed View */}
              {searchResult.defaulter_transactions && searchResult.defaulter_transactions.length > 0 && (
                <Card className="border-red-300 bg-red-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-900">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Defaulter Transactions ({searchResult.defaulter_transactions.length})
                    </CardTitle>
                    <CardDescription className="text-red-700">
                      Detailed credit and payment information for defaulter accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {searchResult.defaulter_transactions.map((transaction, index) => (
                        <div key={index} className="border border-red-200 rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-semibold text-gray-900">Credit #{transaction.credit_id}</p>
                              <p className="text-sm text-gray-600">Shop #{transaction.shop_id} • {transaction.customer_name}</p>
                            </div>
                            <Badge className="bg-red-100 text-red-800">DEFAULTER</Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500">Credit Amount</p>
                              <p className="font-semibold text-lg text-red-600">₹{transaction.amount.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Total Paid</p>
                              <p className="font-semibold text-lg text-blue-600">₹{transaction.total_paid.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Outstanding</p>
                              <p className="font-semibold text-lg text-orange-600">₹{transaction.outstanding.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Issued Date</p>
                              <p className="font-semibold text-sm text-gray-900">
                                {new Date(transaction.issued_date).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          </div>

                          {/* Payment History */}
                          {transaction.payments && transaction.payments.length > 0 ? (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Payment History</p>
                              <div className="space-y-2">
                                {transaction.payments.map((payment, pIndex) => (
                                  <div key={pIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                    <div>
                                      <p className="font-medium text-green-600">₹{payment.amount.toFixed(2)}</p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(payment.payment_date).toLocaleDateString('en-IN')} • {payment.payment_method}
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">Payment #{payment.payment_id}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No payments recorded</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Phase 5: Global Credit Behaviour Section */}
              <Card className={`border-2 ${
                searchResult.defaulter_insights?.risk_level === 'high' ? 'border-red-300 bg-red-50' :
                searchResult.defaulter_insights?.risk_level === 'medium' ? 'border-yellow-300 bg-yellow-50' :
                'border-green-300 bg-green-50'
              }`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      searchResult.defaulter_insights?.risk_level === 'high' ? 'bg-red-100' :
                      searchResult.defaulter_insights?.risk_level === 'medium' ? 'bg-yellow-100' :
                      'bg-green-100'
                    }`}>
                      <AlertCircle className={`h-5 w-5 ${
                        searchResult.defaulter_insights?.risk_level === 'high' ? 'text-red-600' :
                        searchResult.defaulter_insights?.risk_level === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">Global Credit Behaviour</div>
                      <div className="text-sm text-gray-600">
                        {searchResult.defaulter_insights?.total_shops_marking_defaulter > 0
                          ? `Defaulter in ${searchResult.defaulter_insights.total_shops_marking_defaulter} shop${searchResult.defaulter_insights.total_shops_marking_defaulter !== 1 ? 's' : ''}`
                          : 'Clean credit history across all shops'
                        }
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <p className="text-2xl font-bold text-red-600">
                        ₹{searchResult.defaulter_insights?.total_outstanding_all_shops?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-gray-600">Total Outstanding</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <p className="text-2xl font-bold text-orange-600">
                        {searchResult.defaulter_insights?.total_overdue_credits || 0}
                      </p>
                      <p className="text-xs text-gray-600">Overdue Credits</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <p className="text-2xl font-bold text-blue-600">
                        {searchResult.defaulter_insights?.days_since_last_repayment ?
                          `${Math.floor(searchResult.defaulter_insights.days_since_last_repayment)} days` :
                          'N/A'
                        }
                      </p>
                      <p className="text-xs text-gray-600">Since Last Payment</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <p className="text-2xl font-bold text-purple-600">
                        {searchResult.defaulter_insights?.number_of_default_events || 0}
                      </p>
                      <p className="text-xs text-gray-600">Default Events</p>
                    </div>
                  </div>

                  {/* Risk Level Badge */}
                  <div className="flex justify-center mb-4">
                    <Badge className={`px-4 py-2 text-sm font-semibold ${
                      searchResult.defaulter_insights?.risk_level === 'high' ? 'bg-red-100 text-red-800 border-red-300' :
                      searchResult.defaulter_insights?.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                      'bg-green-100 text-green-800 border-green-300'
                    }`}>
                      {searchResult.defaulter_insights?.risk_level === 'high' ? 'High Risk' :
                       searchResult.defaulter_insights?.risk_level === 'medium' ? 'Medium Risk' :
                       'Low Risk'}
                    </Badge>
                  </div>

                  {/* Per-Shop Risk Indicators */}
                  {searchResult.shop_profiles && searchResult.shop_profiles.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Per-Shop Risk Assessment</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchResult.shop_profiles.map((shop, index) => (
                          <div key={index} className={`p-3 rounded-lg border-2 ${
                            shop.has_defaulter_credit ? 'border-red-300 bg-red-50' :
                            shop.outstanding > 1000 ? 'border-yellow-300 bg-yellow-50' :
                            'border-green-300 bg-green-50'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">Shop #{shop.shop_id}</span>
                              <Badge className={`text-xs ${
                                shop.has_defaulter_credit ? 'bg-red-100 text-red-700' :
                                shop.outstanding > 1000 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {shop.has_defaulter_credit ? 'Defaulter' :
                                 shop.outstanding > 1000 ? 'High Outstanding' :
                                 'Good Standing'}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              Outstanding: <span className="font-semibold">₹{shop.outstanding.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transaction History Accordion */}
              {searchResult.defaulter_transactions && searchResult.defaulter_transactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Transaction History ({searchResult.defaulter_transactions.length} defaulter credits)
                    </CardTitle>
                    <CardDescription>
                      Complete transaction timeline across all shops
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {searchResult.defaulter_transactions.map((transaction, index) => (
                        <details key={index} className="border border-gray-200 rounded-lg">
                          <summary className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-lg">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">Credit #{transaction.credit_id}</p>
                                <p className="text-sm text-gray-600">Shop #{transaction.shop_id} • {transaction.customer_name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-red-600">₹{transaction.outstanding.toFixed(2)} due</p>
                              <p className="text-xs text-gray-500">
                                {new Date(transaction.issued_date).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          </summary>
                          <div className="px-4 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pt-4 border-t">
                              <div>
                                <p className="text-xs text-gray-500">Credit Amount</p>
                                <p className="font-semibold text-lg">₹{transaction.amount.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Total Paid</p>
                                <p className="font-semibold text-lg text-green-600">₹{transaction.total_paid.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Outstanding</p>
                                <p className="font-semibold text-lg text-red-600">₹{transaction.outstanding.toFixed(2)}</p>
                              </div>
                            </div>

                            {transaction.payments && transaction.payments.length > 0 ? (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-3">Payment Timeline</p>
                                <div className="space-y-2">
                                  {transaction.payments
                                    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
                                    .map((payment, pIndex) => (
                                    <div key={pIndex} className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                                      <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <div>
                                          <p className="font-medium text-green-800">₹{payment.amount.toFixed(2)}</p>
                                          <p className="text-xs text-green-600">{payment.payment_method}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                          {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                                        </p>
                                        <p className="text-xs text-gray-500">Payment #{payment.payment_id}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">No payments recorded for this credit</p>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary Statistics */}
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Search Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{searchResult.shop_profiles?.length || 0}</p>
                      <p className="text-sm text-green-700">Total Shops</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {searchResult.shop_profiles?.filter(s => s.has_defaulter_credit).length || 0}
                      </p>
                      <p className="text-sm text-orange-700">Defaulter Shops</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{searchResult.defaulter_transactions?.length || 0}</p>
                      <p className="text-sm text-blue-700">Defaulter Credits</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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