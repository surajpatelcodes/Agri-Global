import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
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
      // Use privacy-preserving credit check function
      const { data, error } = await supabase
        .rpc("check_customer_credit_status", {
          _aadhar_number: trimmedSearch
        });

      if (error) {
        throw error;
      }

      // Check if customer was found - if outstanding_range is "No Credit History", customer doesn't exist
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
        title: "Search Complete",
        description: "Customer information retrieved successfully",
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
              {/* Credit Status Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      {searchResult.customer_name} - Credit Status Summary
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Updating...' : 'Refresh'}
                    </Button>
                  </div>
                  <CardDescription>
                    Privacy-preserving summary of customer credit across all shops
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Has Active Credit</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={searchResult.has_credit ? "destructive" : "default"}>
                            {searchResult.has_credit ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Outstanding Range</p>
                        <p className="font-semibold text-lg">{searchResult.outstanding_range}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Shops</p>
                        <p className="font-semibold text-lg">{searchResult.total_shops} Shop{searchResult.total_shops !== 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Risk Level</p>
                        <Badge className={getRiskColor(searchResult.risk_level)}>
                          {searchResult.risk_level}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Defaulter Warning */}
              {searchResult.is_defaulter && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-red-900 mb-1">High Outstanding Alert</h3>
                        <p className="text-sm text-red-700">
                          This customer has significant outstanding credit (over ₹10,000). Exercise caution when extending additional credit.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Privacy Notice */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Privacy-Preserving Search</p>
                      <p>
                        For security reasons, exact amounts and personal details are not shown. 
                        This summary provides risk assessment without exposing sensitive data from other shops.
                      </p>
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