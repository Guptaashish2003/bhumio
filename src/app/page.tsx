import React from 'react';

const Page = () => {
  const assignments = [
    { id: 1, title: 'Assignment 01', subtitle: 'Eventually Consistent Form', href: '/eventually-consistent-form' },
    { id: 2, title: 'Assignment 02', subtitle: 'Out-of-Order Event Handling', href: '/out-of-order' },
    { id: 3, title: 'Assignment 03', subtitle: 'Quirky Pagination', href: '/quirky' },
    { id: 4, title: 'Assignment 04', subtitle: 'Form Validator', href: '/form-handelling' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#FDFCF5] text-black font-sans flex flex-col items-center justify-center p-8">
      
      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-light tracking-tighter lowercase">
          Bhumio
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-mono">
          assignments
        </p>
      </header>

      {/* Links Container */}
      <div className="w-full max-w-md space-y-4">
        {assignments.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="group relative block w-full border border-black px-6 py-5 transition-all duration-300 ease-out 
                       hover:bg-black hover:text-[#FDFCF5] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs opacity-60 mb-1 block group-hover:opacity-80">
                  0{item.id}
                </span>
                <h2 className="text-lg font-medium tracking-tight">
                  {item.title}
                </h2>
                
                {/* --- SUBTITLE SECTION --- */}
                <div className="max-h-0 opacity-0 overflow-hidden transition-all duration-300 ease-in-out group-hover:max-h-10 group-hover:opacity-100 group-hover:mt-1">
                  <p className="font-mono text-xs text-gray-400 group-hover:text-[#FDFCF5]/80">
                    {item.subtitle}
                  </p>
                </div>

                
              </div>

              {/* Arrow Icon */}
              <div className="transform transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer / Decorative minimal element */}
      <div className="mt-16 h-px w-12 bg-black opacity-20"></div>
    </div>
  );
};

export default Page;