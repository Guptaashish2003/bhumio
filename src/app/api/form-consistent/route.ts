// src/app/api/form-consistent/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface TransactionRequest {
  email: string;
  amount: number;
  idempotencyKey: string;
}

interface StoredTransaction {
  email: string;
  amount: number;
  date: Date;
}


const processedTransactions = new Map<string, StoredTransaction>();

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// --- API Handler ---
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TransactionRequest;
    const { email, amount, idempotencyKey } = body;

    // Basic validation
    if (!email || !amount || !idempotencyKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. IDEMPOTENCY CHECK
    // If we've already processed this key, return the saved result immediately.
    // This prevents creating duplicate records if the client retries a request
    // where the response was lost due to a network issue.
    if (processedTransactions.has(idempotencyKey)) {
      console.log(`[API] Idempotent replay for key: ${idempotencyKey}`);
      return NextResponse.json(
        {
          message: 'Transaction already processed',
          status: 'success',
          id: idempotencyKey,
        },
        { status: 200 }
      );
    }

    // 2. SIMULATE RANDOM NETWORK/SERVICE BEHAVIOR
    const random = Math.random();

    // Case A: Temporary Failure (503) - 30% chance
    if (random < 0.3) {
      console.log(`[API] Simulating 503 Service Unavailable for key: ${idempotencyKey}`);
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }

    // Case B: Delayed Success - 20% chance
    if (random < 0.5) {
      console.log(`[API] Simulating delayed success for key: ${idempotencyKey}`);
      await delay(5000 + Math.random() * 5000); // 5-10 second delay
    }

    // Case C: Immediate Success (Default)
    // Save the transaction to our "database"
    processedTransactions.set(idempotencyKey, { email, amount, date: new Date() });
    
    console.log(`[API] Successfully processed key: ${idempotencyKey}`);
    return NextResponse.json(
      {
        message: 'Transaction recorded successfully',
        status: 'success',
        id: idempotencyKey,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API] Internal Server Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}