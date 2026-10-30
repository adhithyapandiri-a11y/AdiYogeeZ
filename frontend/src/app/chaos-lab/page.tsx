"use client";

import React, { Suspense } from "react";
import ChaosLabView from "@/components/chaos/ChaosLabView";
import Navbar from "@/components/layout/Navbar";

export default function StandaloneChaosLabPage() {
  return (
    <div className="min-h-screen bg-[#080c15] text-slate-100 flex flex-col">
      <Navbar />
      <Suspense fallback={
        <div className="w-full h-96 flex items-center justify-center font-mono text-xs text-slate-400">
          Loading API Chaos Lab...
        </div>
      }>
        <div className="flex-1">
          <ChaosLabView />
        </div>
      </Suspense>
    </div>
  );
}
