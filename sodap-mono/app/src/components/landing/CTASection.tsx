
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Coins, Gift } from 'lucide-react';

const CTASection: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-sodap-purple/5 to-sodap-blue/5">
      <div className="container mx-auto px-4 text-center">
        {/* Version 2.0 Launch Banner */}
        <div className="inline-flex items-center bg-gradient-to-r from-sodap-purple to-sodap-blue text-white px-6 py-3 rounded-full text-sm font-bold mb-6 animate-bounce">
          <Sparkles size={18} className="mr-2" />
          Version 2.0 Now Live!
        </div>
        
        <h2 className="text-3xl font-bold mb-6">Ready to Experience Web3 Shopping with v2.0?</h2>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Join thousands of others enjoying decentralized commerce, now with BNPL and loyalty rewards.
        </p>
        
        {/* Feature highlights */}
        <div className="flex justify-center items-center space-x-8 mb-8 text-sm">
          <div className="flex items-center text-green-600">
            <Coins size={16} className="mr-2" />
            <span>Crypto BNPL Available</span>
          </div>
          <div className="flex items-center text-purple-600">
            <Gift size={16} className="mr-2" />
            <span>Earn Loyalty Points</span>
          </div>
        </div>
        
        <div className="flex justify-center space-x-4">
          <Link to="/signup">
            <Button className="bg-sodap-purple hover:bg-sodap-purple/90 text-white px-8 py-6 text-lg">
              Start Shopping v2.0
            </Button>
          </Link>
          <Link to="/features">
            <Button variant="outline" className="border-sodap-purple text-sodap-purple hover:bg-sodap-purple/5 px-8 py-6 text-lg">
              Explore Features
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
