import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wallet,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAnchor } from "@/hooks/useAnchor";
import { useToast } from "@/hooks/use-toast";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

interface WalletTabProps {
  isAdmin?: boolean;
}

const WalletTab: React.FC<WalletTabProps> = ({ isAdmin = false }) => {
  console.log("WalletTab component rendering...");

  // Safe hook usage with error handling
  let profileData = {
    walletAddress: null,
    setWalletAddress: () => {},
    walletSecret: null,
    setWalletSecret: () => {},
  };
  let anchorData = {
    walletAddress: null,
    connection: null,
    connectWallet: async () => false,
    isConnected: false,
  };

  try {
    profileData = useProfile();
  } catch (error) {
    console.error("Error with useProfile:", error);
  }

  try {
    anchorData = useAnchor();
  } catch (error) {
    console.error("Error with useAnchor:", error);
  }

  const { toast } = useToast();

  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Determine the active wallet address (connected wallet takes priority)
  const activeWalletAddress =
    anchorData.walletAddress || profileData.walletAddress;
  const hasWallet = Boolean(activeWalletAddress);

  console.log("WalletTab state:", {
    profileWallet: profileData.walletAddress,
    connectedWallet: anchorData.walletAddress,
    activeWallet: activeWalletAddress,
    hasWallet,
    connection: !!anchorData.connection,
  });

  // Check localStorage for existing wallet on component mount
  useEffect(() => {
    try {
      const storedWallet = localStorage.getItem("sodap-wallet");
      if (storedWallet) {
        const walletData = JSON.parse(storedWallet);
        profileData.setWalletAddress(walletData.pub);
        profileData.setWalletSecret(walletData.sec);
      }
    } catch (error) {
      console.error("Error loading stored wallet:", error);
    }
  }, []);

  // Fetch wallet balance when wallet address changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeWalletAddress || !anchorData.connection) return;

      setIsLoadingBalance(true);
      try {
        const publicKey = new PublicKey(activeWalletAddress);
        const balance = await anchorData.connection.getBalance(publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
        setBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [activeWalletAddress, anchorData.connection]);

  /**
   * Generate a Solana keypair and store it in state and localStorage
   */
  const generateSolanaKeypair = () => {
    setIsCreatingWallet(true);

    try {
      // Generate a real Solana keypair
      const kp = Keypair.generate();

      // Convert public key to base58 and secret key to hex
      const publicKey = kp.publicKey.toBase58();
      const secretKey = Buffer.from(kp.secretKey).toString("hex");

      // Store in state
      profileData.setWalletAddress(publicKey);
      profileData.setWalletSecret(secretKey);

      // Store in localStorage for persistence
      localStorage.setItem(
        "sodap-wallet",
        JSON.stringify({
          pub: publicKey,
          sec: secretKey,
        })
      );

      toast({
        title: "Wallet Created",
        description:
          "Your Solana wallet has been generated successfully. Keep your secret key safe!",
      });
    } catch (error) {
      console.error("Error generating Solana wallet:", error);
      toast({
        title: "Wallet Creation Failed",
        description:
          "There was an error creating your Solana wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${type} Copied`,
      description: `The ${type.toLowerCase()} has been copied to clipboard.`,
    });
  };

  const toggleSecretVisibility = () => {
    setIsSecretVisible(!isSecretVisible);
  };

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const success = await anchorData.connectWallet();
      if (success) {
        toast({
          title: "Wallet Connected",
          description: "Your wallet has been connected successfully.",
        });
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to your wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshBalance = async () => {
    if (!activeWalletAddress || !anchorData.connection) return;

    setIsLoadingBalance(true);
    try {
      const publicKey = new PublicKey(activeWalletAddress);
      const balance = await anchorData.connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
      toast({
        title: "Balance Updated",
        description: "Wallet balance has been refreshed.",
      });
    } catch (error) {
      console.error("Error refreshing balance:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh wallet balance.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBalance(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>My Wallet</CardTitle>
        <p className="text-gray-500">
          {hasWallet
            ? "Your connected wallet information and balance"
            : "Connect your wallet or create a new one to start using SoDap"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasWallet ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
            <Wallet size={48} className="mb-4 text-purple-600" />
            <div>
              <h3 className="text-xl font-medium mb-2">No Wallet Connected</h3>
              <p className="text-gray-500 mb-4">
                Connect your existing wallet or create a new one to start using
                SoDap payments
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button
                onClick={handleConnectWallet}
                className="bg-purple-600 hover:bg-purple-700 flex-1"
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
              <Button
                onClick={generateSolanaKeypair}
                variant="outline"
                className="flex-1"
                disabled={isCreatingWallet}
              >
                {isCreatingWallet ? "Creating..." : "Create New Wallet"}
              </Button>
            </div>

            <p className="text-xs text-gray-400 max-w-md">
              Connect using Phantom, Solflare, or other supported wallets, or
              create a new wallet managed by SoDap.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Wallet Status */}
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-green-800">
                  {anchorData.walletAddress
                    ? "External Wallet Connected"
                    : "SoDap Wallet Active"}
                </span>
              </div>
              {anchorData.walletAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `https://explorer.solana.com/address/${activeWalletAddress}?cluster=devnet`,
                      "_blank"
                    )
                  }
                  className="text-green-700 hover:text-green-800"
                >
                  <ExternalLink size={14} className="mr-1" />
                  View on Explorer
                </Button>
              )}
            </div>

            {/* Wallet Address */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Wallet Address
              </h3>
              <div className="flex items-center">
                <Input
                  readOnly
                  value={activeWalletAddress || ""}
                  className="flex-1 font-mono text-sm rounded-r-none"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[42px] rounded-l-none border-l-0"
                  onClick={() =>
                    copyToClipboard(activeWalletAddress || "", "Address")
                  }
                >
                  <Copy size={16} />
                </Button>
              </div>
            </div>

            {/* Secret Key - Only show for SoDap-generated wallets */}
            {!anchorData.walletAddress && profileData.walletSecret && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Secret Key{" "}
                  <span className="text-red-500">(Keep this safe!)</span>
                </h3>
                <div className="flex items-center">
                  <Input
                    readOnly
                    type={isSecretVisible ? "text" : "password"}
                    value={profileData.walletSecret || ""}
                    className="flex-1 font-mono text-sm rounded-r-none"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-[42px] rounded-none border-l-0 border-r-0"
                    onClick={toggleSecretVisibility}
                  >
                    {isSecretVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-[42px] rounded-l-none border-l-0"
                    onClick={() =>
                      copyToClipboard(profileData.walletSecret || "", "Secret")
                    }
                    disabled={!profileData.walletSecret}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
                <p className="text-sm text-red-500 mt-2">
                  Important: Store this secret safely; it cannot be recovered if
                  lost.
                </p>
              </div>
            )}

            {/* Wallet Balance */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-500">
                  Wallet Balance
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshBalance}
                  disabled={isLoadingBalance}
                  className="h-8 px-2"
                >
                  <RefreshCw
                    size={14}
                    className={`${isLoadingBalance ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">
                  {isLoadingBalance
                    ? "Loading..."
                    : balance !== null
                    ? `${balance.toFixed(4)} SOL`
                    : "Unable to load"}
                </p>
                {balance !== null && (
                  <p className="text-sm text-gray-500">
                    ≈ ${(balance * 100).toFixed(2)} USD
                  </p>
                )}
              </div>
              {balance === 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  Your wallet has no SOL. You'll need some SOL to pay for
                  transactions.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletTab;
