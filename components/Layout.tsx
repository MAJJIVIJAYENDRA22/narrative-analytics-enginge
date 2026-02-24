
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">NA</span>
            </div>
            <h1 className="text-xl font-medium tracking-tight text-gray-900">
              Narrative Analytics <span className="text-gray-400 font-light">Engine</span>
            </h1>
          </div>
          <nav className="flex gap-8 text-sm font-medium text-gray-500">
            <a href="#" className="hover:text-black transition-colors">Documentation</a>
            <a href="#" className="hover:text-black transition-colors">Methodology</a>
            <a href="#" className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-gray-900">Support</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        {children}
      </main>

      <footer className="border-t border-gray-100 py-12 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-400">
          <p className="max-w-2xl mx-auto leading-relaxed">
            This system integrates descriptive, diagnostic, predictive, and prescriptive analytics to transform data into explainable insights and decision support.
          </p>
          <div className="mt-8 flex justify-center gap-6">
            <span>&copy; 2024 Research Initiative</span>
            <span>&middot;</span>
            <a href="#" className="hover:underline">Terms of Transparency</a>
            <span>&middot;</span>
            <a href="#" className="hover:underline">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
