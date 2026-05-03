import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

const ChatInterface = () => {
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hello! How can I help you with your research today?' }]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState(null);
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [debateTranscript, setDebateTranscript] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Basic random client ID for demo
    const clientId = Math.floor(Math.random() * 10000);
    const websocket = new WebSocket(`ws://localhost:8000/chat/ws/${clientId}`);
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'approval_request') {
        setApprovalRequest(data);
      } else if (data.type === 'status') {
        setMessages(prev => [...prev, { role: 'system', content: data.content }]);
      } else if (data.type === 'final_answer') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content, sources: data.sources }]);
        setDebateTranscript(data.transcript);
      } else if (data.type === 'error') {
        setMessages(prev => [...prev, { role: 'system', content: `Error: ${data.content}` }]);
      }
    };

    setWs(websocket);
    return () => websocket.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, debateTranscript, approvalRequest]);

  const sendMessage = () => {
    if (!input.trim() || !ws) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setDebateTranscript([]); // Reset debate view
    ws.send(JSON.stringify({ query: input }));
    setInput('');
  };

  const handleApproval = (approved) => {
    if (ws) {
      ws.send(JSON.stringify({ approved }));
      setApprovalRequest(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 animate-fade-in gap-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col mb-2">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          Research Chat
        </h2>
        <p className="text-textSecondary text-sm">Ask questions, and let the agents debate the best answer.</p>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-[2] glass rounded-2xl flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl max-w-[85%] ${
                  msg.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 
                  msg.role === 'system' ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded-bl-sm text-sm' :
                  'bg-surface/80 border border-white/5 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 text-xs text-textSecondary bg-surface/50 p-2 rounded-lg border border-white/5 max-w-[85%]">
                    <span className="font-bold text-primary">Sources: </span>
                    {msg.sources.map((s, i) => <span key={i} className="mr-2">Doc {s.chunk_id}</span>)}
                  </div>
                )}
              </div>
            ))}
            
            {/* Human in the loop popup */}
            {approvalRequest && (
              <div className="bg-slate-800 border-2 border-accent/50 p-4 rounded-xl max-w-[85%] animate-slide-up">
                <div className="flex items-center gap-2 text-accent font-bold mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Approval Required: {approvalRequest.tool}
                </div>
                <p className="text-sm text-textSecondary mb-4">{approvalRequest.reason}</p>
                <div className="flex gap-2">
                  <button onClick={() => handleApproval(true)} className="bg-accent hover:bg-accent/80 text-white px-4 py-1.5 rounded-lg text-sm transition-colors">Approve</button>
                  <button onClick={() => handleApproval(false)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm transition-colors">Deny</button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/5 bg-surface/30 backdrop-blur-md">
            <div className="relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask a question..." 
                className="w-full bg-surface border border-white/10 rounded-xl pl-4 pr-12 py-3 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button 
                onClick={sendMessage}
                className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-primary/80 text-white rounded-lg px-3 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar for Debate Transcript */}
        <div className="flex-[1] glass-panel rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-surface/50">
            <h3 className="font-bold text-sm text-textSecondary flex items-center gap-2">
              <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
              Agent Debate Transcript
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {debateTranscript.length === 0 ? (
              <p className="text-xs text-textSecondary text-center italic mt-10">Waiting for a question to start the debate...</p>
            ) : (
              debateTranscript.map((t, idx) => (
                <div key={idx} className="bg-background/50 rounded-lg p-3 border border-white/5 animate-slide-up">
                  <div className={`text-xs font-bold mb-1 ${
                    t.agent === 'Generator' ? 'text-blue-400' :
                    t.agent === 'Critic' ? 'text-red-400' : 'text-green-400'
                  }`}>{t.agent}</div>
                  <p className="text-xs text-textSecondary whitespace-pre-wrap">{t.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentsLibrary = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://localhost:8000/documents/');
      const data = await res.json();
      setDocuments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetch('http://localhost:8000/documents/upload', {
        method: 'POST',
        body: formData,
      });
      setFile(null);
      fetchDocuments();
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 p-8 animate-fade-in flex flex-col max-w-5xl mx-auto w-full gap-8">
      <div>
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Document Library</h2>
        <p className="text-textSecondary mt-1">Upload PDFs and images to build your knowledge base.</p>
      </div>

      <div className="glass-panel p-10 rounded-2xl border-dashed border-2 border-primary/30 text-center hover:border-primary/60 transition-colors flex flex-col items-center justify-center bg-surface/20 relative">
        <input 
          type="file" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          onChange={(e) => setFile(e.target.files[0])}
        />
        <svg className={`w-12 h-12 text-primary/50 mb-4 ${uploading ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        <p className="text-lg text-textPrimary font-medium">
          {file ? file.name : "Drag & drop files here or click to browse"}
        </p>
        <p className="text-sm text-textSecondary mt-2">PDF, PNG, JPG (OCR supported)</p>
        
        {file && !uploading && (
          <button 
            onClick={(e) => { e.stopPropagation(); handleUpload(); }}
            className="mt-6 bg-primary hover:bg-primary/80 text-white px-6 py-2 rounded-xl shadow-lg shadow-primary/20 transition-all z-10 relative"
          >
            Upload to Vector DB
          </button>
        )}
        {uploading && (
          <div className="mt-6 text-primary font-medium animate-pulse">Processing document & generating embeddings...</div>
        )}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface border-b border-white/5">
            <tr>
              <th className="px-6 py-4 font-medium text-textSecondary">ID</th>
              <th className="px-6 py-4 font-medium text-textSecondary">Filename</th>
              <th className="px-6 py-4 font-medium text-textSecondary">Uploaded At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {documents.length === 0 ? (
              <tr><td colSpan="3" className="px-6 py-8 text-center text-textSecondary">No documents uploaded yet.</td></tr>
            ) : (
              documents.map(doc => (
                <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-textSecondary">{doc.id}</td>
                  <td className="px-6 py-4 font-medium">{doc.filename}</td>
                  <td className="px-6 py-4 text-textSecondary">{new Date(doc.uploaded_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Settings = () => (
  <div className="flex-1 p-8 animate-fade-in flex flex-col max-w-3xl mx-auto w-full gap-8">
    <div>
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Settings</h2>
      <p className="text-textSecondary mt-1">Configure your API keys and system preferences.</p>
    </div>
    
    <div className="glass-panel p-8 rounded-2xl space-y-6">
      <div>
        <label className="block text-sm font-medium text-textPrimary mb-2 flex items-center gap-2">
          Groq API Key <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">Required</span>
        </label>
        <input type="password" placeholder="gsk_..." className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white" />
        <p className="text-xs text-textSecondary mt-2">Get your key from the Groq Cloud console.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-textPrimary mb-2">Tavily API Key (Optional)</label>
        <input type="password" placeholder="tvly-..." className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white" />
      </div>
      <div className="pt-4 border-t border-white/5">
        <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all font-medium">
          Save Configuration
        </button>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <aside className="w-64 glass-panel border-r border-white/5 flex flex-col z-10 shadow-2xl">
          <div className="p-6 border-b border-white/5">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30">
                RA
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-textSecondary">Assistant</span>
            </h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link to="/" className="flex items-center gap-3 px-4 py-3 text-textSecondary hover:text-white hover:bg-white/5 rounded-xl transition-all group">
              <svg className="w-5 h-5 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
              Chat
            </Link>
            <Link to="/documents" className="flex items-center gap-3 px-4 py-3 text-textSecondary hover:text-white hover:bg-white/5 rounded-xl transition-all group">
              <svg className="w-5 h-5 group-hover:text-secondary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Documents
            </Link>
            <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-textSecondary hover:text-white hover:bg-white/5 rounded-xl transition-all group">
              <svg className="w-5 h-5 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Settings
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex overflow-y-auto relative">
          <Routes>
            <Route path="/" element={<ChatInterface />} />
            <Route path="/documents" element={<DocumentsLibrary />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
