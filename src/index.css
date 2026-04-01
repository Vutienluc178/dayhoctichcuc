@import "tailwindcss";

@theme {
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  --color-slate-300: #cbd5e1;
  --color-slate-400: #94a3b8;
  --color-slate-500: #64748b;
  --color-slate-600: #475569;
  --color-slate-700: #334155;
  --color-slate-800: #1e293b;
  --color-slate-900: #0f172a;
  --color-slate-950: #020617;
  
  --color-indigo-50: #eef2ff;
  --color-indigo-100: #e0e7ff;
  --color-indigo-200: #c7d2fe;
  --color-indigo-300: #a5b4fc;
  --color-indigo-400: #818cf8;
  --color-indigo-500: #6366f1;
  --color-indigo-600: #4f46e5;
  --color-indigo-700: #4338ca;
  --color-indigo-800: #3730a3;
  --color-indigo-900: #312e81;
  --color-indigo-950: #1e1b4b;

  --color-amber-50: #fffbeb;
  --color-amber-100: #fef3c7;
  --color-amber-200: #fde68a;
  --color-amber-300: #fcd34d;
  --color-amber-400: #fbbf24;
  --color-amber-500: #f59e0b;
  --color-amber-600: #d97706;
  --color-amber-700: #b45309;
  --color-amber-800: #92400e;
  --color-amber-900: #78350f;
  --color-amber-950: #451a03;

  --color-emerald-50: #ecfdf5;
  --color-emerald-100: #d1fae5;
  --color-emerald-200: #a7f3d0;
  --color-emerald-300: #6ee7b7;
  --color-emerald-400: #34d399;
  --color-emerald-500: #10b981;
  --color-emerald-600: #059669;
  --color-emerald-700: #047857;
  --color-emerald-800: #065f46;
  --color-emerald-900: #064e3b;
  --color-emerald-950: #022c22;

  --color-rose-50: #fff1f2;
  --color-rose-100: #ffe4e6;
  --color-rose-200: #fecdd3;
  --color-rose-300: #fda4af;
  --color-rose-400: #fb7185;
  --color-rose-500: #f43f5e;
  --color-rose-600: #e11d48;
  --color-rose-700: #be123c;
  --color-rose-800: #9f1239;
  --color-rose-900: #881337;
  --color-rose-950: #4c0519;

  --color-purple-50: #faf5ff;
  --color-purple-100: #f3e8ff;
  --color-purple-200: #e9d5ff;
  --color-purple-300: #d8b4fe;
  --color-purple-400: #c084fc;
  --color-purple-500: #a855f7;
  --color-purple-600: #9333ea;
  --color-purple-700: #7e22ce;
  --color-purple-800: #6b21a8;
  --color-purple-900: #581c87;
  --color-purple-950: #3b0764;

  --color-violet-50: #f5f3ff;
  --color-violet-100: #ede9fe;
  --color-violet-200: #ddd6fe;
  --color-violet-300: #c4b5fd;
  --color-violet-400: #a78bfa;
  --color-violet-500: #8b5cf6;
  --color-violet-600: #7c3aed;
  --color-violet-700: #6d28d9;
  --color-violet-800: #5b21b6;
  --color-violet-900: #4c1d95;
  --color-violet-950: #2e1065;
}

@layer base {
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }

  /* MathJax Inline Fixes */
  mjx-container {
    display: inline-block !important;
    vertical-align: middle !important;
    margin: 0 0.2em !important;
    line-height: 0;
  }
  
  mjx-container[display="true"] {
    display: inline-block !important;
    text-align: center;
    margin: 0.5em 0 !important;
    width: 100%;
  }

  .game-content-text {
    display: inline-block;
    vertical-align: middle;
    line-height: normal;
  }
}

@media print {
  body * {
    visibility: hidden;
  }
  #game-canvas, #game-canvas * {
    visibility: visible;
  }
  #game-canvas {
    position: absolute;
    left: 0;
    top: 0;
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 15mm;
    box-shadow: none;
    transform: scale(1) !important;
    background: white !important;
  }
  
  /* Force cut lines to be visible in print */
  .print\:border-dashed {
    border-style: dashed !important;
    border-color: #94a3b8 !important; /* slate-400 */
    border-width: 0.5pt !important;
  }
  
  nav, footer, .lg\:col-span-4, .bg-white.p-5.rounded-3xl.shadow-sm.border.border-slate-200.flex.flex-wrap.items-center.justify-between.gap-4 {
    display: none !important;
  }

  /* Ensure background colors print */
  .bg-slate-50\/50 {
    background-color: #f8fafc !important;
    -webkit-print-color-adjust: exact;
  }
  .bg-indigo-600 {
    background-color: #4f46e5 !important;
    -webkit-print-color-adjust: exact;
  }
}
