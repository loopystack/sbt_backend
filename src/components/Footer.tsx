import React from "react";
import { Link } from "react-router-dom";
import newlogo from "../images/newlogo.png";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-black mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        
        {/* Awards Section */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Best Sports Betting 2024</div>
              <div className="text-yellow-400 text-xs">SPORTSBET AWARDS</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">⭐</span>
            </div>
            <div>
              <div className="text-white font-semibold text-sm">BEST PARTNER</div>
              <div className="text-blue-400 text-xs">SPORTSBET</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Members CHOICE 2024</div>
              <div className="text-green-400 text-xs">BETTING AWARDS</div>
            </div>
          </div>
        </div>
        
        {/* Community Section */}
        <div className="text-center mb-8">
          <h2 className="text-white text-2xl font-bold mb-6">Community</h2>
          <div className="flex justify-center gap-4">
            <div className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <div className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <div className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </div>
            <div className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 1.858-.896 3.461-2.189 4.67-1.293 1.21-2.977 1.834-4.905 1.834-1.928 0-3.612-.624-4.905-1.834-1.293-1.209-2.02-2.812-2.189-4.67-.013-.15-.02-.302-.02-.456 0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5c0 .154-.007.306-.02.456z"/>
              </svg>
            </div>
            <div className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.344 8.344c-.169 1.858-.896 3.461-2.189 4.67-1.293 1.21-2.977 1.834-4.905 1.834-1.928 0-3.612-.624-4.905-1.834-1.293-1.209-2.02-2.812-2.189-4.67-.013-.15-.02-.302-.02-.456 0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5c0 .154-.007.306-.02.456z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          
          <div className="lg:col-span-1">
            <div className="text-center lg:text-left mb-6">
              <div className="flex items-center justify-center lg:justify-start mb-4">
                <img
                  src={newlogo}
                  alt="SportsBet Logo"
                  className="h-12 w-auto mr-3"
                />
                <div>
                  <h3 className="text-2xl font-bold text-white">SportsBet</h3>
                  <p className="text-sm text-gray-300">Best Betting Experience</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">
                © SportsBet.com - All Rights Reserved.
              </p>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">
              This comprehensive business plan outlines the vision, strategy, and operational framework for QBiT AI Company, an innovative artificial intelligence firm focused on revolutionizing currency trading and sports analytics. Founded in 2022 and formally registered in 2025, QBiT AI aims to transform how individuals and institutions engage with complex trading and predictive markets through proprietary AI algorithms, real-time data processing, and user-centric platforms.
              </p>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="text-center lg:text-left mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Licensing & Regulation</h3>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">
                SportsBet SRL is licensed and regulated by the Government of the 
                International Gaming Commission, and operates under License No. 
                SGB-2024-001. SportsBet SRL has passed all regulatory compliance 
                and is legally authorized to conduct gaming operations for any and 
                all games of chance and wagering.
              </p>
              <h4 className="text-sm font-medium text-white mb-2">Terms & Conditions</h4>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">
                In the event the General Terms and Conditions are updated, existing 
                users may choose to discontinue using the products and services should 
                they not agree with the updates. If you continue using the website, 
                this will be considered as user's consent to continue using the services 
                on this website.
              </p>
            </div>
          </div>
          
          {/* Our Team Column */}
          <div className="lg:col-span-1">
            <div className="text-center lg:text-left mb-6">
              <div className="flex items-center justify-center lg:justify-start mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Our Team</h3>
              </div>
              
              <div className="space-y-2">
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-3 hover:from-gray-700 hover:to-gray-600 transition-all duration-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                      <span className="text-black font-bold text-xs">HS</span>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Hamid Sardar</p>
                      <p className="text-yellow-400 text-xs">Team Leader</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-3 hover:from-gray-700 hover:to-gray-600 transition-all duration-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                      <span className="text-black font-bold text-xs">BZ</span>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Batu Zaya</p>
                      <p className="text-green-400 text-xs">Vice Team Leader</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-3 hover:from-gray-700 hover:to-gray-600 transition-all duration-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-black font-bold text-xs">CS</span>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Chimbai Sumiya</p>
                      <p className="text-purple-400 text-xs">AI Developer</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Our Services Section */}
              <div className="mt-6">
                <div className="flex items-center justify-center lg:justify-start mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Our Services</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg p-2 text-center transition-all duration-300 cursor-pointer">
                    <span className="text-white font-medium text-xs">AI Trading</span>
                  </div>
                  <div className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-lg p-2 text-center transition-all duration-300 cursor-pointer">
                    <span className="text-white font-medium text-xs">Sports Analytics</span>
                  </div>
                  <div className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg p-2 text-center transition-all duration-300 cursor-pointer">
                    <span className="text-white font-medium text-xs">Predictive Markets</span>
                  </div>
                  <div className="bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 rounded-lg p-2 text-center transition-all duration-300 cursor-pointer">
                    <span className="text-white font-medium text-xs">Real-time Data</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Let's Contact Column */}
          <div className="lg:col-span-1">
            <div className="text-center lg:text-left mb-6">
              <div className="flex items-center justify-center lg:justify-start mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mr-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Let's Contact!</h3>
              </div>
              
              <div className="space-y-2">
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-3 hover:from-gray-700 hover:to-gray-600 transition-all duration-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Phone Number</p>
                      <p className="text-green-400 text-xs">+1 (835) 997-7115</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-3 hover:from-gray-700 hover:to-gray-600 transition-all duration-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Email</p>
                      <p className="text-blue-400 text-xs">info@sportsbet.com</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-3 hover:from-gray-700 hover:to-gray-600 transition-all duration-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">Location</p>
                      <p className="text-orange-400 text-xs">Global Operations</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Stay Updated Section */}
              <div className="mt-6">
                <div className="flex items-center justify-center lg:justify-start mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5V12a9 9 0 0118 0v5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">Stay Updated</h3>
                </div>
                
                <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-3">
                  <div className="flex flex-col space-y-2">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300 text-sm"
                    />
                    <button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold py-2 rounded-lg hover:from-yellow-300 hover:to-yellow-400 transition-all duration-300 text-sm">
                      Subscribe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Age Restriction & Certification */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-gray-700">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="text-white text-xl font-bold">+18</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
              <span className="text-white text-sm font-medium">Certified Gaming</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-xs">
              Please gamble responsibly. If you or someone you know has a gambling problem, 
              please call 1-800-GAMBLER for help.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
