import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { MessageCircle, X, Send, Bot, User, HeadphonesIcon, Info } from 'lucide-react';
import { doc, collection, onSnapshot, setDoc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';

// @ts-ignore
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'ai' | 'live'>('ai');
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Hi! I am the Jotpot Assistant. How can I help you today with finding a car, registering, or using Jotpot?\n(আস-সালামু আলাইকুম! আমি বাংলাতেও কথা বলতে পারি। আপনার কি সাহায্য প্রয়োজন?)' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Live Chat State
  const [sessionId, setSessionId] = useState<string>('');
  const [liveMessages, setLiveMessages] = useState<any[]>([]);

  useEffect(() => {
    // Generate or retrieve session ID for live chat
    let storedSession = localStorage.getItem('jotpot_chat_session');
    if (!storedSession) {
      storedSession = 'sess_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('jotpot_chat_session', storedSession);
    }
    setSessionId(storedSession);

    const q = query(collection(db, `support_sessions/${storedSession}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLiveMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error in AI assistant live messages listener:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveMessages, loading, mode]);

  const sendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userMsg,
        config: {
          systemInstruction: `You are 'Jotpot Assistant', the highly intelligent, extremely helpful, and friendly official AI assistant for Jotpot. 

CORE RULES:
1. Jotpot is a dedicated rental car directory platform (ভাড়ায় চালিত গাড়ির ডিরেক্টরি) connecting riders with trusted local vehicle drivers.
2. YOU CAN SPEAK BOTH ENGLISH AND BENGALI (বাংলা). Always respond in the language the user speaks to you. If they ask questions in Bengali, reply perfectly in natural Bengali.
3. BENGALI GREETING: When responding or greeting in Bengali, ALWAYS use "আস-সালামু আলাইকুম" (As-salamu alaykum). NEVER use "নমস্কার" (Nomoshkar).
4. BENGALI SPELLING: When writing the platform name in Bengali, ALWAYS use "ঝটপট". NEVER use "জটপট".
5. If a user asks "What is Jotpot?" or asks how to use it, explain it clearly: "Jotpot is a rental car directory where you can easily find and contact trusted local drivers. You can use the search filters on the home page to find cars in your specific area!"
6. Be helpful with general inquiries about cars, traveling, renting, and how the platform might work. Smartly transition the answer back to how Jotpot can help them travel.
7. If the user asks for real-time driver locations, tell them nicely that they need to browse the directory and use the filters.
8. Keep answers relatively short, professional, and very warm.

If the question is completely irrelevant to travel, cars, technology, or Jotpot, kindly let them know you are specifically tailored for Jotpot-related assistance.`,
          temperature: 0.7,
        }
      });
      
      if (response.text) {
        setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: 'Oops! I encountered an error answering your question.' }]);
    } finally {
      setLoading(false);
    }
  };

  const sendLiveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId) return;

    const userMsg = input.trim();
    setInput('');
    setLoading(true);
    
    try {
      // Create/update session doc
      await setDoc(doc(db, 'support_sessions', sessionId), {
        lastMessage: userMsg,
        timestamp: serverTimestamp(),
        unreadAdmin: true
      }, { merge: true });

      // Add message
      await addDoc(collection(db, `support_sessions/${sessionId}/messages`), {
        text: userMsg,
        sender: 'user',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Live message error:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-4 sm:right-6 bg-primary text-white p-3.5 sm:p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-[100] flex items-center justify-center border-4 border-white/20"
      >
        <MessageCircle size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 sm:w-[350px] md:w-96 h-[80vh] sm:h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl shadow-primary/20 border border-gray-100 flex flex-col z-[100] overflow-hidden overscroll-none">
      <div className="bg-primary text-white p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {mode === 'ai' ? <Bot size={20} className="w-4 h-4 sm:w-5 sm:h-5" /> : <HeadphonesIcon size={20} className="w-4 h-4 sm:w-5 sm:h-5" />}
            <h3 className="font-bold text-sm sm:text-base">{mode === 'ai' ? 'Jotpot AI' : 'Live Support'}</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex bg-white/20 rounded-lg p-1">
          <button 
            onClick={() => setMode('ai')}
            className={cn("flex-1 text-sm py-1.5 rounded-md font-medium transition-colors", mode === 'ai' ? "bg-white text-primary shadow-sm" : "text-white/80 hover:text-white")}
          >
            AI Assistant
          </button>
          <button 
            onClick={() => setMode('live')}
            className={cn("flex-1 text-sm py-1.5 rounded-md font-medium transition-colors", mode === 'live' ? "bg-white text-primary shadow-sm" : "text-white/80 hover:text-white")}
          >
            Agent Chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50">
        {mode === 'ai' ? (
          <>
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-xl border border-blue-100 flex gap-2 items-start">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p>AI can only answer questions related to Jotpot. For account-specific issues, use Agent Chat.</p>
            </div>
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2 max-w-[85%]", m.role === 'user' ? "self-end flex-row-reverse" : "self-start")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", m.role === 'user' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600")}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={cn("px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap", m.role === 'user' ? "bg-primary text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm")}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="self-start flex gap-2 max-w-[85%]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-2 rounded-2xl text-sm bg-white border border-gray-200 text-gray-800 rounded-tl-sm flex gap-1 items-center">
                   <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0ms'}}></span>
                   <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '150ms'}}></span>
                   <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '300ms'}}></span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-orange-50 text-orange-800 text-xs p-3 rounded-xl border border-orange-100 flex gap-2 items-start">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p>Leave a message and an admin or agent will reply to you as soon as possible!</p>
            </div>
            {liveMessages.length === 0 && (
              <div className="text-center text-sm text-gray-400 mt-10">
                No messages yet. Send a message to start chatting!
              </div>
            )}
            {liveMessages.map((m, i) => (
              <div key={m.id || i} className={cn("flex gap-2 max-w-[85%]", m.sender === 'user' ? "self-end flex-row-reverse" : "self-start")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", m.sender === 'user' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600")}>
                  {m.sender === 'user' ? <User size={16} /> : <HeadphonesIcon size={16} />}
                </div>
                <div className={cn("px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap", m.sender === 'user' ? "bg-primary text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm")}>
                  {m.text}
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={mode === 'ai' ? sendAiMessage : sendLiveMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'ai' ? "Ask a question..." : "Type your message..."}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 outline-none focus:ring-2 focus:ring-primary text-sm transition-shadow"
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-primary text-white p-2.5 rounded-xl hover:opacity-90 transition-colors disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
