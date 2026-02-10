import { NextRequest, NextResponse } from 'next/server';

// --- 1. GENERATE 500 UNIQUE FACTS ---
// We use combinatorics to ensure every fact is unique and readable.
const SUBJECTS = ["The Quantum Computer", "A Mars Rover", "The Human DNA", "Dark Matter", "An AI Algorithm", "The Blue Whale", "A Neutron Star", "The Space Station", "Genetic Editing", "Virtual Reality"];
const VERBS = ["analyzes", "calculates", "discovers", "simulates", "orbits", "consumes", "transforms", "decodes", "navigates", "transmits"];
const ADJECTIVES = ["complex", "infinite", "microscopic", "ancient", "glowing", "radioactive", "digital", "frozen", "intelligent", "silent"];
const OBJECTS = ["data streams", "star clusters", "neural networks", "cosmic dust", "deep sea trenches", "encryption keys", "solar flares", "alien signals", "genetic sequences", "quantum bits"];

// Helper to generate a unique sentence based on index
const generateFact = (index: number) => {
  // Use the index to pick words deterministically so it's consistent across reloads
  const s = SUBJECTS[index % SUBJECTS.length];
  const v = VERBS[(index + 2) % VERBS.length];
  const a = ADJECTIVES[(index + 5) % ADJECTIVES.length];
  const o = OBJECTS[(index + 3) % OBJECTS.length];
  
  return `${s} ${v} ${a} ${o} in a way that defies current physics.`;
};

// Create the simulation Database
const FACTS_DB = Array.from({ length: 50 }, (_, i) => {
  const categories = ['Space', 'Species', 'Tech'] as const;
  return {
    id: `unique-record-${i + 1000}`, // Unique ID starting at 1000
    category: categories[i % 3],
    title: `Insight #${i + 1}: ${SUBJECTS[i % SUBJECTS.length]}`,
    description: generateFact(i),
    timestamp: Date.now() - i * 50000,
  };
});

// --- 2. THE QUIRKY API HANDLER ---
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const PAGE_SIZE = 10;

  // Artificial Delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  // STOP CONDITION: If requested page is beyond data
  if (start >= FACTS_DB.length) {
    return NextResponse.json([]);
  }

  let result = FACTS_DB.slice(start, end);

  // --- INJECT CHAOS (Assignment Constraints) ---
  
  // CONSTRAINT 1: "Sometimes returns fewer items" (30% chance)
  if (result.length === PAGE_SIZE && Math.random() > 0.7) {
    // Drop the last 3 items
    result = result.slice(0, 7); 
  }

  // CONSTRAINT 2: "Returns overlapping items" (40% chance)
  // We take items from the PREVIOUS page and put them at the start of this page.
  // The frontend MUST filter these out.
  if (page > 1 && Math.random() > 0.6) {
    const previousItems = FACTS_DB.slice(start - 2, start);
    result = [...previousItems, ...result]; 
  }

  return NextResponse.json(result);
}