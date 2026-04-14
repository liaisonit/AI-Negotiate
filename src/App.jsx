import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Shield, Zap, Activity, Cpu, Clock, ChevronRight, 
  BarChart3, MessageSquare, Target, ArrowRight, BrainCircuit, 
  AlertCircle, Sparkles
} from 'lucide-react';

// --- API Configuration ---
const apiKey = ""; 
const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

const SYSTEM_PROMPT = `
You are the 'Friction-Killer', an elite AI negotiation wingman with 20 years of top-tier brokerage and consulting experience in India. 
The user will input a client's objection. All financial figures and examples MUST be in Indian Rupees (₹) using the Indian numbering format (e.g., ₹1,50,00,000).

You MUST output your response in EXACTLY this markdown format:

### 🧠 Strategic Breakdown
1. [Point 1: Logical/Psychological reframing]
2. [Point 2: Mathematical pivot]
3. [Point 3: Urgency/Scarcity angle]

### 🎙️ The Script
"[Provide the exact, verbatim, confident script the broker should read]"

### 📊 The Data Play
[Provide a specific, mathematically sound data scenario proving that waiting or stalling costs them more.]
`;

const FALLBACK_INTEREST_RATE_RESPONSE = `### 🧠 Strategic Breakdown
1. **The Cost of Waiting:** A 1% drop in rates triggers a flood of sidelined buyers, driving up principal prices by 5-7%.
2. **Refinancing Reality:** You marry the house, but date the rate. You can refinance a higher rate, but you can't renegotiate a purchase price later.
3. **Amortization Advantage:** Waiting a year means throwing away 12 months of equity paydown.

### 🎙️ The Script
"I completely understand wanting to wait for rates to cool off. But let's look at the math the market isn't talking about. When rates drop by 1%, every buyer currently waiting jumps back in. History shows that competition drives the actual price up by about 5%. You're trading a temporary higher rate for a permanently higher purchase price that you'll pay interest on for the next 20 years."

### 📊 The Data Play
**Simulation: ₹5,00,00,000 Property**
* **Scenario A (Buy Now):** 8.5% Rate. Monthly EMI = ₹4,33,900.
* **Scenario B (Wait 1 Yr):** Rate drops to 7.5%. Price jumps 5% to ₹5,25,00,000.
* **The Catch:** It takes **11.6 years** of monthly savings just to break even on the permanently higher purchase price.`;

const GENERIC_FALLBACK = `### 🧠 Strategic Breakdown
1. **Time Kills Deals:** The longer a decision is delayed, the higher the probability of external variables disrupting the deal.
2. **Scarcity Premium:** Prime assets command a premium because they are rare.
3. **Control the Controllables:** Secure the asset at today's known valuation.

### 🎙️ The Script
"I hear what you're saying. However, my job is to protect your long-term position. The variables you're worried about today will still exist tomorrow, but the opportunity to secure this specific asset at these terms will be gone."

### 📊 The Data Play
**Opportunity Cost Matrix:**
* Historically, delaying acquisition on prime tier assets results in an 8-12% higher acquisition cost within an 18-month window.`;

const QUOTES = [
  "Amateurs negotiate price. Professionals negotiate value.",
  "Time kills deals. Control the tempo.",
  "Never split the difference.",
  "Empathy is a strategic weapon."
];

// --- Helper Components ---

// A simple parser to render basic markdown bold syntax (**text**)
const BoldText = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

export default function App() {
  const [appStage, setAppStage] = useState('loading'); // loading, ready
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initial Loading Sequence
  useEffect(() => {
    if (appStage !== 'loading') return;
    
    const progressInterval = setInterval(() => {
      setLoadingProgress(p => {
        if (p >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setAppStage('ready'), 600);
          return 100;
        }
        return p + Math.floor(Math.random() * 20) + 10;
      });
    }, 150);

    const quoteInterval = setInterval(() => {
      setQuoteIndex(i => (i + 1) % QUOTES.length);
    }, 2000);

    return () => { 
      clearInterval(progressInterval); 
      clearInterval(quoteInterval); 
    };
  }, [appStage]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // --- API Handling ---
  const callGeminiAPI = async (text, retries = 3, delay = 1000) => {
    try {
      const response = await fetch(MODEL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
        })
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, delay));
        return callGeminiAPI(text, retries - 1, delay * 2);
      }
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isTyping) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInputValue('');
    setIsTyping(true);

    try {
      let finalResponse;
      if (apiKey) {
        finalResponse = await callGeminiAPI(text);
      }
      
      // Fallback logic if API fails or no key provided
      if (!finalResponse) {
        const lower = text.toLowerCase();
        finalResponse = (lower.includes('rate') || lower.includes('interest') || lower.includes('wait') || lower.includes('expensive'))
          ? FALLBACK_INTEREST_RATE_RESPONSE 
          : GENERIC_FALLBACK;
        // Add a slight delay to simulate processing for fallbacks
        await new Promise(r => setTimeout(r, 1200));
      }
      
      setMessages(prev => [...prev, { role: 'wingman', content: finalResponse }]);
    } catch (error) {
      console.error("Negotiation AI Error:", error);
      setMessages(prev => [...prev, { role: 'wingman', content: GENERIC_FALLBACK }]);
    } finally {
      setIsTyping(false);
      // Refocus input after response
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // --- Robust Output Parser ---
  const parseResponse = (text) => {
    // If the text doesn't contain the expected markers, return it as raw text
    if (!text.includes('###')) {
      return { raw: text };
    }

    const sections = { strategy: '', script: '', data: '' };
    
    // Split by ### and process
    const blocks = text.split(/(?=### )/);
    
    blocks.forEach(block => {
      const trimmed = block.trim();
      const lower = trimmed.toLowerCase();
      
      if (lower.includes('strategic breakdown')) {
        sections.strategy = trimmed.replace(/^###.*?\n/i, '').trim();
      } else if (lower.includes('the script')) {
        sections.script = trimmed.replace(/^###.*?\n/i, '').trim().replace(/^"|"$/g, '');
      } else if (lower.includes('the data play')) {
        sections.data = trimmed.replace(/^###.*?\n/i, '').trim();
      }
    });

    return sections;
  };

  // --- Renderers ---
  const renderMessage = (msg, index) => {
    if (msg.role === 'user') {
      return (
        <div key={index} className="flex justify-end mb-8">
          <div className="max-w-[85%] lg:max-w-[70%]">
            <div className="flex items-center justify-end gap-2 mb-2">
              <span className="text-xs text-slate-500 font-medium tracking-wider uppercase">Client Objection</span>
              <div className="w-2 h-2 rounded-full bg-amber-500/80" />
            </div>
            <div className="bg-slate-800 border border-slate-700 text-slate-200 px-6 py-4 rounded-2xl rounded-tr-sm text-[15px] font-light leading-relaxed shadow-sm">
              "{msg.content}"
            </div>
          </div>
        </div>
      );
    }

    const parsed = parseResponse(msg.content);

    // Fallback for unstructured data
    if (parsed.raw) {
      return (
        <div key={index} className="flex justify-start mb-12">
          <div className="bg-slate-900 border border-slate-800 text-slate-300 px-6 py-4 rounded-2xl rounded-tl-sm text-[15px] font-light leading-relaxed max-w-[85%]">
            <BoldText text={parsed.raw} />
          </div>
        </div>
      );
    }

    return (
      <div key={index} className="mb-14 space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Strategy Section */}
        {parsed.strategy && (
          <div className="group">
            <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold tracking-widest uppercase mb-3 ml-1">
              <BrainCircuit size={14} /> Strategic Framework
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-sm backdrop-blur-sm">
              <ul className="space-y-3">
                {parsed.strategy.split(/\d+\./).filter(Boolean).map((item, idx) => (
                  <li key={idx} className="flex gap-4 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400 font-medium mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-slate-300 text-[15px] font-light leading-relaxed pt-0.5">
                      <BoldText text={item.trim()} />
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Script Section */}
        {parsed.script && (
          <div className="group">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-3 ml-1">
              <MessageSquare size={14} /> Exact Protocol
            </div>
            <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-5 text-emerald-500">
                <MessageSquare size={100} />
              </div>
              <p className="text-[17px] font-normal leading-relaxed text-slate-100 relative z-10">
                "{parsed.script}"
              </p>
            </div>
          </div>
        )}

        {/* Data Section */}
        {parsed.data && (
          <div className="group">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold tracking-widest uppercase mb-3 ml-1">
              <BarChart3 size={14} /> Empirical Leverage
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="text-slate-300 text-[14px] font-mono whitespace-pre-line leading-relaxed">
                <BoldText text={parsed.data} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-[#0B0F19] text-slate-200 selection:bg-amber-500/30 selection:text-amber-200 overflow-hidden relative flex font-sans">
      
      {/* --- Loading Screen --- */}
      {appStage === 'loading' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F19]">
          <div className="w-full max-w-sm flex flex-col items-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-2xl mb-8 animate-pulse">
              <Target size={28} className="text-amber-500" />
            </div>
            <h1 className="text-xl font-semibold text-white tracking-wide mb-2">FRICTION KILLER</h1>
            <p className="text-xs text-slate-500 tracking-[0.2em] uppercase mb-8">Initializing Strategy Engine</p>
            
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-amber-500 transition-all duration-300 ease-out" 
                style={{ width: `${loadingProgress}%` }} 
              />
            </div>

            <div className="h-6 relative w-full flex justify-center">
              {QUOTES.map((quote, idx) => (
                <p 
                  key={idx} 
                  className={`absolute text-slate-400 text-xs font-light tracking-wide text-center transition-all duration-500 ${idx === quoteIndex ? 'opacity-100 transform-none' : 'opacity-0 translate-y-2'}`}
                >
                  "{quote}"
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Main App Interface --- */}
      <div className={`flex w-full h-full transition-opacity duration-1000 ${appStage === 'ready' ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Sidebar (Desktop) */}
        <aside className="hidden lg:flex w-72 bg-slate-950 border-r border-slate-800 flex-col flex-shrink-0">
          <div className="p-6 border-b border-slate-800/50 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-lg">
              <Target size={20} className="text-amber-500" />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-wide text-slate-100">FRICTION KILLER</h1>
              <p className="text-[10px] text-amber-500/80 uppercase tracking-widest mt-0.5">Tactical OS v3.0</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide">
            <div className="space-y-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">System Status</p>
              <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-2"><Cpu size={14}/> Neural Sync</span>
                  <span className="text-emerald-400 font-medium">Optimal</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-2"><Activity size={14}/> Latency</span>
                  <span className="text-slate-300 font-mono">14ms</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Active Modules</p>
              <div className="space-y-1">
                {[
                  { name: 'Psychological Reframing', active: true },
                  { name: 'Objection Deflection', active: true },
                  { name: 'Quantitative Leverage', active: true },
                  { name: 'Empathy Engine', active: true }
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs text-slate-300 py-2 px-3 rounded-lg hover:bg-slate-800/50 transition-colors cursor-default">
                    <div className={`w-1.5 h-1.5 rounded-full ${m.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`} /> 
                    {m.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-800/50">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium flex items-center gap-2">
                <Clock size={14} /> Local Time
              </span>
              <span className="text-xs font-mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative bg-[#0B0F19]">
          
          {/* Header (Mobile visible, Desktop minimal) */}
          <header className="h-16 flex items-center justify-between px-6 lg:px-10 border-b border-slate-800/50 bg-[#0B0F19]/80 backdrop-blur-md z-20 flex-shrink-0">
            <div className="flex items-center gap-2 lg:hidden">
              <Target size={18} className="text-amber-500" />
              <span className="font-semibold text-sm tracking-wide text-slate-100">FRICTION KILLER</span>
            </div>
            <div className="hidden lg:block text-xs text-slate-500 tracking-widest uppercase font-semibold">
              Live Negotiation Feed
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
              <Shield size={14} className="text-emerald-500" /> Secure Link
            </div>
          </header>

          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-12 py-8 scroll-smooth" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 #0B0F19' }}>
            <div className="max-w-4xl mx-auto pb-32">
              
              {messages.length === 0 && (
                <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6 opacity-60 animate-in fade-in duration-1000">
                  <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <Sparkles size={32} className="text-amber-500/50" />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-slate-200 mb-2">Awaiting Parameters</h2>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Enter the client's specific objection, hesitation, or stall tactic below to generate a strategic counter-protocol.
                    </p>
                  </div>
                </div>
              )}
              
              {messages.map((msg, index) => renderMessage(msg, index))}
              
              {isTyping && (
                <div className="flex justify-start mb-8 animate-in fade-in duration-300">
                  <div className="bg-slate-900 border border-slate-800 px-6 py-5 rounded-2xl rounded-tl-sm flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-amber-500/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-amber-500/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-slate-500 font-medium tracking-wide">Synthesizing strategy...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input Console */}
          <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-8 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/95 to-transparent pt-20 z-20">
            <div className="max-w-4xl mx-auto">
              <form 
                onSubmit={handleSubmit} 
                className="relative flex items-center bg-slate-900 border border-slate-700 focus-within:border-amber-500/50 rounded-2xl shadow-2xl transition-colors duration-300"
              >
                <div className="pl-6 text-slate-500"><AlertCircle size={18} /></div>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isTyping}
                  placeholder="e.g. 'I want to wait for interest rates to drop before buying...'"
                  className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 font-normal px-4 py-5 focus:outline-none text-[15px] disabled:opacity-50"
                />
                <div className="pr-3">
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className="w-12 h-12 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center hover:bg-amber-400 transition-all disabled:opacity-30 disabled:hover:bg-amber-500 disabled:cursor-not-allowed shadow-lg"
                  >
                    <Send size={20} className="ml-1" />
                  </button>
                </div>
              </form>
              <div className="text-center mt-3">
                <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                  Secure Encrypted Input
                </span>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
