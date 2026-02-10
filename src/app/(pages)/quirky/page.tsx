'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Fact {
  id: string;
  category: 'Space' | 'Species' | 'Tech';
  title: string;
  description: string;
}

export default function QuirkyPage() {
  const [items, setItems] = useState<Fact[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'finished'>('idle');
  
  // O(1) Lookup for Deduplication
  const seenIds = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (pageToFetch: number) => {
    // Cancel previous request logic
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setStatus('loading');

    try {
      // 1. FIX THE 404: Ensure this path matches the file you created in step 2
      const res = await fetch(`/api/quirky?page=${pageToFetch}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error(`Server Error: ${res.status}`);

      const newBatch: Fact[] = await res.json();

      // Stop condition
      if (newBatch.length === 0) {
        setStatus('finished');
        return;
      }

      // Deduplication Logic
      const uniqueItems: Fact[] = [];
      newBatch.forEach((item) => {
        // Only add if we haven't seen this ID before
        if (!seenIds.current.has(item.id)) {
          seenIds.current.add(item.id);
          uniqueItems.push(item);
        }
      });

      setItems((prev) => [...prev, ...uniqueItems]);
      setStatus('idle');

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error(err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
    return () => abortControllerRef.current?.abort();
  }, [fetchPage]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage);
  };

  return (
    <div className="min-h-screen w-full bg-[#FDFCF5] text-black font-sans flex flex-col items-center p-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-light tracking-tighter lowercase">Scientific Facts.</h1>
        <p className="mt-2 text-xs text-gray-500 font-mono">
          50 Unique Records • Deduplicated Stream
        </p>
      </header>

      <div className="w-full max-w-2xl space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border border-black bg-white p-6 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] font-mono bg-black text-white px-2 py-1 uppercase">
                {item.category}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">{item.id}</span>
            </div>
            <h3 className="text-lg font-medium">{item.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          </div>
        ))}

        {status === 'loading' && (
           <div className="py-8 text-center animate-pulse">
             <span className="font-mono text-xs uppercase tracking-widest bg-gray-200 px-4 py-2">Loading...</span>
           </div>
        )}
        
        {status === 'error' && (
          <div className="text-center py-4 text-red-600 text-sm">
            Error loading data. <button onClick={() => fetchPage(page)} className="underline font-bold">Retry</button>
          </div>
        )}

        {status === 'finished' && (
          <div className="text-center py-8 text-gray-400 font-mono text-xs uppercase">
            End of Knowledge Base
          </div>
        )}

        {status === 'idle' && (
          <button 
            onClick={handleLoadMore}
            className="w-full py-4 mt-4 border border-black hover:bg-black hover:text-white transition-colors text-xs font-mono uppercase tracking-widest"
          >
            Load More Data
          </button>
        )}
      </div>
      
      <div className="fixed bottom-4 right-4 bg-white border border-black p-2 text-[10px] font-mono">
        Total Loaded: {items.length} / 50
      </div>
    </div>
  );
}