
import React from 'react';
import { Button } from '@/components/ui/button';
import { MinusIcon, PlusIcon, TrashIcon, DollarSign, Coins } from 'lucide-react';
import { CartItem as CartItemType } from '@/types/cart';
import { PriceConverter } from '@/types/pricing';

interface CartItemProps {
  item: CartItemType;
  updateQuantity: (id: string, change: number) => void;
  removeItem: (id: string) => void;
  solPriceInUsdc?: number;
}

export const CartItem: React.FC<CartItemProps> = ({ item, updateQuantity, removeItem, solPriceInUsdc = 100 }) => {
  return (
    <div className="flex items-center gap-4 py-4 border-b">
      <div className="w-16 h-16 overflow-hidden rounded">
        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium">{item.product.name}</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <p className="text-lg font-bold text-green-600">${item.product.price.toFixed(2)}</p>
            <span className="text-sm font-semibold text-green-600">USDC</span>
          </div>
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-gray-500" />
            <p className="text-xs text-gray-500">
              You'll pay: {PriceConverter.usdcToSol(item.product.price, solPriceInUsdc).toFixed(4)} SOL
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline" 
          size="icon"
          onClick={() => updateQuantity(item.product.id, -1)}
        >
          <MinusIcon className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center">{item.quantity}</span>
        <Button
          variant="outline" 
          size="icon"
          onClick={() => updateQuantity(item.product.id, 1)}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>
      <div className="w-32 text-right">
        <div className="flex items-center gap-1 justify-end">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-bold text-lg text-green-600">${(item.product.price * item.quantity).toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1 justify-end">
          <span className="text-sm font-semibold text-green-600">USDC</span>
        </div>
        <div className="flex items-center gap-1 justify-end mt-1">
          <Coins className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500">
            {PriceConverter.usdcToSol(item.product.price * item.quantity, solPriceInUsdc).toFixed(4)} SOL
          </span>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => removeItem(item.product.id)}
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};
