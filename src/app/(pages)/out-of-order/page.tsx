'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

// --- TYPES ---
// The "Backend" sends these types
type EventType = 'created' | 'updated' | 'deleted';

interface ServerEvent {
  id: string;
  timestamp: number;
  type: EventType;
  payload: string; // e.g., "Order #123 - PENDING"
}

// The "Frontend" stores this state
interface ItemState {
  id: string;
  lastUpdated: number;
  type: EventType; // We store the type here to show it in the UI
  payload: string;
}

// --- COMPONENT ---
const OutOfOrderPage = () => {
  const [eventLog, setEventLog] = useState<ServerEvent[]>([]);
  
  // The Source of Truth (O(1) Map)
  const stateMap = useRef<Map<string, ItemState>>(new Map());
  
  // UI State
  const [activeItems, setActiveItems] = useState<ItemState[]>([]);
  const [allItemsInStorage, setAllItemsInStorage] = useState<ItemState[]>([]);
  const isLoaded = useRef(false);

  // --- 1. LOAD (Hydration) ---
  useEffect(() => {
    const savedData = localStorage.getItem('bhumio-orders-db');
    if (savedData) {
      try {
        const parsedEntries = JSON.parse(savedData);
        stateMap.current = new Map(parsedEntries);
        refreshUI();
      } catch (e) {
        console.error("Failed to load storage", e);
      }
    }
    isLoaded.current = true;
  }, []);

  // --- 2. SAVE ---
  const saveToStorage = () => {
    if (!isLoaded.current) return;
    const entries = Array.from(stateMap.current.entries());
    localStorage.setItem('bhumio-orders-db', JSON.stringify(entries));
  };

  // --- 3. REFRESH UI ---
  const refreshUI = () => {
    const allItems = Array.from(stateMap.current.values());
    
    // ACTIVE VIEW: Show Created and Updated (Hide Deleted)
    const active = allItems.filter(item => item.type !== 'deleted');
    active.sort((a, b) => a.id.localeCompare(b.id));

    // DEBUG VIEW: Show Everything (Newest First)
    allItems.sort((a, b) => b.lastUpdated - a.lastUpdated); 

    setActiveItems(active);
    setAllItemsInStorage(allItems);
  };

  // --- 4. PROCESS EVENT (The Core Logic) ---
  const processEvent = useCallback((newEvent: ServerEvent) => {
    setEventLog((prev) => [newEvent, ...prev]);

    const currentMap = stateMap.current;
    const existingRecord = currentMap.get(newEvent.id);

    // LOGIC: Check Timestamps
    if (existingRecord && existingRecord.lastUpdated >= newEvent.timestamp) {
      console.log(`[Ignored] Late event for ${newEvent.id}`);
      return; 
    }

    // UPDATE STATE
    // We overwrite the *entire* object.
    // This is how the "type" gets updated from 'created' to 'updated'.
    currentMap.set(newEvent.id, {
      id: newEvent.id,
      lastUpdated: newEvent.timestamp,
      type: newEvent.type, // <--- This updates the type in our state
      payload: newEvent.payload,
    });

    saveToStorage();
    refreshUI();
  }, []);


  // --- SIMULATION: REAL ORDER FLOW ---
  const generateOrderFlow = () => {
    const id = `ORD-${Math.floor(Math.random() * 900) + 100}`; // Random ID like ORD-123
    const t = Date.now();

    // The Backend sends 3 events for this ONE order
    const events: ServerEvent[] = [
      // 1. Initial Creation
      { id, timestamp: t, type: 'created', payload: `Order ${id} - PENDING` },
      
      // 2. Status Update (Payment Confirmed)
      { id, timestamp: t + 2000, type: 'updated', payload: `Order ${id} - CONFIRMED` },
      
      // 3. Status Update (Shipped)
      { id, timestamp: t + 5000, type: 'updated', payload: `Order ${id} - SHIPPED` },
    ];

    // Shuffle them to simulate Out-of-Order arrival
    // (We might receive 'SHIPPED' before 'CREATED'!)
    const shuffled = events.sort(() => Math.random() - 0.5);

    shuffled.forEach((ev, i) => {
      setTimeout(() => processEvent(ev), i * 1000);
    });
  };

  const clearStorage = () => {
    localStorage.removeItem('bhumio-orders-db');
    stateMap.current.clear();
    setEventLog([]);
    refreshUI();
  };

  return (
    <div className="min-h-screen w-full bg-[#FDFCF5] text-black font-sans p-8 flex flex-col items-center">
      
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-light tracking-tighter lowercase">Order Stream.</h1>
        <p className="mt-2 text-xs text-gray-500 font-mono">
          Simulating Backend Events: Created → Updated → Shipped
        </p>
      </header>

      {/* CONTROLS */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={generateOrderFlow}
          className="bg-black text-[#FDFCF5] px-6 py-3 font-medium hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all"
        >
          Simulate Order (Shuffle)
        </button>
        <button
          onClick={clearStorage}
          className="border border-black px-6 py-3 font-medium hover:bg-black hover:text-[#FDFCF5] transition-all"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
        
        {/* COLUMN 1: ACTIVE ORDERS (UI) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-black pb-2">
            <h2 className="font-mono text-xs uppercase tracking-widest opacity-50">
              Current Orders (UI)
            </h2>
            <span className="text-xs font-bold">{activeItems.length} Active</span>
          </div>
          
          <div className="grid gap-3">
            {activeItems.length === 0 && <p className="text-sm text-gray-400 italic">No active orders.</p>}
            {activeItems.map((item) => (
              <div key={item.id} className="border border-black p-4 bg-white flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
                <div>
                  {/* Shows the Payload (e.g. Order - SHIPPED) */}
                  <h3 className="text-lg font-medium">{item.payload}</h3>
                  <p className="font-mono text-[10px] text-gray-400">ID: {item.id}</p>
                </div>

                {/* --- HERE IS THE DYNAMIC TYPE BADGE --- */}
                <div className={`
                    px-2 py-1 text-[10px] font-mono uppercase tracking-wider border
                    ${item.type === 'created' ? 'bg-black text-white border-black' : ''}
                    ${item.type === 'updated' ? 'bg-white text-black border-black' : ''}
                  `}>
                  {item.type}
                </div>
                {/* -------------------------------------- */}
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: INTERNAL STATE (DB) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-black pb-2">
            <h2 className="font-mono text-xs uppercase tracking-widest opacity-50">
              Backend State (LocalStorage)
            </h2>
          </div>

          <div className="space-y-2 bg-gray-50 p-4 border border-black/10 max-h-[500px] overflow-y-auto">
             {allItemsInStorage.map((item) => (
               <div 
                 key={item.id} 
                 className={`flex items-center justify-between p-2 border-l-2 text-xs font-mono transition-colors ${
                   item.type === 'deleted' ? 'border-red-500 bg-red-50 opacity-60' : 'border-black bg-white'
                 }`}
               >
                 <div className="flex flex-col">
                   <span className="font-bold">{item.id}</span>
                   <span>{item.payload}</span>
                 </div>
                 <div className="text-right">
                   {/* We display the TYPE stored in the DB */}
                   <div className="uppercase font-bold tracking-wider">{item.type}</div>
                   <div className="opacity-50 text-[10px]">{item.lastUpdated.toString().slice(-6)}</div>
                 </div>
               </div>
             ))}
          </div>
        </div>

      </div>

      {/* RAW FEED LOG */}
      <div className="mt-12 w-full max-w-2xl border-t border-dashed border-gray-300 pt-4">
        <h3 className="font-mono text-xs text-gray-400 mb-2">LIVE INCOMING EVENTS</h3>
        <div className="flex flex-col gap-1">
           {eventLog.slice(0, 5).map((ev, i) => (
             <div key={i} className="text-[10px] flex justify-between font-mono text-gray-500">
               <span>Input: {ev.type.toUpperCase()}</span>
               <span>{ev.payload}</span>
               <span>T={ev.timestamp.toString().slice(-5)}</span>
             </div>
           ))}
        </div>
      </div>

    </div>
  );
};

export default OutOfOrderPage;