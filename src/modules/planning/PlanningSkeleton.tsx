import React from "react";

export const PlanningSkeleton = () => (
  <div className="flex flex-col items-center justify-start py-12 px-6 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm mt-8 max-w-7xl mx-auto min-h-[600px] animate-pulse">
    {/* Header Skeleton */}
    <div className="w-full flex justify-between items-end mb-8 border-b border-slate-100 pb-6">
      <div>
        <div className="w-48 h-8 bg-slate-200 rounded-lg mb-2"></div>
        <div className="w-64 h-4 bg-slate-100 rounded-md"></div>
      </div>
      <div className="w-32 h-10 bg-slate-200 rounded-xl"></div>
    </div>
    
    {/* Filters Skeleton */}
    <div className="w-full flex gap-4 mb-8">
      <div className="w-1/4 h-11 bg-slate-100 rounded-xl"></div>
      <div className="w-1/4 h-11 bg-slate-100 rounded-xl"></div>
      <div className="w-1/4 h-11 bg-slate-100 rounded-xl"></div>
      <div className="w-1/4 h-11 bg-slate-100 rounded-xl"></div>
    </div>

    {/* List Items Skeleton */}
    <div className="w-full space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-full h-20 bg-slate-50 border border-slate-100 rounded-2xl"></div>
      ))}
    </div>
  </div>
);
