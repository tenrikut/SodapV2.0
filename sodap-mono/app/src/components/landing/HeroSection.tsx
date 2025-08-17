
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Zap, Shield, Globe } from 'lucide-react';
import CryptoPriceDisplay from './CryptoPriceDisplay';

const HeroSection: React.FC = () => {
  return (
    <section className="bg-white relative overflow-hidden">
      {/* Blockchain Network Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="blockchain-grid"></div>
      </div>
      
      {/* Floating Blockchain Nodes */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse blockchain-node"></div>
      <div className="absolute top-40 right-20 w-3 h-3 bg-gradient-to-r from-green-400 to-teal-400 rounded-full animate-ping blockchain-node"></div>
      <div className="absolute bottom-32 left-1/4 w-5 h-5 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-bounce blockchain-node"></div>
      <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse blockchain-node"></div>
      
      {/* Animated Connection Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7E57C2" />
            <stop offset="100%" stopColor="#42A5F5" />
          </linearGradient>
        </defs>
        <line x1="10%" y1="20%" x2="90%" y2="40%" stroke="url(#connectionGradient)" strokeWidth="1" className="animate-draw-line" />
        <line x1="20%" y1="60%" x2="80%" y2="30%" stroke="url(#connectionGradient)" strokeWidth="1" className="animate-draw-line-delayed" />
        <line x1="30%" y1="80%" x2="70%" y2="20%" stroke="url(#connectionGradient)" strokeWidth="1" className="animate-draw-line" />
      </svg>
      
      <div className="container mx-auto px-4 py-16 md:py-32 relative z-10">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            {/* Version 2.0 Badge */}
            <div className="relative inline-flex items-center bg-gradient-to-r from-sodap-purple via-pink-500 to-sodap-blue text-white px-6 py-3 rounded-full text-sm font-bold mb-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-sodap-purple to-sodap-blue rounded-full blur opacity-30 animate-pulse"></div>
              <Sparkles size={18} className="mr-2 animate-spin" />
              <span className="relative z-10">NEW: Version 2.0 Features</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
              <span className="text-sodap-purple bg-gradient-to-r from-sodap-purple to-purple-600 bg-clip-text text-transparent">Shop</span> On-Chain<br />
              Walk Out <span className="text-sodap-blue bg-gradient-to-r from-sodap-blue to-blue-600 bg-clip-text text-transparent">Free</span>
            </h1>
            
            {/* Blockchain Stats Banner with Live Prices */}
            <div className="bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 text-white p-4 rounded-xl mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
              
              {/* Top row - Network status */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                    <span className="text-xs font-semibold">Solana Network</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span className="text-xs">Secured by Blockchain</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-xs">Decentralized</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-300">Live Network Status</div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-green-400">ACTIVE</span>
                  </div>
                </div>
              </div>
              
              {/* Bottom row - Live crypto prices */}
              <div className="border-t border-white/10 pt-3 relative z-10">
                <CryptoPriceDisplay />
              </div>
            </div>
            
            {/* Creative Features Showcase */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                🚀 What's New in v2.0
              </h3>
              
              <div className="grid gap-4 max-w-2xl">
                {/* BNPL Feature */}
                <div className="group bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-full mr-4 group-hover:bg-green-200 transition-colors">
                      ₿
                    </div>
                    <div>
                      <h4 className="font-bold text-green-800">Buy Now, Pay Later</h4>
                      <p className="text-green-600 text-sm">Flexible crypto payment options</p>
                    </div>
                  </div>
                </div>
                
                {/* Loyalty Points Feature */}
                <div className="group bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-2 rounded-full mr-4 group-hover:bg-purple-200 transition-colors">
                      🎯
                    </div>
                    <div>
                      <h4 className="font-bold text-purple-800">Loyalty Points</h4>
                      <p className="text-purple-600 text-sm">Earn rewards with every purchase</p>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Experience Feature */}
                <div className="group bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border-l-4 border-blue-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-4 group-hover:bg-blue-200 transition-colors">
                      ✨
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-800">Enhanced Experience</h4>
                      <p className="text-blue-600 text-sm">Smoother, faster checkout</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup">
                <Button className="bg-gradient-to-r from-sodap-purple to-purple-600 hover:from-sodap-purple/90 hover:to-purple-600/90 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
                  <span className="flex items-center">
                    Start Your v2.0 Journey
                    <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="border-2 border-sodap-purple text-sodap-purple hover:bg-sodap-purple hover:text-white px-8 py-3 text-lg font-semibold rounded-xl transition-all duration-300 transform hover:scale-105">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="md:w-1/2">
            <div className="relative">
              {/* Animated background elements */}
              <div className="absolute -left-6 -top-6 w-64 h-64 bg-gradient-to-br from-purple-200 to-purple-100 rounded-full animate-pulse"></div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gradient-to-br from-blue-200 to-blue-100 rounded-full animate-bounce"></div>
              <div className="absolute top-10 right-5 w-20 h-20 bg-gradient-to-br from-pink-200 to-pink-100 rounded-full animate-ping"></div>
              
              {/* Main visual element - Blockchain-themed */}
              <div className="relative z-10 w-full h-80 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 rounded-2xl shadow-2xl overflow-hidden border border-purple-500/30">
                {/* Blockchain Network Visualization */}
                <div className="absolute inset-0">
                  {/* Network nodes */}
                  <div className="absolute top-12 left-12 w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <div className="absolute top-16 right-16 w-6 h-6 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-ping flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <div className="absolute bottom-20 left-20 w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-bounce flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                  <div className="absolute bottom-12 right-12 w-7 h-7 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  
                  {/* Connection lines between nodes */}
                  <svg className="absolute inset-0 w-full h-full">
                    <defs>
                      <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="50%" stopColor="#06B6D4" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                    </defs>
                    <line x1="15%" y1="20%" x2="85%" y2="25%" stroke="url(#nodeGradient)" strokeWidth="2" opacity="0.6" className="animate-draw-line" />
                    <line x1="25%" y1="75%" x2="75%" y2="20%" stroke="url(#nodeGradient)" strokeWidth="2" opacity="0.6" className="animate-draw-line-delayed" />
                    <line x1="15%" y1="20%" x2="25%" y2="75%" stroke="url(#nodeGradient)" strokeWidth="2" opacity="0.6" className="animate-draw-line" />
                    <line x1="85%" y1="25%" x2="75%" y2="80%" stroke="url(#nodeGradient)" strokeWidth="2" opacity="0.6" className="animate-draw-line-delayed" />
                  </svg>
                </div>
                
                {/* Floating blockchain elements */}
                <div className="absolute top-8 left-8 bg-white/10 backdrop-blur-sm rounded-xl p-3 animate-float border border-white/20">
                  <div className="text-white text-xl">⛓️</div>
                  <div className="text-white text-xs font-semibold">Blockchain</div>
                </div>
                
                <div className="absolute top-20 right-12 bg-white/10 backdrop-blur-sm rounded-xl p-3 animate-float-delayed border border-white/20">
                  <div className="text-white text-xl">🔐</div>
                  <div className="text-white text-xs font-semibold">Secure</div>
                </div>
                
                <div className="absolute bottom-16 left-12 bg-white/10 backdrop-blur-sm rounded-xl p-3 animate-float border border-white/20">
                  <div className="text-white text-xl">⚡</div>
                  <div className="text-white text-xs font-semibold">Fast</div>
                </div>
                
                {/* Central Solana logo area */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/5 backdrop-blur-md rounded-full p-8 border-2 border-gradient-to-r from-purple-400 to-blue-400 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-blue-400/20 rounded-full animate-pulse"></div>
                    <div className="text-5xl text-white relative z-10">◎</div>
                    <div className="text-white text-xs font-bold text-center mt-2 relative z-10">SOLANA</div>
                  </div>
                </div>
                
                {/* Data flow animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-data-flow"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-data-flow-reverse"></div>
                
                {/* Matrix-style code rain effect */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 left-1/4 text-green-400 text-xs animate-code-rain">01101</div>
                  <div className="absolute top-0 left-3/4 text-blue-400 text-xs animate-code-rain-delayed">11010</div>
                  <div className="absolute top-0 left-1/2 text-purple-400 text-xs animate-code-rain">10110</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
