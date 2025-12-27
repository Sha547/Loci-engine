import React, { useState, useEffect, useCallback } from 'react';
import { Search, Upload, MapPin, Tag, Mic, X, ChevronDown, Plus, Trash, Edit } from 'lucide-react';
import { supabase } from './supabaseClient';

const App = () => {
  // --- STATE ---
  const [items, setItems] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('memories'); // 'memories' | 'upload'

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Stack State
  const [isStackExpanded, setIsStackExpanded] = useState(false);

  // Upload State
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [inputTags, setInputTags] = useState('');
  const [inputLocation, setInputLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- INITIALIZATION ---
  const transformItem = (item) => ({
    id: item.id,
    image: item.image_url,
    tags: item.tags || [],
    location: item.location || 'Unknown',
    score: item.score || 0
  });

  const fetchMemories = useCallback(async (userId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/memories?user_id=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch memories');
      const data = await response.json();
      setItems(data.map(transformItem));
    } catch (error) {
      console.error("Fetch error:", error);
      alert(`Error fetching memories: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchMemories(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchMemories(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [fetchMemories]);

  // --- EDIT & DELETE STATE ---
  const [editingItem, setEditingItem] = useState(null); // Item being edited
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- HANDLERS ---

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this memory?")) return;

    try {
      const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'deleted') {
        setItems(items.filter(item => item.id !== id));
      } else {
        alert("Failed to delete.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error deleting memory.");
    }
  };

  const handleEditClick = (e, item) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleUpdateItem = async (id, newLocation, newTags) => {
    try {
      const formData = new FormData();
      formData.append('location', newLocation);
      formData.append('manual_tags', newTags);

      const res = await fetch(`/api/memories/${id}`, { method: 'PUT', body: formData });
      const data = await res.json();

      if (data.status === 'updated') {
        // Update local state
        setItems(items.map(item =>
          item.id === id ? { ...item, location: newLocation, tags: data.data.tags } : item
        ));
        setIsEditModalOpen(false);
        setEditingItem(null);
      } else {
        alert("Failed to update.");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Error updating item.");
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query) {
      setIsSearching(false);
      fetchMemories(session.user.id); // Reset
      return;
    }

    setIsSearching(true);
    setIsStackExpanded(true); // Auto expand on search
    setLoading(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&user_id=${session.user.id}`);
      const data = await response.json();
      setItems(data.map(transformItem));
    } catch (error) {
      console.error("Search error:", error);
      alert("Error searching memories.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!selectedFile || !inputLocation) return alert("Image and Location are required!");

    setIsSaving(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('user_id', session.user.id);
    formData.append('location', inputLocation);
    formData.append('manual_tags', inputTags);

    try {
      const res = await fetch('/api/scan', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.status === 'saved') {
        alert("Saved!");
        setSelectedImage(null);
        setSelectedFile(null);
        setInputTags('');
        setInputLocation('');
        setActiveTab('memories');
        fetchMemories(session.user.id);
      }
    } catch {
      alert("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelect = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedImage(URL.createObjectURL(file));
      setSelectedFile(file);
    }
  };

  // --- LOGIN SCREEN ---
  if (!session) return <LoginScreen />;

  // --- MAIN UI ---
  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-24 md:pb-0 relative">
      <WelcomeOverlay />

      {/* EDIT MODAL */}
      {isEditModalOpen && editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleUpdateItem}
        />
      )}

      {/* HEADER */}
      <div className="pt-12 px-6 pb-4 flex justify-between items-end bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-200">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black">
            Loci
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            {activeTab === 'memories' ? 'Your external brain.' : '~Ease your brain'}
          </p>
        </div>

        <div className="flex items-center gap-6">
          {/* DESKTOP NAV */}
          <div className="hidden md:flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('memories')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'memories' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Memories
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'upload' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Add New
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm font-semibold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
            >
              Log Out
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-inner" />
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 mt-6 max-w-7xl mx-auto">

        {activeTab === 'memories' && (
          <>
            {/* SEARCH BAR */}
            <div className="relative mb-8 group max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 rounded-2xl bg-white border-none shadow-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Search Loci..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {/* RESPONSIVE VIEW: Stack (Mobile) / Grid (Desktop) */}
            <div className="md:hidden">
              {/* MOBILE STACK VIEW */}
              <div className={`transition-all duration-500 ease-spring ${isStackExpanded ? 'min-h-screen' : 'h-[400px]'}`}>
                {items.length === 0 && !loading && (
                  <div className="text-center text-gray-400 mt-20">No memories found.</div>
                )}

                <div className="relative w-full max-w-md mx-auto">
                  {items.map((item, index) => {
                    const offset = isStackExpanded ? 0 : index * 10;
                    const scale = isStackExpanded ? 1 : 1 - (index * 0.05);
                    const zIndex = items.length - index;
                    const opacity = isStackExpanded ? 1 : (index > 3 ? 0 : 1);

                    if (!isStackExpanded && index > 3) return null;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setIsStackExpanded(true)}
                        className={`
                            w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100
                            transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                            ${isStackExpanded ? 'mb-6 relative transform-none' : 'absolute top-0 left-0 cursor-pointer hover:-translate-y-4'}
                          `}
                        style={{
                          zIndex: zIndex,
                          transform: isStackExpanded ? 'none' : `translateY(${offset}px) scale(${scale})`,
                          opacity: opacity
                        }}
                      >
                        <div className="relative aspect-[4/3] group">
                          <img src={item.image} alt="Memory" className="w-full h-full object-cover" />

                          {/* DELETE ICON (Transparent Bin) */}
                          <button
                            onClick={(e) => handleDelete(e, item.id)}
                            className="absolute top-3 right-3 p-2 bg-black/20 hover:bg-red-500/80 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash className="w-4 h-4" />
                          </button>

                          {/* EDIT ICON (Visible when expanded) */}
                          {isStackExpanded && (
                            <button
                              onClick={(e) => handleEditClick(e, item)}
                              className="absolute top-3 right-14 p-2 bg-black/20 hover:bg-blue-500/80 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-all"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
                            <div className="flex items-center text-white font-semibold">
                              <MapPin className="w-4 h-4 mr-1 text-blue-400" />
                              {item.location}
                            </div>
                          </div>
                        </div>
                        {isStackExpanded && (
                          <div className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {item.tags.map(t => (
                                <span key={t} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isStackExpanded && items.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsStackExpanded(false); }}
                    className="fixed bottom-24 right-6 bg-black text-white p-3 rounded-full shadow-2xl z-50"
                  >
                    <ChevronDown />
                  </button>
                )}
              </div>
            </div>

            {/* DESKTOP GRID VIEW */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleEditClick({ stopPropagation: () => { } }, item)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100 cursor-pointer"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                    {/* DELETE ICON */}
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="absolute top-3 right-3 p-2 bg-black/20 hover:bg-red-500/80 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                      <Trash className="w-4 h-4" />
                    </button>

                    <div className={`absolute bottom-3 left-3 right-3 transition-transform duration-300 ${isSearching ? 'translate-y-0' : 'translate-y-full group-hover:translate-y-0'}`}>
                      <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg">
                        <div className="flex items-center text-sm font-bold text-gray-800 mb-1">
                          <MapPin className="w-4 h-4 mr-1 text-blue-500" /> {item.location}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map(t => (
                            <span key={t} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">#{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'upload' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl min-h-[500px] max-w-2xl mx-auto animate-in slide-in-from-bottom-10 duration-500">
            <div
              className="border-2 border-dashed border-gray-200 rounded-2xl h-64 flex flex-col items-center justify-center mb-6 cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden"
            >
              {selectedImage ? (
                <img src={selectedImage} className="w-full h-full object-cover" />
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-gray-400">Tap to upload</p>
                </>
              )}
              <input type="file" onChange={handleImageSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Location</label>
                <input
                  value={inputLocation}
                  onChange={e => setInputLocation(e.target.value)}
                  placeholder="e.g. Top Drawer"
                  className="w-full p-4 bg-gray-50 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Tags (Optional)</label>
                <input
                  value={inputTags}
                  onChange={e => setInputTags(e.target.value)}
                  placeholder="e.g. Keys, Metal"
                  className="w-full p-4 bg-gray-50 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button
                onClick={handleSaveItem}
                disabled={isSaving}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
              >
                {isSaving ? 'Saving...' : 'Save Memory'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* TAB BAR (Mobile Only) */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-white/20 flex justify-between items-center z-40">
        <button
          onClick={() => setActiveTab('memories')}
          className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${activeTab === 'memories' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}
        >
          Memories
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${activeTab === 'upload' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}
        >
          Add New
        </button>
      </div>

      {/* DESKTOP SIDEBAR / NAV (Optional, for now just using header) */}

    </div>
  );
};

// Edit Modal Component
const EditModal = ({ item, onClose, onSave }) => {
  const [location, setLocation] = useState(item.location);
  const [tags, setTags] = useState(item.tags.join(', '));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(item.id, location, tags);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Edit Memory</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Tags (Comma Separated)</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Welcome Overlay Component
const WelcomeOverlay = () => {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem('hasSeenWelcome'));

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('hasSeenWelcome', 'true');
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="max-w-md text-center">
        <div className="w-24 h-24 bg-black rounded-[2.5rem] mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-black/20 animate-bounce-slow">
          <Search className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Welcome to Loci</h1>
        <p className="text-xl text-gray-500 font-medium leading-relaxed mb-10">
          The place where you can keep track of your belongings. Never lose anything again.
        </p>
        <button
          onClick={handleDismiss}
          className="bg-black text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

// iOS-style Login Component
const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Check your email for the login link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7] p-6 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-black rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-black/20">
            <Search className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-black mb-2">Loci</h1>
          <p className="text-gray-500 font-medium">Your external brain.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-white/40">

          {/* TOGGLE BUTTONS */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Log In
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'signup' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500/50 transition-all font-medium placeholder-gray-400"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500/50 transition-all font-medium placeholder-gray-400"
                required
              />
            </div>
            <button
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-black/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : (authMode === 'signup' ? 'Create Account' : 'Sign In')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;