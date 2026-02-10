# Bhumio Assignments

A collection of four advanced frontend engineering challenges built with Next.js 14+, demonstrating resilient user interfaces, eventual consistency patterns, and complex state management.

---

## 📑 Table of Contents

### 🎯 Quick Navigation to Assignments
- [Assignment 01: Eventually Consistent Form](#assignment-01-eventually-consistent-form)
- [Assignment 02: Out-of-Order Event Handling](#assignment-02-out-of-order-event-handling)
- [Assignment 03: Quirky Pagination](#assignment-03-quirky-pagination)
- [Assignment 04: Dynamic Form Validator](#assignment-04-dynamic-form-validator)

### 📚 Additional Sections
- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Design System](#-design-system)
- [Project Structure](#-project-structure)
- [Testing Scenarios](#-testing-scenarios)
- [Technical Highlights](#-technical-highlights)
- [API Documentation](#-api-documentation)
- [Learning Outcomes](#-learning-outcomes)

---

## 🎯 Project Overview

This project contains four distinct assignments that tackle real-world distributed systems challenges from a frontend perspective:

1. **Eventually Consistent Form** - Handling network failures with retry logic and idempotency
2. **Out-of-Order Event Handling** - Processing events that arrive in random order
3. **Quirky Pagination** - Managing unreliable paginated data streams
4. **Dynamic Form Validator** - Handling client/server validation conflicts

## 🚀 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks + LocalStorage
- **API**: Next.js Route Handlers

## 📦 Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd bhumio

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the assignment portal.

## 📋 Assignment Details

### Assignment 01: Eventually Consistent Form

**Time**: 3-5 hours  
**Route**: `/eventually-consistent-form`

#### The Challenge
Build a payment form that gracefully handles network failures, prevents duplicate transactions, and maintains consistency even when the browser is closed mid-transaction.

#### Features Implemented
- **Idempotency Keys**: Each transaction gets a unique UUID that prevents duplicate processing
- **Automatic Retry Logic**: Failed requests retry up to 5 times with 2-second delays
- **State Persistence**: Transactions persist in LocalStorage and resume on page reload
- **Optimistic UI**: Immediate feedback with status tracking (pending → retrying → success/error)
- **Mock API Simulation**: 
  - 30% chance of 503 errors (triggers retry)
  - 20% chance of 5-10 second delays
  - 50% immediate success

#### Key Technical Decisions

**State Transitions**:
```
pending → (API call) → success
pending → (503 error) → retrying → (API call) → success
pending → (5 retries failed) → error
```

**Preventing Duplicates**:
- Client: Each form submission generates a crypto.randomUUID()
- Server: Map-based idempotency cache checks if key was already processed
- LocalStorage: Transactions indexed by idempotency key

**Retry Logic**:
```typescript
processTransaction(tx, attempt = 1) {
  if (attempt > MAX_RETRIES) { mark as error; return; }
  try {
    await fetch(...); // with same idempotency key
  } catch {
    setTimeout(() => processTransaction(tx, attempt + 1), 2000);
  }
}
```

#### Edge Cases Handled
- Browser refresh during pending transaction → Resumes on load
- Network timeout → Automatic retry
- Duplicate form submission → Idempotency key prevents double-processing
- Server already processed request → Returns cached success response

---

### Assignment 02: Out-of-Order Event Handling

**Time**: 2-5 hours  
**Route**: `/out-of-order`

#### The Challenge
Process backend events that arrive in random order (e.g., receiving "SHIPPED" before "CREATED") while maintaining correct state.

#### Features Implemented
- **Timestamp-Based Resolution**: Uses event timestamps to determine canonical state
- **O(1) State Lookup**: Map-based architecture for instant updates
- **Three Event Types**: 
  - `created` - Initial order placement
  - `updated` - Status changes (CONFIRMED → SHIPPED)
  - `deleted` - Order cancellation
- **Live Simulation**: "Simulate Order" button shuffles events to test out-of-order handling

#### Key Algorithm

```typescript
processEvent(newEvent) {
  const existing = stateMap.get(newEvent.id);
  
  // Ignore if we've seen a newer event for this ID
  if (existing && existing.lastUpdated >= newEvent.timestamp) {
    console.log('Ignoring late event');
    return;
  }
  
  // Update to latest state
  stateMap.set(newEvent.id, {
    id: newEvent.id,
    lastUpdated: newEvent.timestamp,
    type: newEvent.type,
    payload: newEvent.payload
  });
}
```

#### Edge Cases Handled
- **Late Arrivals**: Events with older timestamps are discarded
- **Duplicates**: Timestamp comparison prevents re-processing same event
- **Deleted Items**: Never reappear even if "created" arrives after "deleted"
- **Type Transitions**: UI badge dynamically shows current state (created/updated)

#### Visual Feedback
- **Active Orders Panel**: Shows non-deleted orders with latest state
- **Backend State Panel**: Complete history sorted by timestamp (newest first)
- **Live Event Feed**: Shows last 5 incoming events with timestamps

---

### Assignment 03: Quirky Pagination

**Time**: 3-4 hours  
**Route**: `/quirky`

#### The Challenge
Display paginated data from an unreliable API that:
- Sometimes returns fewer items than expected
- May return overlapping items between pages
- Has no total count
- Does not guarantee stable ordering

#### Features Implemented
- **O(1) Deduplication**: Set-based ID tracking prevents showing duplicates
- **Smart End Detection**: Empty response = end of data
- **Request Cancellation**: AbortController prevents race conditions
- **50 Unique Facts**: Deterministically generated scientific facts
- **Live Counter**: Shows total loaded vs. available (50)

#### API Chaos Simulation

```typescript
// Mock API quirks (api/quirky/route.ts)
1. Random short pages: 30% chance to return only 7/10 items
2. Overlapping data: 40% chance to include 2 items from previous page
```

#### Deduplication Strategy

```typescript
const seenIds = useRef<Set<string>>(new Set());

const uniqueItems = newBatch.filter(item => {
  if (seenIds.current.has(item.id)) return false;
  seenIds.current.add(item.id);
  return true;
});

setItems(prev => [...prev, ...uniqueItems]);
```

#### Edge Cases Handled
- **Duplicate Detection**: O(1) Set lookup prevents showing same item twice
- **End-of-List**: Empty API response triggers "finished" state
- **Partial Pages**: UI handles variable-length responses
- **Network Errors**: Retry button with error state
- **Request Cancellation**: Previous fetch aborted when new one starts

---

### Assignment 04: Dynamic Form Validator

**Time**: 3-4 hours  
**Route**: `/form-handelling`

#### The Challenge
Build a form where:
- Validation rules change dynamically (Relaxed ↔ Strict mode)
- Server may reject inputs that passed client validation
- User input is never lost
- Client and server errors are visually distinct

#### Features Implemented
- **Dual Validation Modes**:
  - **Relaxed**: Any email, age 18-100, optional notes
  - **Strict**: Corporate emails only, age 21-65, required notes
- **Real-time Client Validation**: Errors appear as user types
- **Server-Side Rejection**: Mock API rejects blacklisted emails and specific ages
- **Distinct Error Display**: Red for client errors, orange for server errors
- **Persistent Input**: Form values retained after submission errors

#### Validation Rules

| Field | Relaxed Mode | Strict Mode |
|-------|-------------|-------------|
| Email | Any valid email | Only `@corporate.com`, `@business.com`, `@bhumio.com` |
| Age | 18-100 | 21-65 |
| Notes | Optional | Required |

#### Server Rejection Rules
```typescript
// These fail AFTER client validation passes
1. Email contains "test" → Blacklisted domain
2. Age === 30 → Allocation full
3. Random 20% → API gateway timeout
```

#### Validation Flow

```
User types → Client Validation (immediate) → Display RED errors
              ↓
User submits → Check all client rules → If pass:
              ↓
          Send to Server → Server Validation → Display ORANGE errors
              ↓
          Success → Show green confirmation
```

#### Key Technical Implementation

**Dynamic Rule Re-validation**:
```typescript
useEffect(() => {
  // When mode changes, re-validate all fields
  (Object.keys(formData) as Array<keyof FormState>).forEach(key => {
    const error = validateField(key, formData[key]);
    setClientErrors(prev => ({ ...prev, [key]: error || undefined }));
  });
}, [mode]);
```

**Error Clearing Strategy**:
- Server errors clear immediately when user starts typing
- Client errors update in real-time
- Root errors (global) persist until next submission

---

## 🎨 Design System

All assignments share a consistent brutalist design language:

- **Color Palette**: `#FDFCF5` (cream background), pure black text
- **Typography**: 
  - Sans-serif for headings
  - Monospace for metadata/IDs
  - Lowercase titles with tight tracking
- **Interactions**:
  - Box shadows on hover: `4px_4px_0px_0px_rgba(0,0,0,0.2)`
  - Translate animations: `-translate-y-1`
  - Focus states: Inverted colors (black background, cream text)
- **Status Badges**:
  - Pending: Gray
  - Retrying: Yellow with pulse animation
  - Success: Black background
  - Error: Red

## 🏗️ Project Structure

```
bhumio/
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Assignment portal (home)
│   │   ├── eventually-consistent-form/
│   │   │   └── page.tsx                      # Assignment 01
│   │   ├── out-of-order/
│   │   │   └── page.tsx                      # Assignment 02
│   │   ├── quirky/
│   │   │   └── page.tsx                      # Assignment 03
│   │   ├── form-handelling/
│   │   │   └── page.tsx                      # Assignment 04
│   │   └── api/
│   │       ├── form-consistent/
│   │       │   └── route.ts                  # Mock payment API
│   │       └── quirky/
│   │           └── route.ts                  # Quirky pagination API
│   ├── components/                           # (Optional shared components)
│   └── ...
├── public/                                    # Static assets
├── tailwind.config.ts                         # Tailwind configuration
├── next.config.mjs                            # Next.js configuration
├── tsconfig.json                              # TypeScript configuration
└── README.md                                  # This file
```

## 🧪 Testing Scenarios

### Assignment 01: Eventually Consistent Form
1. Submit form → Close browser immediately → Reopen → Transaction completes
2. Submit with network disabled → Enable network → Auto-retry succeeds
3. Submit twice quickly → Only one transaction created (idempotency)
4. Clear logs → Verify LocalStorage cleaned

### Assignment 02: Out-of-Order Events
1. Click "Simulate Order" → Observe shuffled events arriving
2. Verify final state shows "SHIPPED" regardless of arrival order
3. Create order → Delete it → Verify "created" event arriving late doesn't resurrect it
4. Check Backend State panel shows complete timestamp-ordered history

### Assignment 03: Quirky Pagination
1. Load More until 50/50 → Verify no duplicates appear
2. Check console for deduplication logs
3. Refresh page → Verify fresh start (no LocalStorage persistence)
4. Observe variable page sizes (7-12 items per load)

### Assignment 04: Dynamic Form Validator
1. Toggle Relaxed ↔ Strict → Watch error messages change immediately
2. Enter `test@example.com` (valid client-side) → Submit → Server rejects
3. Enter age 30 → Submit → Server allocation error
4. Switch to Strict mid-typing → Notes become required
5. Verify all input retained after server errors

## 🔧 Technical Highlights

### Performance Optimizations
- **O(1) Lookups**: Map/Set data structures for deduplication
- **Request Cancellation**: AbortController prevents race conditions
- **Lazy Evaluation**: Validation only runs on changed fields
- **Memoization**: useCallback for stable function references

### Resilience Patterns
- **Exponential Backoff**: Retry delays (configurable)
- **Circuit Breaker**: Max retry limits prevent infinite loops
- **Optimistic Updates**: Immediate UI feedback
- **State Reconciliation**: Timestamp-based conflict resolution

### Data Persistence
- **LocalStorage**: Transaction logs, event history
- **In-Memory Cache**: Server idempotency map
- **Hydration**: Resume interrupted operations on page load

## 📝 API Documentation

### POST `/api/form-consistent`

**Request**:
```json
{
  "email": "user@example.com",
  "amount": 99.99,
  "idempotencyKey": "uuid-here"
}
```

**Responses**:
- `200`: Success (or idempotent replay)
- `400`: Missing required fields
- `503`: Service temporarily unavailable (triggers client retry)
- `500`: Unexpected server error

### GET `/api/quirky?page=1`

**Response** (variable length, 0-12 items):
```json
[
  {
    "id": "unique-record-1000",
    "category": "Space",
    "title": "Insight #1: The Quantum Computer",
    "description": "The Quantum Computer analyzes complex data streams...",
    "timestamp": 1739158400000
  }
]
```

**Quirks**:
- May return 7 items instead of 10
- May include 2 items from previous page
- Returns `[]` when no more data

## 🐛 Known Limitations

1. **Assignment 01**: Server-side idempotency cache resets on server restart (no database)
2. **Assignment 02**: Event history limited to browser session (no backend persistence)
3. **Assignment 03**: No pagination state preservation on page refresh
4. **Assignment 04**: Server validation rules are mock implementations

## 🚀 Future Enhancements

- [ ] Add WebSocket support for real-time event streaming (Assignment 02)
- [ ] Implement IndexedDB for larger transaction logs (Assignment 01)
- [ ] Add infinite scroll with virtual windowing (Assignment 03)
- [ ] Server-side validation rule configuration via API (Assignment 04)
- [ ] Unit tests with Jest + React Testing Library
- [ ] End-to-end tests with Playwright
- [ ] Accessibility audit and WCAG 2.1 compliance
- [ ] Mobile-responsive optimizations

## 📖 Learning Outcomes

These assignments demonstrate mastery of:

✅ **Distributed Systems Concepts**: Idempotency, eventual consistency, conflict resolution  
✅ **Advanced React Patterns**: useRef for mutable state, useCallback for stable functions  
✅ **Error Handling**: Graceful degradation, retry logic, user-friendly error messages  
✅ **Data Structures**: Map/Set for O(1) operations, efficient deduplication  
✅ **State Management**: Complex state machines, transitions, persistence  
✅ **API Design**: Resilient clients for unreliable APIs  
✅ **UX Engineering**: Optimistic updates, loading states, clear error communication

## 👤 Author

**Ashish Gupta**

Built as part of technical assessment for frontend engineering role.

## 📄 License

This project is created for educational and assessment purposes.

---

**Note**: All API delays and error simulations are intentional to demonstrate resilience patterns. In production, these would be replaced with actual backend integrations.