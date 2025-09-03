import React from "react";
import { Link } from "react-router-dom";
import newlogo from "../images/newlogo.png";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          <div className="lg:col-span-1">
            <div className="flex items-center mb-4">
              <img
                src={newlogo}
                alt="QBiT AI Company Logo"
                className="h-10 w-auto mr-3"
              />
              <div>
                <h3 className="text-xl font-bold text-text">QBiT AI Company</h3>
                <p className="text-sm text-muted">Revolutionizing AI Trading</p>
              </div>
            </div>
            <p className="text-sm text-muted leading-relaxed mb-4">
              This comprehensive business plan outlines the vision, strategy, and operational framework for 
              QBiT AI Company, an innovative artificial intelligence firm focused on revolutionizing currency 
              trading and sports analytics. Founded in 2022 and formally registered in 2025, QBiT AI aims to 
              transform how individuals and institutions engage with complex trading and predictive markets 
              through proprietary AI algorithms, real-time data processing, and user-centric platforms.
            </p>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium text-text mb-2">Our Services</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-accent/20 text-accent/200 text-xs rounded-full">AI Trading</span>
                <span className="px-2 py-1 bg-accent/20 text-accent/200 text-xs rounded-full">Sports Analytics</span>
                <span className="px-2 py-1 bg-accent/20 text-accent/200 text-xs rounded-full">Predictive Markets</span>
                <span className="px-2 py-1 bg-accent/20 text-accent/200 text-xs rounded-full">Real-time Data</span>
              </div>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-muted hover:text-accent transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-muted hover:text-accent transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="text-muted hover:text-accent transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-text mb-4">Our Team</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10  bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-sm">HS</span>
                </div>
                <div>
                  <p className="font-medium text-text">Hamid Sardar</p>
                  <p className="text-sm text-muted">Team Leader</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-sm">BZ</span>
                </div>
                <div>
                  <p className="font-medium text-text">Batu Zaya</p>
                  <p className="text-sm text-muted">Vice Team Leader</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-sm">CS</span>
                </div>
                <div>
                  <p className="font-medium text-text">Chimbai Sumiya</p>
                  <p className="text-sm text-muted">AI Developer</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-text mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted hover:text-accent transition-colors text-sm">
                  🏠 Home
                </Link>
              </li>
              <li>
                <Link to="/matches" className="text-muted hover:text-accent transition-colors text-sm">
                  📅 Matches
                </Link>
              </li>
              <li>
                <Link to="/dropping-odds" className="text-muted hover:text-accent transition-colors text-sm">
                  📉 Dropping Odds
                </Link>
              </li>
              <li>
                <Link to="/sure-bets" className="text-muted hover:text-accent transition-colors text-sm">
                  🎯 Sure Bets
                </Link>
              </li>
              <li>
                <Link to="/in-play-odds" className="text-muted hover:text-accent transition-colors text-sm">
                  ⚡ In Play Odds
                </Link>
              </li>
              <li>
                <Link to="/all-events" className="text-muted hover:text-accent transition-colors text-sm">
                  📊 All Events
                </Link>
              </li>
              <li>
                <Link to="/betting" className="text-muted hover:text-accent transition-colors text-sm">
                  💰 Betting
                </Link>
              </li>
              <li>
                <Link to="/bookmakers" className="text-muted hover:text-accent transition-colors text-sm">
                  🏢 Bookmakers
                </Link>
              </li>
              <li>
                <Link to="/bonuses" className="text-muted hover:text-accent transition-colors text-sm">
                  🎁 Bonuses
                </Link>
              </li>
            </ul>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-text mb-3">Popular Sports</h4>
              <div className="grid grid-cols-2 gap-2">
                {['⚽ Football', '🏀 Basketball', '🎾 Tennis', '🏒 Hockey'].map((sport) => (
                  <span key={sport} className="text-xs text-muted hover:text-accent transition-colors cursor-pointer">
                    {sport}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-text mb-4">Let's Contact!</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-text">Phone Number</p>
                  <p className="text-sm text-muted">+1 (835) 997-7115</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-text">Email</p>
                  <p className="text-sm text-muted">info@qbitai.com.mn</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-text">Location</p>
                  <p className="text-sm text-muted">Global Operations</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-text mb-2">Stay Updated</h4>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-3 py-2 bg-bg border border-border rounded-l-lg text-sm text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
                <button className="px-4 py-2 bg-accent text-white font-medium rounded-r-lg hover:bg-accent/80 transition-colors text-sm">
                  Subscribe
                </button>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-text mb-2">Responsible Gambling</h4>
              <p className="text-xs text-muted leading-relaxed">
                Please gamble responsibly. If you or someone you know has a gambling problem, 
                please call 1-800-GAMBLER for help.
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-border">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-text mb-1">Real-time Analytics</h4>
            <p className="text-xs text-muted">Live odds and market movements</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-text mb-1">AI-Powered Insights</h4>
            <p className="text-xs text-muted">Advanced predictions and analysis</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-text mb-1">Secure Platform</h4>
            <p className="text-xs text-muted">Your data is protected</p>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6 text-sm text-muted">
              <span>&copy; {currentYear} QBiT AI Company. All rights reserved.</span>
              <Link to="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-accent transition-colors">Terms of Service</Link>
              <Link to="/cookies" className="hover:text-accent transition-colors">Cookie Policy</Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted">Powered by</span>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-400 rounded flex items-center justify-center">
                  <span className="text-black font-bold text-xs">AI</span>
                </div>
                <span className="text-sm font-medium text-text">QBiT AI Technology</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
