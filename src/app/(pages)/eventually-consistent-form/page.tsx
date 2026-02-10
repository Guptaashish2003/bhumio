'use client';

import React, { useState, useEffect, useRef } from 'react';

// --- Type Definitions ---
type TransactionStatus = 'pending' | 'retrying' | 'success' | 'error';

interface Transaction {
  id: string; // Idempotency key
  email: string;
  amount: string; 
  status: TransactionStatus;
  timestamp: number; // Added to sort by date if needed
}

const Page = () => {
  const [email, setEmail] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Ref to track if we have loaded from storage yet (prevents overwriting LS with empty array on init)
  const isLoaded = useRef(false);

  // --- EFFECT 1: Load from LocalStorage & Resume Pending ---
  useEffect(() => {
    const savedLogs = localStorage.getItem('bhumio-tx-logs');
    if (savedLogs) {
      try {
        const parsedLogs: Transaction[] = JSON.parse(savedLogs);
        setTransactions(parsedLogs);
        
        // RESUME LOGIC: Check for 'pending' or 'retrying' items and restart them
        // This ensures eventual consistency even if the user quits the browser
        parsedLogs.forEach(tx => {
          if (tx.status === 'pending' || tx.status === 'retrying') {
            console.log(`[Resume] Restarting transaction ${tx.id}`);
            processTransaction(tx, 1);
          }
        });
      } catch (e) {
        console.error("Failed to parse logs", e);
      }
    }
    isLoaded.current = true;
  }, []);

  // --- EFFECT 2: Save to LocalStorage ---
  useEffect(() => {
    // Only save if we have finished the initial load
    if (isLoaded.current) {
      localStorage.setItem('bhumio-tx-logs', JSON.stringify(transactions));
    }
  }, [transactions]);

  // --- HANDLER: Submit ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !amount) return;

    const idempotencyKey = crypto.randomUUID();

    const newTransaction: Transaction = {
      id: idempotencyKey,
      email,
      amount,
      status: 'pending',
      timestamp: Date.now(),
    };

    // Update UI immediately (Optimistic)
    setTransactions((prev) => [newTransaction, ...prev]);
    setEmail('');
    setAmount('');

    // Start network process
    processTransaction(newTransaction);
  };

  // --- HANDLER: Clear Logs ---
  const clearLogs = () => {
    if(confirm('Clear all local logs?')) {
      setTransactions([]);
      localStorage.removeItem('bhumio-tx-logs');
    }
  };

  // --- LOGIC: Recursive Retry ---
  // Note: We don't define this inside useEffect so we can call it from the Submit handler AND the Resume logic
  const processTransaction = async (tx: Transaction, attempt = 1) => {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 2000; 

    // Update status to 'retrying' if attempting more than once
    if (attempt > 1) {
      updateTransactionStatus(tx.id, 'retrying');
    }

    try {
      // Pass the SAME idempotency key. 
      // If the API has seen it, it returns the previous success.
      // If the API hasn't, it processes it.
      const response = await fetch('/api/form-consistent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: tx.email,
          amount: parseFloat(tx.amount),
          idempotencyKey: tx.id,
        }),
      });

      if (response.status === 503) {
        throw new Error('Service Unavailable');
      }

      if (response.ok) {
        updateTransactionStatus(tx.id, 'success');
      } else {
        // Hard failure (400, 500)
        updateTransactionStatus(tx.id, 'error');
      }
    } catch {
      if (attempt < MAX_RETRIES) {
        console.log(`[${tx.id}] Attempt ${attempt} failed. Retrying in ${RETRY_DELAY}ms...`);
        setTimeout(() => processTransaction(tx, attempt + 1), RETRY_DELAY);
      } else {
        console.error(`[${tx.id}] Failed after ${MAX_RETRIES} attempts.`);
        updateTransactionStatus(tx.id, 'error');
      }
    }
  };

  const updateTransactionStatus = (id: string, status: TransactionStatus) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen w-full bg-[#FDFCF5] text-black font-sans flex flex-col items-center p-8 md:p-16">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-light tracking-tighter lowercase">
          Bhumio.
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-mono">
          Eventually Consistent Payments
        </p>
      </header>

      <div className="w-full max-w-md space-y-12">
        
        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs font-mono mb-2 opacity-60">EMAIL ADDRESS</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border border-black p-4 text-lg focus:outline-none focus:bg-black focus:text-[#FDFCF5] transition-colors placeholder:text-gray-400"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label htmlFor="amount" className="block text-xs font-mono mb-2 opacity-60">AMOUNT (USD)</label>
              <input
                id="amount"
                type="number"
                required
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent border border-black p-4 text-lg focus:outline-none focus:bg-black focus:text-[#FDFCF5] transition-colors placeholder:text-gray-400"
                placeholder="0.00"
              />
            </div>
          <button
            type="submit"
            className="w-full bg-black text-[#FDFCF5] p-5 font-medium transition-all duration-300 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 active:translate-y-0 active:shadow-none"
          >
            Submit Transaction
          </button>
        </form>

        <div className="h-px w-full bg-black opacity-10"></div>

        {/* LOGS HEADER */}
        <div className="flex justify-between items-end">
          <h3 className="text-sm font-mono opacity-50 uppercase tracking-widest">Transaction Log</h3>
          {transactions.length > 0 && (
            <button 
              onClick={clearLogs}
              className="text-[10px] font-mono underline hover:no-underline opacity-60 hover:opacity-100"
            >
              CLEAR HISTORY
            </button>
          )}
        </div>

        {/* LOGS LIST */}
        <div className="space-y-4">
          {!isLoaded.current ? (
            <p className="text-center text-gray-400 text-sm py-4">Loading history...</p>
          ) : transactions.length === 0 ? (
             <p className="text-center text-gray-400 italic text-sm py-4">No transactions yet.</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="group w-full border border-black/20 p-4 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-md font-medium">{tx.email}</h2>
                    <p className="font-mono text-xs text-gray-500">${parseFloat(tx.amount).toFixed(2)}</p>
                  </div>
                  <StatusBadge status={tx.status} />
                </div>
                <div className="max-h-0 overflow-hidden group-hover:max-h-16 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <p className="mt-2 text-[10px] font-mono text-gray-400 pt-2 border-t border-dashed border-gray-300">
                    ID: {tx.id}<br/>
                    TIME: {new Date(tx.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

// --- Subcomponent ---
const StatusBadge = ({ status }: { status: TransactionStatus }) => {
  const styles: Record<TransactionStatus, string> = {
    pending: 'bg-gray-200 text-black',
    retrying: 'bg-yellow-100 text-yellow-800 animate-pulse',
    success: 'bg-black text-[#FDFCF5]',
    error: 'bg-red-100 text-red-800',
  };

  const labels: Record<TransactionStatus, string> = {
    pending: 'Processing...',
    retrying: 'Retrying...',
    success: 'Confirmed',
    error: 'Failed',
  };

  return (
    <span className={`px-3 py-1 text-xs font-mono uppercase tracking-wider ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default Page;