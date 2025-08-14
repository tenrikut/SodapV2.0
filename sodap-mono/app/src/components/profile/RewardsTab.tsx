import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Gift, Star, Trophy, RefreshCw } from "lucide-react";
import { useAnchor } from "@/hooks/useAnchor";
import { PublicKey } from "@solana/web3.js";
import { getLoyaltyPointBalance } from "../../../../utils/program-interface";
import { toast } from "sonner";

// Mock loyalty data
const mockStores = [
  {
    id: "5",
    name: "Sodap Watch Store",
    wallet: "DfhzrfdE5VDk43iP1NL8MLS5xFaxquxJVFtjhjRmHLAW",
  },
  {
    id: "1",
    name: "Electronics Emporium",
    wallet: "7kZqKGLK8QaZ6KGLMZqKGL8QaZ6KGLMZQZ6KGLMZqKGL",
  },
  {
    id: "2",
    name: "Fashion Forward",
    wallet: "8mPrLHM9RbP7LHMNArLHM9RbP7LHMNARP7LHMNArLHM9",
  },
];

const mockRecentEarnings = [
  {
    id: "earn_001",
    date: "2025-01-15",
    type: "Purchase",
    store: "Sodap Watch Store",
    points: 120,
    description: "Earned from watch purchase",
  },
  {
    id: "earn_002",
    date: "2025-01-12",
    type: "Purchase",
    store: "Electronics Emporium",
    points: 75,
    description: "Earned from electronics purchase",
  },
  {
    id: "earn_003",
    date: "2025-01-10",
    type: "BNPL Completion",
    store: "Fashion Forward",
    points: 200,
    description: "Earned from completed BNPL payment",
  },
];

const RewardsTab: React.FC = () => {
  const { walletAddress, connection } = useAnchor();
  const [loyaltyBalances, setLoyaltyBalances] = useState<
    Record<string, number>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [recentEarnings, setRecentEarnings] = useState(mockRecentEarnings);

  // Load recent earnings from localStorage
  const loadRecentEarnings = () => {
    console.log("🔍 Loading recent earnings from localStorage...");
    try {
      const stored = localStorage.getItem("sodap-loyalty-earnings");
      console.log("📦 Raw localStorage data:", stored);

      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("📋 Parsed localStorage data:", parsed);

        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("✅ Loaded loyalty earnings from localStorage:", parsed);

          // Calculate total points from localStorage
          const localStoragePoints = parsed.reduce(
            (total, earning) => total + (earning.points || 0),
            0
          );
          console.log("📊 Total points from localStorage:", localStoragePoints);

          // Update total points with localStorage data
          setTotalPoints(localStoragePoints);

          // Use ONLY real localStorage data, no mock data if we have real payments
          setRecentEarnings(parsed);
          console.log("📋 Using REAL localStorage data only:", parsed);
          return;
        }
      }
    } catch (e) {
      console.error("Error loading loyalty earnings from localStorage:", e);
    }
    // Fallback to mock data if no stored earnings
    console.log("📊 Using mock data, no localStorage earnings found");
    setRecentEarnings(mockRecentEarnings);
  };

  // Calculate loyalty points by store from localStorage
  const calculateStoreBalances = () => {
    try {
      const stored = localStorage.getItem("sodap-loyalty-earnings");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const balances: Record<string, number> = {};

          // Initialize all stores with 0 points
          mockStores.forEach((store) => {
            balances[store.id] = 0;
          });

          // Calculate points per store
          parsed.forEach((earning) => {
            // Map store names to store IDs
            if (earning.store === "Sodap Watch Store") {
              balances["5"] = (balances["5"] || 0) + (earning.points || 0);
            }
            // Add more store mappings as needed
          });

          console.log("📊 Store balances from localStorage:", balances);
          setLoyaltyBalances(balances);
          return;
        }
      }
    } catch (e) {
      console.error("Error calculating store balances from localStorage:", e);
    }

    // Fallback: all stores have 0 points
    const emptyBalances: Record<string, number> = {};
    mockStores.forEach((store) => {
      emptyBalances[store.id] = 0;
    });
    setLoyaltyBalances(emptyBalances);
  };

  // Legacy blockchain fetch function (keeping for future use)
  const fetchLoyaltyBalances = async () => {
    console.log(
      "⚠️ Blockchain loyalty fetch is disabled - using localStorage only"
    );
    calculateStoreBalances();
  };

  useEffect(() => {
    console.log("🔄 RewardsTab: Loading loyalty data from localStorage");
    loadRecentEarnings();
    calculateStoreBalances();
  }, [walletAddress, connection]);

  // Listen for loyalty updates from payments
  useEffect(() => {
    const handleLoyaltyUpdate = () => {
      console.log(
        "🔔 Loyalty update event received, reloading earnings and balances..."
      );
      loadRecentEarnings();
      calculateStoreBalances();
    };

    window.addEventListener("sodap-loyalty-updated", handleLoyaltyUpdate);
    return () =>
      window.removeEventListener("sodap-loyalty-updated", handleLoyaltyUpdate);
  }, []);

  const getUserTier = (points: number) => {
    if (points >= 1000)
      return { name: "Gold", icon: Trophy, color: "text-yellow-600" };
    if (points >= 500)
      return { name: "Silver", icon: Star, color: "text-gray-600" };
    return { name: "Bronze", icon: Gift, color: "text-orange-600" };
  };

  const tier = getUserTier(totalPoints);
  const TierIcon = tier.icon;

  return (
    <div className="space-y-6">
      {/* Loyalty Points Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TierIcon className={`h-5 w-5 ${tier.color}`} />
            Loyalty Rewards
          </CardTitle>
          <p className="text-gray-500">
            Track your loyalty points and tier status
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!walletAddress ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Connect your wallet to view loyalty points
              </p>
            </div>
          ) : (
            <>
              {/* Total Points & Tier */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                <div>
                  <h3 className="text-2xl font-bold text-purple-700">
                    {totalPoints} Points
                  </h3>
                  <p className="text-sm text-gray-600">
                    Total across all stores
                  </p>
                </div>
                <div className="text-center">
                  <Badge
                    variant="secondary"
                    className={`${tier.color} bg-white`}
                  >
                    <TierIcon className="h-4 w-4 mr-1" />
                    {tier.name} Tier
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {tier.name === "Bronze"
                      ? "Earn 500 for Silver"
                      : tier.name === "Silver"
                      ? "Earn 1000 for Gold"
                      : "Maximum tier reached!"}
                  </p>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log("🔄 Manual refresh clicked");
                    loadRecentEarnings();
                    calculateStoreBalances();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Points
                </Button>
              </div>

              {/* Points by Store */}
              <div>
                <h4 className="font-medium mb-3">Points by Store</h4>
                <div className="space-y-2">
                  {mockStores.map((store) => (
                    <div
                      key={store.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <span className="font-medium">{store.name}</span>
                      <span className="text-purple-600 font-semibold">
                        {isLoading ? "..." : loyaltyBalances[store.id] || 0} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Earnings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Point Earnings</CardTitle>
          <p className="text-gray-500">Your latest loyalty point activities</p>
        </CardHeader>
        <CardContent>
          {recentEarnings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEarnings.map((earning) => (
                  <TableRow key={earning.id}>
                    <TableCell>{earning.date}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          earning.type === "BNPL Completion"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {earning.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{earning.store}</TableCell>
                    <TableCell 
                      className={`font-semibold ${
                        earning.points < 0 
                          ? "text-red-600" 
                          : "text-green-600"
                      }`}
                    >
                      {earning.points < 0 
                        ? earning.points 
                        : `+${earning.points}`
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No point earnings yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RewardsTab;
