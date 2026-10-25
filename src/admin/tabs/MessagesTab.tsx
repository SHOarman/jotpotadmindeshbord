import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  limit,
} from 'firebase/firestore';
import {
  MessageCircle,
  PhoneCall,
  Search,
  Settings,
  Send,
  ChevronLeft,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdmin } from '../context/AdminContext';

export const MessagesTab: React.FC = () => {
  const { profile, isAdmin, isAgent, logAction } = useAdmin();

  const [chatServiceFilter, setChatServiceFilter] = useState<'website' | 'whatsapp'>('website');
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Sessions
  const [supportSessions, setSupportSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);

  const [whatsappSessions, setWhatsappSessions] = useState<any[]>([]);
  const [activeWaSessionId, setActiveWaSessionId] = useState<string | null>(null);
  const [waSessionMessages, setWaSessionMessages] = useState<any[]>([]);

  // Input & Quick Replies
  const [chatReplyInput, setChatReplyInput] = useState('');
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [editingQuickReply, setEditingQuickReply] = useState<any>(null);
  const [quickReplyTitle, setQuickReplyTitle] = useState('');
  const [quickReplyText, setQuickReplyText] = useState('');

  // Direct WhatsApp Form
  const [waDirectPhone, setWaDirectPhone] = useState('');
  const [waDirectMessage, setWaDirectMessage] = useState('');
  const [sendingWaDirect, setSendingWaDirect] = useState(false);
  const [waDirectFeedback, setWaDirectFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionMessages, waSessionMessages, activeSessionId, activeWaSessionId]);

  // Listen to support sessions
  useEffect(() => {
    const q = query(collection(db, 'support_sessions'), orderBy('timestamp', 'desc'), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSupportSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error('Error fetching support sessions:', err)
    );
    return () => unsub();
  }, []);

  // Listen to whatsapp sessions
  useEffect(() => {
    const q = query(collection(db, 'whatsapp_sessions'), orderBy('updatedAt', 'desc'), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setWhatsappSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error('Error fetching whatsapp sessions:', err)
    );
    return () => unsub();
  }, []);

  // Listen to quick replies
  useEffect(() => {
    const q = query(collection(db, 'quick_replies'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setQuickReplies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error('Error fetching quick replies:', err)
    );
    return () => unsub();
  }, []);

  // Listen to active web chat messages
  useEffect(() => {
    if (!activeSessionId) {
      setSessionMessages([]);
      return;
    }
    const q = query(collection(db, `support_sessions/${activeSessionId}/messages`), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setSessionMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Mark as read by admin
    setDoc(doc(db, 'support_sessions', activeSessionId), { unreadAdmin: false }, { merge: true }).catch(() => {});

    return () => unsub();
  }, [activeSessionId]);

  // Listen to active whatsapp chat messages
  useEffect(() => {
    if (!activeWaSessionId) {
      setWaSessionMessages([]);
      return;
    }
    const q = query(collection(db, `whatsapp_sessions/${activeWaSessionId}/messages`), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setWaSessionMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Mark as read
    setDoc(doc(db, 'whatsapp_sessions', activeWaSessionId), { unread: false }, { merge: true }).catch(() => {});

    return () => unsub();
  }, [activeWaSessionId]);

  const handleSendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatReplyInput.trim() || !activeSessionId) return;

    const replyText = chatReplyInput.trim();
    setChatReplyInput('');

    try {
      await addDoc(collection(db, `support_sessions/${activeSessionId}/messages`), {
        text: replyText,
        sender: profile?.name || 'Agent',
        timestamp: serverTimestamp(),
      });
      await setDoc(
        doc(db, 'support_sessions', activeSessionId),
        {
          lastMessage: `Admin: ${replyText}`,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendWaReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatReplyInput.trim() || !activeWaSessionId) return;

    setSendingWaDirect(true);
    const replyText = chatReplyInput.trim();
    setChatReplyInput('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');

      const token = await user.getIdToken();
      const res = await fetch('/api/whatsapp-send-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: activeWaSessionId,
          message: replyText,
        }),
      });

      if (!res.ok) {
        alert('Failed to send WhatsApp message');
      }
    } catch (err) {
      console.error(err);
      alert('Error sending WhatsApp message');
    } finally {
      setSendingWaDirect(false);
    }
  };

  const handleSendDirectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waDirectPhone.trim() || !waDirectMessage.trim()) return;

    setSendingWaDirect(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');
      const token = await user.getIdToken();

      const res = await fetch('/api/whatsapp-send-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: waDirectPhone,
          message: waDirectMessage,
        }),
      });

      if (res.ok) {
        setWaDirectFeedback({ type: 'success', message: 'WhatsApp message sent successfully!' });
        setWaDirectMessage('');
        setWaDirectPhone('');
        setTimeout(() => setWaDirectFeedback(null), 3000);
      } else {
        const errorData = await res.json();
        setWaDirectFeedback({ type: 'error', message: `Failed to send: ${errorData.error || 'Check configuration'}` });
        setTimeout(() => setWaDirectFeedback(null), 5000);
      }
    } catch (err: any) {
      console.error('Error sending direct WA msg:', err);
      setWaDirectFeedback({ type: 'error', message: 'Network error sending WhatsApp message.' });
      setTimeout(() => setWaDirectFeedback(null), 5000);
    } finally {
      setSendingWaDirect(false);
    }
  };

  const handleSaveQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReplyTitle.trim() || !quickReplyText.trim()) return;

    try {
      if (editingQuickReply) {
        await updateDoc(doc(db, 'quick_replies', editingQuickReply.id), {
          title: quickReplyTitle.trim(),
          text: quickReplyText.trim(),
        });
      } else {
        await addDoc(collection(db, 'quick_replies'), {
          title: quickReplyTitle.trim(),
          text: quickReplyText.trim(),
        });
      }
      setQuickReplyTitle('');
      setQuickReplyText('');
      setEditingQuickReply(null);
      setShowQuickReplies(false);
    } catch (err) {
      console.error('Error saving quick reply:', err);
    }
  };

  const deleteQuickReply = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (window.confirm('Delete this quick reply?')) {
        await deleteDoc(doc(db, 'quick_replies', id));
      }
    } catch (error) {
      console.error('Error deleting quick reply:', error);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-180px)] md:h-[calc(100vh-100px)] gap-0 bg-white md:m-4 md:rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="flex flex-1 overflow-hidden min-h-0 bg-transparent rounded-[2rem] w-full">
        {/* Sidebar: Session List */}
        <div
          className={cn(
            'w-full md:w-[360px] bg-gray-50 flex flex-col overflow-hidden shrink-0 border-r border-gray-100',
            activeSessionId || activeWaSessionId ? 'hidden md:flex' : 'flex'
          )}
        >
          <div className="p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-extrabold text-gray-900 text-xl tracking-tight">Messages</h3>
              <button
                onClick={() => setShowQuickReplies(true)}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
                title="Manage Quick Replies"
              >
                <Settings size={20} />
              </button>
            </div>

            {/* Segmented Control */}
            <div className="flex bg-gray-200/60 p-1 rounded-xl">
              <button
                onClick={() => {
                  setChatServiceFilter('website');
                  setActiveWaSessionId(null);
                  setChatSearchQuery('');
                }}
                className={cn(
                  'flex-1 text-[13px] py-1.5 rounded-lg font-bold transition-all relative flex items-center justify-center gap-2',
                  chatServiceFilter === 'website'
                    ? 'text-gray-900 bg-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Live Web
                {supportSessions.filter((s) => s.unreadAdmin).length > 0 && (
                  <span className="bg-red-500 w-2 h-2 rounded-full absolute top-2 right-2 border-2 border-white"></span>
                )}
              </button>
              <button
                onClick={() => {
                  setChatServiceFilter('whatsapp');
                  setActiveSessionId(null);
                  setChatSearchQuery('');
                }}
                className={cn(
                  'flex-1 text-[13px] py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 relative',
                  chatServiceFilter === 'whatsapp'
                    ? 'text-[#25D366] bg-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                WhatsApp
                {whatsappSessions.filter((s) => s.unread).length > 0 && (
                  <span className="bg-[#25D366] w-2 h-2 rounded-full absolute top-2 right-2 border-2 border-white"></span>
                )}
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search chats..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-none bg-white rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {chatServiceFilter === 'website' ? (
              <>
                {supportSessions
                  .filter(
                    (s) =>
                      s.id.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
                      (s.lastMessage || '').toLowerCase().includes(chatSearchQuery.toLowerCase())
                  )
                  .map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setActiveSessionId(session.id);
                        setActiveWaSessionId(null);
                      }}
                      className={cn(
                        'w-full text-left p-3 rounded-2xl transition-all duration-200 grid grid-cols-[auto_1fr] gap-3 items-center group',
                        activeSessionId === session.id
                          ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]'
                          : 'hover:bg-gray-100/80'
                      )}
                    >
                      <div className="relative shrink-0">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-full flex items-center justify-center font-bold text-[14px] transition-colors',
                            activeSessionId === session.id
                              ? 'bg-primary text-white'
                              : 'bg-white text-gray-600 shadow-sm border border-gray-100'
                          )}
                        >
                          {session.id.substring(0, 2).toUpperCase()}
                        </div>
                        {session.unreadAdmin && (
                          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5"></div>
                        )}
                      </div>
                      <div className="min-w-0 pr-1">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span
                            className={cn(
                              'text-[14px] truncate tracking-tight text-gray-900',
                              session.unreadAdmin ? 'font-bold' : 'font-semibold'
                            )}
                          >
                            Visitor {session.id.substring(0, 4)}
                          </span>
                          <span
                            className={cn(
                              'text-[11px] whitespace-nowrap shrink-0',
                              session.unreadAdmin ? 'text-red-500 font-bold' : 'text-gray-400 font-medium'
                            )}
                          >
                            {session.timestamp?.toDate
                              ? new Date(session.timestamp.toDate()).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                        <p
                          className={cn(
                            'text-[13px] truncate',
                            session.unreadAdmin ? 'font-semibold text-gray-800' : 'text-gray-500'
                          )}
                        >
                          {session.lastMessage || 'Started a chat'}
                        </p>
                      </div>
                    </button>
                  ))}
                {supportSessions.length === 0 && (
                  <p className="text-gray-400 text-center py-12 text-xs">No web chat sessions found.</p>
                )}
              </>
            ) : (
              <>
                {whatsappSessions
                  .filter(
                    (s) =>
                      (s.phone || '').includes(chatSearchQuery) ||
                      (s.lastMessage || '').toLowerCase().includes(chatSearchQuery.toLowerCase())
                  )
                  .map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setActiveWaSessionId(session.id);
                        setActiveSessionId(null);
                      }}
                      className={cn(
                        'w-full text-left p-3 rounded-2xl transition-all duration-200 grid grid-cols-[auto_1fr] gap-3 items-center group',
                        activeWaSessionId === session.id
                          ? 'bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]'
                          : 'hover:bg-gray-100/80'
                      )}
                    >
                      <div className="relative shrink-0">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                            activeWaSessionId === session.id
                              ? 'bg-[#25D366] text-white'
                              : 'bg-white text-gray-600 shadow-sm border border-gray-100'
                          )}
                        >
                          <PhoneCall
                            size={20}
                            className={activeWaSessionId === session.id ? 'text-white' : 'text-[#25D366]'}
                          />
                        </div>
                        {session.unread && (
                          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm ring-1 ring-black/5"></div>
                        )}
                      </div>
                      <div className="min-w-0 pr-1">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span
                            className={cn(
                              'text-[14px] truncate tracking-tight text-gray-900',
                              session.unread ? 'font-bold' : 'font-semibold'
                            )}
                          >
                            {session.phone}
                          </span>
                          <span
                            className={cn(
                              'text-[11px] whitespace-nowrap shrink-0',
                              session.unread ? 'text-green-600 font-bold' : 'text-gray-400 font-medium'
                            )}
                          >
                            {session.updatedAt?.toDate
                              ? new Date(session.updatedAt.toDate()).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                        <p
                          className={cn(
                            'text-[13px] truncate',
                            session.unread ? 'font-semibold text-gray-800' : 'text-gray-500'
                          )}
                        >
                          {session.lastMessage || 'Interaction'}
                        </p>
                      </div>
                    </button>
                  ))}
                {whatsappSessions.length === 0 && (
                  <p className="text-gray-400 text-center py-12 text-xs">No WhatsApp interactions logged yet.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat Conversation View */}
        <div
          className={cn(
            'flex-1 bg-white flex flex-col overflow-hidden relative z-0',
            !(activeSessionId || activeWaSessionId) ? 'hidden md:flex' : 'flex w-full md:w-auto shrink-0 md:shrink'
          )}
        >
          {activeSessionId || activeWaSessionId ? (
            <>
              {/* Header */}
              <div className="px-6 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md shrink-0 z-10 border-b border-gray-100 sticky top-0">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setActiveSessionId(null);
                      setActiveWaSessionId(null);
                    }}
                    className="md:hidden p-2 -ml-2 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm',
                      activeWaSessionId ? 'bg-[#25D366]' : 'bg-primary'
                    )}
                  >
                    {activeWaSessionId ? (
                      <PhoneCall size={18} />
                    ) : (
                      activeSessionId?.substring(0, 2).toUpperCase() || 'U'
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base tracking-tight leading-none mb-1">
                      {activeSessionId && `Visitor ${activeSessionId.substring(0, 8)}`}
                      {activeWaSessionId && `${activeWaSessionId}`}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-[12px] text-gray-500 font-medium">Active Channel</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {activeWaSessionId && (
                    <a
                      href={`https://wa.me/${activeWaSessionId.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-[#25D366] hover:bg-green-50 rounded-full transition-all"
                      title="Open in WhatsApp Web"
                    >
                      <MessageCircle size={20} />
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setActiveSessionId(null);
                      setActiveWaSessionId(null);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors hidden md:flex"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-2 relative bg-gray-50/30">
                {(activeSessionId ? sessionMessages : waSessionMessages).map((msg, index, arr) => {
                  const isLast = index === arr.length - 1 || arr[index + 1].sender !== msg.sender;
                  const isFirst = index === 0 || arr[index - 1].sender !== msg.sender;
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id || index}
                      className={cn('flex w-full relative z-10', isUser ? 'justify-start' : 'justify-end', isLast ? 'mb-4' : 'mb-1')}
                    >
                      <div className={cn('flex flex-col relative max-w-[85%] md:max-w-[75%]', isUser ? 'items-start' : 'items-end')}>
                        <div
                          className={cn(
                            'px-4 py-2.5 text-[15px] shadow-sm relative group',
                            isUser
                              ? 'bg-white border text-gray-800 rounded-2xl'
                              : activeWaSessionId
                              ? 'bg-[#dcf8c6] text-[#075e54] rounded-2xl'
                              : 'bg-primary text-white rounded-2xl',
                            isUser && isFirst ? 'rounded-tl-sm' : '',
                            !isUser && isFirst ? 'rounded-tr-sm' : ''
                          )}
                        >
                          <p className="whitespace-pre-wrap font-medium leading-relaxed">{msg.text}</p>
                        </div>
                        <div
                          className={cn(
                            'flex items-center gap-1.5 text-[11px] text-gray-400 font-medium px-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 -translate-y-1/2',
                            isUser ? '-right-16 flex-row-reverse' : '-left-16'
                          )}
                        >
                          <span>
                            {msg.timestamp?.toDate
                              ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Now'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-gray-100 shrink-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                {quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {quickReplies.slice(0, 5).map((qr) => (
                      <button
                        key={qr.id}
                        onClick={() => {
                          setChatReplyInput(qr.text);
                        }}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        {qr.title}
                      </button>
                    ))}
                  </div>
                )}
                <form
                  onSubmit={activeSessionId ? handleSendChatReply : handleSendWaReply}
                  className="flex gap-2 relative w-full items-end"
                >
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl flex items-center p-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all">
                    <textarea
                      value={chatReplyInput}
                      onChange={(e) => {
                        setChatReplyInput(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (chatReplyInput.trim() && !sendingWaDirect) {
                            const formEvent = { preventDefault: () => {} } as React.FormEvent;
                            if (activeSessionId) handleSendChatReply(formEvent);
                            else handleSendWaReply(formEvent);
                          }
                        }
                      }}
                      placeholder="Type your response..."
                      className="flex-1 bg-transparent px-3 py-2 outline-none text-[15px] resize-none max-h-[150px] min-h-[40px] w-full"
                      rows={1}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!chatReplyInput.trim() || sendingWaDirect}
                    className={cn(
                      'text-white w-[50px] h-[50px] rounded-2xl flex items-center justify-center transition-all shadow-sm shrink-0',
                      !chatReplyInput.trim()
                        ? 'bg-gray-300 opacity-50'
                        : activeWaSessionId
                        ? 'bg-[#25D366] hover:bg-[#20bd5a] shadow-[#25D366]/30'
                        : 'bg-primary hover:bg-orange-600 shadow-primary/30'
                    )}
                  >
                    <Send size={20} className="ml-0.5" strokeWidth={2.5} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State & Direct WhatsApp Dispatch */
            <div className="flex-1 border border-white flex flex-col items-center justify-center p-8 bg-gray-50/50 w-full relative overflow-y-auto">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
                <MessageCircle size={32} className="text-gray-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Customer Messaging Portal</h3>
              <p className="text-gray-500 text-center text-xs max-w-sm">
                Select an active user conversation from the left drawer or compose a direct WhatsApp notification below.
              </p>

              <div className="w-full max-w-sm mt-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                    <PhoneCall className="text-[#25D366]" size={18} />
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm">Send Direct WhatsApp</h4>
                </div>
                <form className="flex flex-col gap-3 relative z-10" onSubmit={handleSendDirectWhatsApp}>
                  <input
                    type="tel"
                    placeholder="Recipient Phone (+8801...)"
                    value={waDirectPhone}
                    onChange={(e) => setWaDirectPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366] text-sm font-semibold"
                    required
                  />
                  <textarea
                    placeholder="Write template message..."
                    value={waDirectMessage}
                    onChange={(e) => setWaDirectMessage(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366] text-sm min-h-[80px] resize-y font-medium"
                    required
                  />
                  {waDirectFeedback && (
                    <div
                      className={cn(
                        'text-xs font-bold p-2.5 rounded-xl text-center',
                        waDirectFeedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}
                    >
                      {waDirectFeedback.message}
                    </div>
                  )}
                  <button
                    disabled={sendingWaDirect}
                    className="bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl py-3 font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                  >
                    <Send size={15} strokeWidth={2.5} />
                    <span>{sendingWaDirect ? 'Sending...' : 'Send WhatsApp Message'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Replies Manager Modal */}
      {showQuickReplies && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Manage Canned Quick Replies</h2>
              <button
                onClick={() => {
                  setShowQuickReplies(false);
                  setEditingQuickReply(null);
                  setQuickReplyTitle('');
                  setQuickReplyText('');
                }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
              <div className="space-y-3 mb-6">
                {quickReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-1 relative group"
                  >
                    <div className="font-bold text-gray-900 text-sm">{reply.title}</div>
                    <div className="text-xs text-gray-600 line-clamp-2">{reply.text}</div>

                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingQuickReply(reply);
                          setQuickReplyTitle(reply.title);
                          setQuickReplyText(reply.text);
                        }}
                        className="p-1.5 bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => deleteQuickReply(reply.id, e)}
                          className="p-1.5 bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {quickReplies.length === 0 && (
                  <p className="text-center text-gray-400 py-6 text-xs">No canned quick replies configured yet.</p>
                )}
              </div>

              {(isAdmin || isAgent) && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3 text-sm">
                    {editingQuickReply ? 'Edit Quick Reply' : 'Add Quick Reply'}
                  </h3>
                  <form onSubmit={handleSaveQuickReply} className="flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Title (e.g. Greeting, Payment instructions)"
                      value={quickReplyTitle}
                      onChange={(e) => setQuickReplyTitle(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                      required
                    />
                    <textarea
                      placeholder="Response template content..."
                      value={quickReplyText}
                      onChange={(e) => setQuickReplyText(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm min-h-[80px]"
                      required
                    />
                    <div className="flex gap-2 justify-end">
                      {editingQuickReply && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuickReply(null);
                            setQuickReplyTitle('');
                            setQuickReplyText('');
                          }}
                          className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-sm"
                      >
                        Save Reply
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesTab;
