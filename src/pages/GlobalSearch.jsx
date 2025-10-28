import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, AlertCircle } from "lucide-react";

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
      // Use privacy-preserving credit check function
      const { data, error } = await supabase
        .rpc("check_customer_credit_status", {
          _aadhar_number: searchTerm.trim()
        });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setSearchResult(null);
        toast({
          title: "No Results",
          description: "No customer found with this Aadhar number",
        });
        return;
      }

      setSearchResult(data[0]);

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
              {/* Credit Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Credit Status Summary
                  </CardTitle>
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