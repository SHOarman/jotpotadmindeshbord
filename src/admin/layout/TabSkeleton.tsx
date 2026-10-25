import React from 'react';

export const TabSkeleton: React.FC = () => {
  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 bg-gray-200 rounded-lg" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-28 bg-gray-200 rounded-xl" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="w-9 h-9 bg-gray-100 rounded-xl" />
            </div>
            <div className="h-8 w-16 bg-gray-300 rounded" />
            <div className="h-3 w-32 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 min-h-[350px] flex flex-col gap-4">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-12 bg-gray-50 rounded-xl flex items-center px-4 gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="h-4 w-1/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/4 bg-gray-100 rounded" />
              <div className="h-4 w-1/6 bg-gray-100 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
