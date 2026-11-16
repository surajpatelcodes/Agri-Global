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

      // Check if customer exists but is not a defaulter
      if (data.status === 'no_defaulter') {
        setSearchResult(data);
        toast({
          title: "No Defaulter Found",
          description: "This customer has no defaulter history.",
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
      await handleSearch();
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

  // Yellow card is now driven exclusively by the shop-set "Risky" flag on
  // the global customer, not by the presence of outstanding credit.
  const hasActiveCredit = useMemo(() => {
    if (!searchResult) return false;
    return searchResult.global_customer?.is_risky === true;
  }, [searchResult]);

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
                  className={`text-lg h-12 pr-10 ${searchTerm && (isValidAadhar ? 'border-green-500' : 'border-destructive')
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
            searchResult.status === 'no_defaulter' ? (
              hasActiveCredit ? (
                <Card className="border-2 border-yellow-300 bg-yellow-50">
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-yellow-900 mb-2">Risky Customer</h3>
                    <p className="text-yellow-800 max-w-md mx-auto mb-4">
                      This customer has been flagged as <span className="font-semibold">Risky</span> by one or more shops. Proceed with caution before issuing credit.
                    </p>
                    <div className="inline-block bg-white border border-yellow-300 rounded-lg px-6 py-3">
                      <p className="text-xs text-yellow-700 font-medium">Total Outstanding</p>
                      <p className="text-2xl font-bold text-yellow-900">₹{Number(searchResult.total_outstanding || 0).toFixed(2)}</p>
                    </div>
                    <p className="text-yellow-700 mt-4 text-sm">
                      Aadhar: <span className="font-mono font-bold">{searchResult.aadhar_no}</span>
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-12 text-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-green-900 mb-2">No Defaulter Credit Found</h3>
                    <p className="text-green-700 max-w-md mx-auto">
                      Good news! No defaulter credit history was found associated with Aadhar number <span className="font-mono font-bold">{searchResult.aadhar_no}</span>.
                    </p>
                  </CardContent>
                </Card>
              )
            ) : (
              <div className="space-y-6">
                <Card className="border-2 border-red-300 bg-red-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-red-900">
                      <div className="p-2 rounded-lg bg-red-100">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      Defaulter Alert
                      <Badge className="ml-auto bg-red-600 text-white">DEFAULTER</Badge>
                    </CardTitle>
                    <CardDescription className="text-red-700">
                      This customer is currently marked as a defaulter. Shop and amount details are kept private.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-red-700">Aadhar Number</p>
                        <p className="text-lg font-semibold text-red-900 font-mono">{searchResult.global_customer?.aadhar_no}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-700">Name</p>
                        <p className="text-lg font-semibold text-red-900">{searchResult.global_customer?.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-700">Phone</p>
                        <p className="text-lg font-semibold text-red-900">{searchResult.global_customer?.phone || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-red-200 rounded-lg p-4 text-center">
                        <p className="text-xs text-red-700 font-medium">Times Marked Defaulter</p>
                        <p className="text-3xl font-bold text-red-900">{searchResult.defaulter_summary?.total_defaulter_count ?? 0}</p>
                      </div>
                      <div className="bg-white border border-red-200 rounded-lg p-4 text-center">
                        <p className="text-xs text-red-700 font-medium">Flagged by Shops</p>
                        <p className="text-3xl font-bold text-red-900">{searchResult.defaulter_summary?.distinct_shops_count ?? 0}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-red-900 mb-2">Defaulter History</p>
                      {searchResult.defaulter_summary?.incidents?.length > 0 ? (
                        <ul className="space-y-2">
                          {searchResult.defaulter_summary.incidents.map((inc, i) => (
                            <li key={i} className="flex items-center justify-between bg-white border border-red-200 rounded-md px-4 py-2 text-sm">
                              <span className="font-medium text-red-900">Marked as defaulter</span>
                              <span className="text-red-700">
                                {new Date(inc.marked_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-red-700 italic">No dated history available.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
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
    </div >
  );
};

export default GlobalSearch;