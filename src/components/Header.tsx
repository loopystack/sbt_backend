import React from "react";
import { Link } from "react-router-dom";
import newlogo from "@/images/newlogo.png";
import Navigation from "./Navigation";

export default function Header() {
  return (
    <header className="sticky top-0 z-[9999] border-b border-border bg-bg/95 backdrop-blur">
      <div className="w-full">
        {/* Logo - aligned with red circle on the very left */}
        {/* <div className="h-16 flex items-center">
          <Link to="/" className="flex items-center">
            <img 
              src={newlogo} 
              alt="SportsBetting Logo" 
              className="h-12 w-auto"
            />
          </Link>
        </div> */}
        
        {/* Navigation Component - moved to top */}
        <Navigation />
      </div>
    </header>
  );
}
