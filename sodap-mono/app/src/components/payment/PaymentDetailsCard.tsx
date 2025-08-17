
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader, DollarSign, Coins } from 'lucide-react';
import { WalletConnector } from './WalletConnector';
import { PriceConverter, Currency } from '@/types/pricing';

interface PaymentDetailsCardProps {
  cartTotal: string;
  walletAddress: string | null;
  isConnecting: boolean;
  isProcessing: boolean;
  onConnectWallet: () => void;
  onPayment: () => void;
  solPriceInUsdc?: number; // Current SOL price in USDC for stable pricing display
}

export const PaymentDetailsCard: React.FC<PaymentDetailsCardProps> = ({
  cartTotal,
  walletAddress,
  isConnecting,
  isProcessing,
  onConnectWallet,
  onPayment,
  solPriceInUsdc = 100 // Default: 1 SOL = $100 USDC
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stable Pricing Display */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Stable Pricing</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-orange-500" />
                <span className="text-sm">SOL Amount:</span>
              </div>
              <span className="font-bold text-lg">{cartTotal} SOL</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm">USDC Equivalent:</span>
              </div>
              <span className="font-bold text-lg text-green-600">
                ${PriceConverter.solToUsdc(parseFloat(cartTotal), solPriceInUsdc).toFixed(2)}
              </span>
            </div>
            
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              Exchange Rate: 1 SOL = ${solPriceInUsdc.toFixed(2)} USDC
            </div>
          </div>
        </div>
        
        <WalletConnector 
          walletAddress={walletAddress} 
          isConnecting={isConnecting}
          onConnectWallet={onConnectWallet}
        />
        
        <div className="bg-muted/50 p-4 rounded-md mt-4">
          <p className="text-sm">
            By clicking "Complete Payment", you agree to the Terms of Service and Privacy Policy.
            The payment will be processed through the Solana blockchain.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full bg-sodap-purple hover:bg-purple-700"
          onClick={onPayment}
          disabled={isProcessing || !walletAddress || isConnecting}
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              <span>Processing Payment...</span>
            </div>
          ) : (
            "Complete Payment"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
