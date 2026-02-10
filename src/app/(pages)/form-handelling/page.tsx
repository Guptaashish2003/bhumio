'use client';

import React, { useState, useEffect, useCallback } from 'react';

// --- TYPES ---

type ValidationMode = 'relaxed' | 'strict';

interface FormState {
  email: string;
  age: string; // Keeping as string to handle empty states better than number
  notes: string;
}

interface ValidationRules {
  emailRegex: RegExp;
  minAge: number;
  maxAge: number;
  notesRequired: boolean;
}

// Configuration for our "Dynamic" Twist
const RULES_CONFIG: Record<ValidationMode, ValidationRules> = {
  relaxed: {
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Simple check
    minAge: 18,
    maxAge: 100,
    notesRequired: false,
  },
  strict: {
    emailRegex: /^[a-zA-Z0-9._%+-]+@(corporate|business|bhumio)\.com$/, // specific domain only
    minAge: 21,
    maxAge: 65,
    notesRequired: true,
  }
};

// --- MOCK SERVER ---
// Simulates network delay and server-side validation logic that differs from client
const mockSubmitData = async (data: FormState): Promise<{ success: boolean; errors?: Record<string, string> }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // SERVER RULE: Even if valid client-side, we reject "test" emails
      if (data.email.toLowerCase().includes('test')) {
        resolve({
          success: false,
          errors: { email: 'Server: This email domain is blacklisted.' }
        });
        return;
      }

      // SERVER RULE: We are "out of stock" for specific ages
      if (parseInt(data.age) === 30) {
        resolve({
          success: false,
          errors: { age: 'Server: Allocation for age 30 is full.' }
        });
        return;
      }

      // SERVER RULE: Global error (Generic)
      if (Math.random() > 0.8) {
        resolve({
          success: false,
          errors: { root: 'Server: random API gateway timeout. Try again.' }
        });
        return;
      }

      resolve({ success: true });
    }, 1500); // 1.5s delay
  });
};

// --- COMPONENT ---

const DynamicForm = () => {
  // 1. Setup State
  const [mode, setMode] = useState<ValidationMode>('relaxed');
  const [formData, setFormData] = useState<FormState>({ email: '', age: '', notes: '' });
  
  // distinct error states
  const [clientErrors, setClientErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<keyof FormState | 'root', string>>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 2. Validation Engine
  // Wrapped in callback to ensure it always uses the *current* mode's rules
  const validateField = useCallback((name: keyof FormState, value: string): string | null => {
    const rules = RULES_CONFIG[mode];

    if (name === 'email') {
      if (!value) return 'Email is required';
      if (!rules.emailRegex.test(value)) {
        return mode === 'strict' 
          ? 'Strict Mode: Must be a @corporate.com, @business.com, or @bhumio.com email' 
          : 'Invalid email format';
      }
    }

    if (name === 'age') {
      if (!value) return 'Age is required';
      const num = Number(value);
      if (isNaN(num)) return 'Must be a number';
      if (num < rules.minAge) return `Must be at least ${rules.minAge}`;
      if (num > rules.maxAge) return `Must be under ${rules.maxAge}`;
    }

    if (name === 'notes') {
      if (rules.notesRequired && !value.trim()) return 'Notes are required in Strict mode';
    }

    return null;
  }, [mode]);

  // 3. Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear Server Errors immediately on change (UX: user is fixing it)
    if (serverErrors[name as keyof FormState]) {
      setServerErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof FormState];
        return newErrors;
      });
    }

    // Live Client Validation
    // We only show client errors if the user has typed something (or on blur - but keeping simple here)
    const error = validateField(name as keyof FormState, value);
    setClientErrors(prev => ({
      ...prev,
      [name]: error || undefined // if null, remove key
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(false);
    setServerErrors({}); // Clear previous server errors
    
    // 1. Run Full Client Validation
    const newClientErrors: typeof clientErrors = {};
    let hasError = false;

    (Object.keys(formData) as Array<keyof FormState>).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        newClientErrors[key] = error;
        hasError = true;
      }
    });

    setClientErrors(newClientErrors);

    if (hasError) return; // Stop if client rules fail

    // 2. Submit to Server
    setIsSubmitting(true);
    
    try {
      const response = await mockSubmitData(formData);
      
      if (!response.success && response.errors) {
        // Handle Server Errors without losing input
        setServerErrors(response.errors);
      } else {
        setSubmitSuccess(true);
        // Optional: Reset form? The prompt says "Do not lose user input on error", 
        // usually on success we DO clear, but I'll leave it populated to show the result.
      }
    } catch {
      setServerErrors({ root: 'Unexpected network crash' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Effect: When rules change (dynamic twist), re-validate visible fields immediately
  useEffect(() => {
    setClientErrors(prev => {
      const newErrors: typeof clientErrors = {};
      let hasChanges = false;
      
      (Object.keys(formData) as Array<keyof FormState>).forEach(key => {
        // Only re-validate if there was already data or an error
        if (formData[key] || prev[key]) {
          const error = validateField(key, formData[key]);
          if (error !== prev[key]) {
            newErrors[key] = error || undefined;
            hasChanges = true;
          } else {
            newErrors[key] = prev[key];
          }
        }
      });
      return hasChanges ? newErrors : prev;
    });
  }, [mode, formData, validateField]); // Re-run when mode changes

  return (
    <div className="min-h-screen w-full bg-[#FDFCF5] text-black font-sans p-8 flex flex-col items-center justify-center">
      
      <div className="w-full max-w-lg">
        {/* HEADER */}
        <div className="mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-light tracking-tighter lowercase">Dynamic Validator.</h1>
          <p className="mt-2 text-xs text-gray-500 font-mono">
            Client Rules: {mode.toUpperCase()} | Server: MOCKED
          </p>
        </div>

        {/* CONTROLS (The Twist) */}
        <div className="mb-6 bg-white border border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          <label className="text-xs font-mono font-bold uppercase tracking-widest mb-2 block">
            Validation Rule Set
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('relaxed')}
              className={`flex-1 py-2 text-xs font-mono border transition-all ${
                mode === 'relaxed' ? 'bg-black text-white border-black' : 'bg-transparent text-gray-400 border-gray-200 hover:border-black'
              }`}
            >
              Relaxed (Any Email, 18+)
            </button>
            <button
              onClick={() => setMode('strict')}
              className={`flex-1 py-2 text-xs font-mono border transition-all ${
                mode === 'strict' ? 'bg-black text-white border-black' : 'bg-transparent text-gray-400 border-gray-200 hover:border-black'
              }`}
            >
              Strict (Corp Only, 21-65)
            </button>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* EMAIL FIELD */}
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-widest mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              type="text"
              value={formData.email}
              onChange={handleChange}
              className={`w-full bg-white border p-3 font-mono text-sm outline-none transition-all
                ${clientErrors.email ? 'border-red-500 text-red-600' : ''}
                ${serverErrors.email ? 'border-orange-500' : ''}
                ${!clientErrors.email && !serverErrors.email ? 'border-black focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]' : ''}
              `}
              placeholder="user@example.com"
            />
            {/* Error Display Area */}
            <div className="h-5 mt-1 text-[10px] font-mono flex gap-2">
              {clientErrors.email && <span className="text-red-600">CLIENT: {clientErrors.email}</span>}
              {serverErrors.email && <span className="text-orange-600 font-bold">SERVER: {serverErrors.email}</span>}
            </div>
          </div>

          {/* NUMERIC FIELD */}
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-widest mb-1">
              Age (Numeric) <span className="text-red-500">*</span>
            </label>
            <input
              name="age"
              type="number" // HTML5 constraint, but we validate manually too
              value={formData.age}
              onChange={handleChange}
              className={`w-full bg-white border p-3 font-mono text-sm outline-none transition-all
                ${clientErrors.age ? 'border-red-500 text-red-600' : ''}
                ${serverErrors.age ? 'border-orange-500' : ''}
                ${!clientErrors.age && !serverErrors.age ? 'border-black focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]' : ''}
              `}
              placeholder="e.g. 25"
            />
             <div className="h-5 mt-1 text-[10px] font-mono flex gap-2">
              {clientErrors.age && <span className="text-red-600">CLIENT: {clientErrors.age}</span>}
              {serverErrors.age && <span className="text-orange-600 font-bold">SERVER: {serverErrors.age}</span>}
            </div>
          </div>

          {/* TEXT AREA (Conditional Requirement) */}
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-widest mb-1">
              Notes {mode === 'strict' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className={`w-full bg-white border p-3 font-mono text-sm outline-none transition-all
                ${clientErrors.notes ? 'border-red-500 text-red-600' : ''}
                ${!clientErrors.notes ? 'border-black focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]' : ''}
              `}
              placeholder={mode === 'strict' ? "Required explanation..." : "Optional notes..."}
            />
             <div className="h-5 mt-1 text-[10px] font-mono">
              {clientErrors.notes && <span className="text-red-600">CLIENT: {clientErrors.notes}</span>}
            </div>
          </div>

          {/* ROOT ERRORS */}
          {serverErrors.root && (
             <div className="bg-orange-50 border-l-4 border-orange-500 p-3 text-xs font-mono text-orange-800">
               {serverErrors.root}
             </div>
          )}

          {/* SUCCESS MESSAGE */}
          {submitSuccess && (
             <div className="bg-green-50 border-l-4 border-green-500 p-3 text-xs font-mono text-green-800">
               Success! Data processed by server.
             </div>
          )}

          {/* ACTIONS */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 font-bold uppercase tracking-wider transition-all border border-black
              ${isSubmitting 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-black text-[#FDFCF5] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1'
              }
            `}
          >
            {isSubmitting ? 'Validating on Server...' : 'Submit Form'}
          </button>

        </form>
      </div>

      {/* DEBUG PANEL */}
      <div className="mt-12 w-full max-w-lg border-t border-dashed border-gray-300 pt-4 opacity-50 hover:opacity-100 transition-opacity">
        <h3 className="font-mono text-[10px] uppercase text-gray-400 mb-2">Internal State</h3>
        <pre className="text-[10px] bg-gray-100 p-2 overflow-auto font-mono">
          {JSON.stringify({ mode, values: formData, clientErrors, serverErrors }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DynamicForm;