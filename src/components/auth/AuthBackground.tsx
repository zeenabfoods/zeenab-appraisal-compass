
import React from 'react';

export function AuthBackground() {
  return (
    <>
      {/* Floating glass orbs for background effect */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-orange-400/20 to-red-400/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-gradient-to-r from-red-400/15 to-orange-400/15 rounded-full blur-2xl"></div>
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-gradient-to-r from-orange-300/10 to-red-300/10 rounded-full blur-lg"></div>
    </>
  );
}
