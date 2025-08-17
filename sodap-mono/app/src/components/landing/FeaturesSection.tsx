
import React from 'react';
import { ShoppingCart, Store, User, Coins, Gift, Zap } from 'lucide-react';
import FeatureCard from './FeatureCard';

const FeaturesSection: React.FC = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Why Choose SoDap?</h2>
          <div className="inline-flex items-center bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 px-4 py-2 rounded-full text-sm font-semibold">
            <Zap size={16} className="mr-2" />
            Now with v2.0 Enhanced Features!
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-10 mb-16">
          <FeatureCard 
            icon={ShoppingCart} 
            iconColor="bg-sodap-purple/10" 
            title="Instant Checkout" 
            description="Pay with SOL and complete purchases in seconds with instant confirmations."
          />
          
          <FeatureCard 
            icon={Store} 
            iconColor="bg-sodap-blue/10" 
            title="Transparent Transactions" 
            description="All transactions are recorded on the Solana blockchain for complete transparency and security."
          />
          
          <FeatureCard 
            icon={User} 
            iconColor="bg-sodap-purple/10" 
            title="Secure Escrow" 
            description="Shop with confidence knowing funds are secure until your purchase is complete."
          />
        </div>

        {/* New v2.0 Features Section */}
        <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-gradient-to-r from-sodap-purple to-sodap-blue">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">🚀 New in Version 2.0</h3>
            <p className="text-gray-600">Experience the future of blockchain shopping with our latest features</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10">
            <FeatureCard 
              icon={Coins} 
              iconColor="bg-gradient-to-r from-green-100 to-emerald-100" 
              title="Buy Now, Pay Later (BNPL)" 
              description="Shop today and pay in flexible crypto installments. No hidden fees, transparent terms, secured by smart contracts on Solana blockchain."
            />
            
            <FeatureCard 
              icon={Gift} 
              iconColor="bg-gradient-to-r from-purple-100 to-pink-100" 
              title="Loyalty Points System" 
              description="Earn SoDap points with every purchase. Redeem for discounts, exclusive products, or convert to SOL tokens. The more you shop, the more you earn!"
            />
          </div>
          
          {/* Benefits highlight */}
          <div className="mt-8 bg-gradient-to-r from-sodap-purple/5 to-sodap-blue/5 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-3">✨ Enhanced Benefits:</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <p><strong>BNPL Advantages:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 0% interest on 3-month plans</li>
                  <li>• Instant approval process</li>
                  <li>• Blockchain-secured agreements</li>
                </ul>
              </div>
              <div>
                <p><strong>Loyalty Rewards:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• 1 point per $1 spent</li>
                  <li>• Bonus points for referrals</li>
                  <li>• Exclusive member-only deals</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
