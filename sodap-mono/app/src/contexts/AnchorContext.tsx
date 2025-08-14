import React, { useState, useEffect, useContext } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { IDL, PROGRAM_ID } from "@/idl";
import type { Sodap } from "@/idl";

import {
  createAnchorProvider,
  createPhantomWalletAdapter,
  createAnchorProgram,
} from "@/utils/anchor";
import { handleWalletError } from "@/lib/walletErrorHandler";
import { toast } from "sonner";
import { AnchorContext, AnchorContextType } from "./AnchorContext.context";

// The useAnchor hook is now imported from '../hooks/useAnchor.ts'

// Context provider component
export const SodapAnchorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [program, setProgram] = useState<Program<Sodap> | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize connection
  useEffect(() => {
    const initConnection = async () => {
      try {
        // Use environment variables with fallbacks
        let endpoint = import.meta.env.VITE_SOLANA_RPC_URL;

        // If no environment variable is set, use Devnet by default
        if (!endpoint) {
          // FORCE DEVNET: Always use Devnet regardless of environment
          endpoint = clusterApiUrl("devnet");
          console.log("CONNECTING TO SOLANA DEVNET (default)");
        } else if (
          endpoint.includes("localhost") ||
          endpoint.includes("127.0.0.1")
        ) {
          // OVERRIDE: If somehow localhost is set, force devnet instead
          console.warn(
            "⚠️ Localhost endpoint detected, forcing devnet instead!"
          );
          endpoint = clusterApiUrl("devnet");
          console.log("CONNECTING TO SOLANA DEVNET (forced override)");
        } else if (
          !/^https?:\/\//i.test(endpoint) &&
          endpoint !== "devnet" &&
          endpoint !== "testnet" &&
          endpoint !== "mainnet-beta"
        ) {
          // Add http:// prefix if the endpoint doesn't start with http:// or https:// and isn't a network name
          endpoint = `http://${endpoint}`;
          console.log("Adding http:// prefix to endpoint:", endpoint);
        } else if (
          endpoint === "devnet" ||
          endpoint === "testnet" ||
          endpoint === "mainnet-beta"
        ) {
          // Handle network names
          endpoint = clusterApiUrl(endpoint);
          console.log(`Using Solana ${endpoint} network`);
        }

        console.log("Connecting to Solana at:", endpoint);
        console.log("🌐 Environment Variables:");
        console.log(
          "  VITE_SOLANA_RPC_URL:",
          import.meta.env.VITE_SOLANA_RPC_URL
        );
        console.log(
          "  VITE_SOLANA_NETWORK:",
          import.meta.env.VITE_SOLANA_NETWORK
        );
        console.log(
          "  VITE_SODAP_PROGRAM_ID:",
          import.meta.env.VITE_SODAP_PROGRAM_ID
        );
        console.log("🎯 Final endpoint:", endpoint);
        console.log("📍 Is devnet?", endpoint.includes("devnet"));
        console.log(
          "🚫 Is localhost?",
          endpoint.includes("localhost") || endpoint.includes("127.0.0.1")
        );

        let connection = new Connection(endpoint, "confirmed");

        // Test the connection with retries
        let connectionAttempts = 0;
        const maxAttempts = 3;

        while (connectionAttempts < maxAttempts) {
          try {
            console.log(
              `Testing connection to Solana... (attempt ${
                connectionAttempts + 1
              }/${maxAttempts})`
            );
            const latestBlockhash = await connection.getLatestBlockhash();
            console.log(
              "✅ Connection successful! Latest blockhash:",
              latestBlockhash.blockhash
            );
            break; // Success, exit the loop
          } catch (connectionError) {
            connectionAttempts++;
            console.error(
              `❌ Connection attempt ${connectionAttempts} failed:`,
              connectionError
            );

            if (connectionAttempts >= maxAttempts) {
              console.error(
                "All connection attempts failed. Trying alternative endpoint..."
              );

              // Try alternative devnet endpoints
              const altEndpoints = [
                "https://api.devnet.solana.com", // Fast and reliable (111ms)
                "https://solana-devnet.g.alchemy.com/v2/demo", // Slower but working (534ms)
                // Excluding helius due to API key requirement
              ];

              let altConnectionFound = false;
              for (const altEndpoint of altEndpoints) {
                try {
                  console.log("Trying alternative endpoint:", altEndpoint);
                  const altConnection = new Connection(
                    altEndpoint,
                    "confirmed"
                  );
                  await altConnection.getLatestBlockhash();
                  console.log("✅ Alternative connection successful!");
                  // Use the working alternative connection
                  connection = altConnection;
                  endpoint = altEndpoint;
                  altConnectionFound = true;
                  break;
                } catch (altError) {
                  console.error("Alternative endpoint failed:", altError);
                }
              }

              if (!altConnectionFound) {
                throw new Error(
                  `Failed to connect to Solana after trying multiple endpoints: ${connectionError.message}`
                );
              }
            } else {
              // Wait a bit before retrying
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }

        setConnection(connection);

        // Check if wallet was previously connected in this session
        const savedWalletAddress = sessionStorage.getItem("walletAddress");
        if (savedWalletAddress) {
          console.log("Found previously connected wallet:", savedWalletAddress);
          setWalletAddress(savedWalletAddress);

          try {
            await initializeAnchorProgram(savedWalletAddress, connection);
          } catch (error) {
            console.error(
              "Error initializing with saved wallet address:",
              error
            );
            // Clear the saved wallet info since it failed
            sessionStorage.removeItem("walletAddress");
            setWalletAddress(null);
            // Don't show an error toast here - just quietly fail
          }
        }
      } catch (error) {
        console.error("Error initializing connection:", error);
        toast.error("Failed to connect to Solana network");
      } finally {
        setIsLoading(false);
      }
    };

    initConnection();
  }, []);

  const initializeAnchorProgram = async (
    address: string,
    conn: Connection
  ): Promise<void> => {
    try {
      console.log("🔄 Initializing Anchor program...");
      console.log("- Wallet address:", address);
      console.log("- Connection endpoint:", conn.rpcEndpoint);
      console.log("- Is devnet:", conn.rpcEndpoint.includes("devnet"));

      // Test if the address is valid
      let publicKey: PublicKey;
      try {
        publicKey = new PublicKey(address);
        console.log("✅ Valid public key created");
      } catch (keyError) {
        console.error("❌ Invalid public key:", keyError);
        throw new Error(`Invalid wallet address: ${address}`);
      }

      // Create wallet adapter
      console.log("🔄 Creating wallet adapter...");
      const wallet = createPhantomWalletAdapter(publicKey);
      console.log("✅ Wallet adapter created");

      // Create provider
      console.log("🔄 Creating Anchor provider...");
      const provider = createAnchorProvider(conn, wallet);
      console.log("✅ Anchor provider created");

      // Check program ID
      console.log("🔄 Checking program configuration...");
      console.log("- Program ID:", PROGRAM_ID.toString());
      console.log(
        "- IDL preview:",
        JSON.stringify(IDL).substring(0, 100) + "..."
      );

      // Verify program exists on chain
      try {
        const programAccount = await conn.getAccountInfo(
          new PublicKey(PROGRAM_ID)
        );
        if (!programAccount) {
          throw new Error(`Program ${PROGRAM_ID} does not exist on chain`);
        }
        console.log("✅ Program exists on chain");
      } catch (programCheckError) {
        console.error("❌ Program check failed:", programCheckError);
        throw new Error(
          `Program verification failed: ${programCheckError.message}`
        );
      }

      // Create anchor program
      console.log("🔄 Creating Anchor program instance...");
      const anchorProgram = createAnchorProgram(provider);

      if (!anchorProgram) {
        throw new Error("Failed to create Anchor program - program is null");
      }

      console.log("✅ Anchor program created successfully");
      console.log("- Program ID:", anchorProgram.programId.toString());

      setProgram(anchorProgram);
      setIsConnected(true);
      console.log("✅ Anchor program initialization complete!");
    } catch (error) {
      console.error("💥 Failed to initialize Anchor program:", error);
      console.error("Error details:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });

      toast.error(
        "Failed to initialize program: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      setIsConnected(false);
      setProgram(null);
      throw error; // Re-throw so caller knows it failed
    }
  };

  // Connect wallet function
  const connectWallet = async (): Promise<boolean> => {
    try {
      console.log("🔄 Starting wallet connection process...");

      if (!connection) {
        console.error("❌ No Solana connection available");
        throw new Error("No connection available");
      }

      console.log("✅ Solana connection is available");

      // Check if we're in a browser environment
      if (typeof window === "undefined") {
        console.error("❌ Not in browser environment");
        throw new Error("Not in browser environment");
      }

      console.log("✅ In browser environment");

      // Check if Phantom is installed
      if (!window.phantom) {
        console.error("❌ Phantom wallet not found on window object");
        throw new Error(
          "Phantom wallet not installed. Please install Phantom wallet extension."
        );
      }

      console.log("✅ Phantom wallet detected");

      if (!window.phantom.solana) {
        console.error("❌ Phantom Solana provider not found");
        throw new Error("Phantom Solana provider not available");
      }

      console.log("✅ Phantom Solana provider available");

      // Check if already connected
      if (window.phantom.solana.isConnected) {
        console.log("🔗 Phantom wallet already connected");
        const publicKey = window.phantom.solana.publicKey;
        if (publicKey) {
          const address = publicKey.toString();
          console.log("✅ Using existing connection with address:", address);
          setWalletAddress(address);
          sessionStorage.setItem("walletAddress", address);
          await initializeAnchorProgram(address, connection);
          toast.success("Wallet connected successfully");
          return true;
        }
      }

      console.log("🔄 Requesting wallet connection...");
      const { publicKey } = await window.phantom.solana.connect();

      if (!publicKey) {
        console.error("❌ Failed to get public key from wallet");
        throw new Error("Failed to get public key from wallet");
      }

      const address = publicKey.toString();
      console.log("✅ Wallet connected with address:", address);

      setWalletAddress(address);
      sessionStorage.setItem("walletAddress", address);

      // Initialize Anchor program with the connected wallet
      console.log("🔄 Initializing Anchor program...");
      await initializeAnchorProgram(address, connection);
      console.log("✅ Anchor program initialized successfully");

      toast.success("Wallet connected successfully");
      return true;
    } catch (error) {
      console.error("💥 Error connecting wallet:", error);
      console.error("Error details:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      });

      const errorMessage = handleWalletError(error);
      toast.error(errorMessage);
      return false;
    }
  };

  // Disconnect wallet function
  const disconnectWallet = async (): Promise<void> => {
    try {
      if (window.phantom?.solana) {
        await window.phantom.solana.disconnect();
      }
      setWalletAddress(null);
      setProgram(null);
      setIsConnected(false);
      sessionStorage.removeItem("walletAddress");
      toast.success("Wallet disconnected");
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      toast.error("Failed to disconnect wallet");
    }
  };

  return (
    <AnchorContext.Provider
      value={{
        program,
        connection,
        walletAddress,
        isConnected,
        connectWallet,
        disconnectWallet,
        isLoading,
      }}
    >
      {children}
    </AnchorContext.Provider>
  );
};
