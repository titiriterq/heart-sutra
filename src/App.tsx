import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  LogOut, 
  LogIn, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  X, 
  Sparkles, 
  Eye,
  Menu,
  Home,
  BookOpen,
  Settings
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { format } from 'date-fns';
import { cn } from './lib/utils';

// --- Types ---
interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: Timestamp;
  authorId: string;
  imageUrl?: string;
  isPublic: boolean;
}

interface Comment {
  id: string;
  postId: string;
  content: string;
  ip: string;
  createdAt: Timestamp;
  parentId?: string; // For nested comments
}

const ADMIN_EMAIL = "rumm030419@gmail.com";

// --- Components ---

const CultHeader = ({ user, onLogin, onLogout, isAdmin, toggleMenu }: any) => (
  <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-2 flex justify-between items-center">
    <div className="flex items-center gap-4">
      <button onClick={toggleMenu} className="p-1 hover:bg-gray-100 rounded transition-colors">
        <Menu className="w-6 h-6 text-blue-700" />
      </button>
      <h1 className="text-xl md:text-2xl font-bold text-blue-700 tracking-tight uppercase">
        Heart Sutra
      </h1>
    </div>
    
    <div className="flex items-center gap-4">
      {user ? (
        <div className="flex items-center gap-3">
          <span className="hidden md:block font-medium text-gray-600 text-sm">{user.email}</span>
          <button 
            onClick={onLogout}
            className="text-red-600 font-bold uppercase text-xs hover:underline"
          >
            Leave
          </button>
        </div>
      ) : (
        <button 
          onClick={onLogin}
          className="text-blue-600 font-bold uppercase text-sm hover:underline flex items-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          동참하다
        </button>
      )}
    </div>
  </header>
);

const Sidebar = ({ isOpen, onClose, isAdmin, setView }: any) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
        />
        <motion.div 
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed top-0 left-0 h-full w-64 bg-white z-[70] border-r border-gray-200 p-6 flex flex-col gap-8 shadow-xl"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-blue-700 uppercase">Menu</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex flex-col gap-6">
            <button 
              onClick={() => { setView('home'); onClose(); }}
              className="flex items-center gap-4 text-lg font-bold text-gray-700 hover:text-blue-700 transition-colors group text-left"
            >
              Home
            </button>
            <button 
              onClick={() => { setView('feed'); onClose(); }}
              className="flex items-center gap-4 text-lg font-bold text-gray-700 hover:text-blue-700 transition-colors group text-left"
            >
              Teachings
            </button>
            {isAdmin && (
              <button 
                onClick={() => { setView('admin'); onClose(); }}
                className="flex items-center gap-4 text-lg font-bold text-gray-700 hover:text-blue-700 transition-colors group text-left"
              >
                Admin
              </button>
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <p className="text-[10px] font-bold text-blue-600 uppercase leading-tight">
              "Gate Gate Pāragate Pārasaṃgate Bodhi Svāhā"
            </p>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const PostCard = ({ post, isAdmin, onEdit, onDelete, onReadMore }: any) => (
  <motion.div 
    layout
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="bg-white overflow-hidden flex flex-col transition-colors"
  >
    {post.imageUrl && (
      <div className="h-56 overflow-hidden">
        <img 
          src={post.imageUrl} 
          alt={post.title} 
          className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
          referrerPolicy="no-referrer"
        />
      </div>
    )}
    <div className="p-6 flex-1 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-bold text-blue-700 leading-tight uppercase italic">{post.title}</h3>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => onEdit(post)} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => onDelete(post.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {post.createdAt ? format(post.createdAt.toDate(), 'yyyy.MM.dd') : '...'}
      </div>
      <div className="prose prose-leaflet line-clamp-3 text-sm text-gray-700 overflow-hidden">
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
      <button 
        onClick={() => onReadMore(post.id)}
        className="mt-auto self-start flex items-center gap-1 text-red-600 font-bold uppercase text-xs hover:underline"
      >
        Read More <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  </motion.div>
);

const CommentItem = ({ 
  comment, 
  depth = 0, 
  isAdmin, 
  replyTo, 
  setReplyTo, 
  newComment, 
  setNewComment, 
  isSubmitting, 
  onSubmit, 
  onDelete, 
  allComments 
}: { 
  comment: Comment, 
  depth?: number, 
  isAdmin: boolean,
  replyTo: string | null,
  setReplyTo: (id: string | null) => void,
  newComment: string,
  setNewComment: (val: string) => void,
  isSubmitting: boolean,
  onSubmit: (e: React.FormEvent) => void,
  onDelete: (id: string) => void,
  allComments: Comment[]
}) => {
  const replies = allComments.filter(c => c.parentId === comment.id);
  const isReply = depth > 0;

  return (
    <div className={cn(
      "bg-gray-50 p-4 border-l-2 border-blue-600 relative group transition-all",
      isReply ? "mt-2 border-blue-300 bg-gray-50/50" : "mt-6"
    )}
    style={{ marginLeft: isReply ? `${Math.min(depth * 1.5, 4)}rem` : '0' }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
          IP: {comment.ip} • {comment.createdAt ? format(comment.createdAt.toDate(), 'yyyy.MM.dd HH:mm') : '...'}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setReplyTo(comment.id)}
            className="text-[10px] font-bold text-gray-400 hover:text-blue-600 uppercase tracking-widest"
          >
            Reply
          </button>
          {isAdmin && (
            <button 
              onClick={() => onDelete(comment.id)}
              className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
      
      {replyTo === comment.id && (
        <div className="mt-4 pl-4 border-l border-gray-200">
          <form onSubmit={onSubmit} className="space-y-2">
            <textarea 
              autoFocus
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a reply..."
              className="w-full border border-gray-200 p-2 text-sm focus:outline-none focus:border-blue-600 min-h-[60px] resize-none"
              required
            />
            <div className="flex gap-2">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-1 font-bold uppercase text-[10px] hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Post Reply
              </button>
              <button 
                type="button"
                onClick={() => {
                  setReplyTo(null);
                  setNewComment('');
                }}
                className="text-gray-400 font-bold uppercase text-[10px] hover:underline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {replies.map(reply => (
        <CommentItem 
          key={reply.id} 
          comment={reply} 
          depth={depth + 1} 
          isAdmin={isAdmin}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          newComment={newComment}
          setNewComment={setNewComment}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          onDelete={onDelete}
          allComments={allComments}
        />
      ))}
    </div>
  );
};

const CommentSection = ({ postId, isAdmin }: { postId: string, isAdmin: boolean }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'), 
      orderBy('createdAt', 'asc') // Changed to asc for better conversation flow
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const c = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(c);
    });
    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const ipRes = await fetch('/api/ip');
      const { ip } = await ipRes.json();

      await addDoc(collection(db, 'posts', postId, 'comments'), {
        postId,
        content: newComment.trim(),
        ip,
        createdAt: serverTimestamp(),
        parentId: replyTo || null
      });
      setNewComment('');
      setReplyTo(null);
    } catch (err) {
      console.error("Comment failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!isAdmin) return;
    try {
      const deleteRecursive = async (id: string) => {
        const descendants = comments.filter(c => c.parentId === id);
        for (const descendant of descendants) {
          await deleteRecursive(descendant.id);
        }
        await deleteDoc(doc(db, 'posts', postId, 'comments', id));
      };
      
      await deleteRecursive(commentId);
    } catch (err) {
      console.error("Delete comment failed:", err);
      alert("댓글 삭제에 실패했습니다.");
    }
  };

  const rootComments = comments.filter(c => !c.parentId);

  return (
    <div className="mt-12 pt-12 border-t border-gray-100 space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-blue-700 uppercase tracking-tight">Comments</h3>
        <span className="text-xs font-bold text-gray-400 uppercase">{comments.length} Thoughts</span>
      </div>
      
      {!replyTo && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts anonymously..."
            className="w-full border border-gray-200 p-4 text-sm focus:outline-none focus:border-blue-600 min-h-[100px] resize-none"
            required
          />
          <button 
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-8 py-2 font-bold uppercase text-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {rootComments.map(comment => (
          <CommentItem 
            key={comment.id} 
            comment={comment} 
            isAdmin={isAdmin}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            newComment={newComment}
            setNewComment={setNewComment}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onDelete={handleDeleteComment}
            allComments={comments}
          />
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-gray-400 italic uppercase py-8 text-center border border-dashed border-gray-200">
            Silence is the first response...
          </p>
        )}
      </div>
    </div>
  );
};

const PostEditor = ({ post, onSave, onCancel }: any) => {
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [isPublic, setIsPublic] = useState(post?.isPublic !== false); // Default to true
  const [isSaving, setIsSaving] = useState(false);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image'
  ];

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ title, content, isPublic });
    } catch (error) {
      console.error("Publish error:", error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/95 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border border-gray-300 w-full max-w-4xl p-8 shadow-2xl h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h2 className="text-3xl font-bold text-blue-700 uppercase">
            {post ? 'Edit Teaching' : 'New Teaching'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6 flex-1 overflow-hidden flex flex-col">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-b border-gray-300 p-2 font-bold text-blue-900 focus:outline-none focus:border-blue-600"
              placeholder="Enter title..."
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isPublic" 
              checked={isPublic} 
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">
              Public (Visible to everyone)
            </label>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Content</label>
            <div className="flex-1 overflow-hidden bg-white border border-gray-200">
              <ReactQuill 
                theme="snow"
                value={content}
                onChange={setContent}
                modules={modules}
                formats={formats}
                className="h-full flex flex-col"
                readOnly={isSaving}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-6 mt-10 pt-4 border-t">
          <button 
            onClick={onCancel}
            disabled={isSaving}
            className="text-xs font-bold uppercase text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handlePublish}
            disabled={isSaving}
            className="bg-blue-600 text-white px-10 py-3 font-bold uppercase text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing...
              </>
            ) : 'Publish'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [view, setView] = useState<'home' | 'feed' | 'admin' | 'post'>('home');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null | 'new'>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const selectedPost = posts.find(p => p.id === selectedPostId);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let q;
    if (isAdmin) {
      // Admin sees everything
      q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    } else {
      // Others only see public posts
      q = query(
        collection(db, 'posts'), 
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc')
      );
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(p);
    }, (error) => {
      console.error("Fetch posts error:", error);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      operation,
      path,
      auth: {
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified
      }
    };
    console.error("Firestore Error Details:", JSON.stringify(errInfo, null, 2));
    if (errInfo.error.includes('Missing or insufficient permissions')) {
      alert("권한 오류: 파이어베이스 보안 규칙이 이 작업을 허용하지 않습니다. 관리자 계정으로 로그인되어 있는지 확인해주세요.");
    } else {
      alert(`저장 실패: ${errInfo.error}`);
    }
    throw error;
  };

  const handleSavePost = async (data: any) => {
    if (!isAdmin) {
      alert("관리자 권한이 없습니다. (현재 계정: " + (user?.email || "로그인 안됨") + ")");
      return;
    }
    
    console.log("Saving post...", { title: data.title, author: user?.email });

    // Extract first image URL from content for the featured image
    const parser = new DOMParser();
    const docObj = parser.parseFromString(data.content, 'text/html');
    const firstImg = docObj.querySelector('img');
    const imageUrl = firstImg ? firstImg.src : null;

    try {
      if (editingPost === 'new') {
        const path = 'posts';
        try {
          await addDoc(collection(db, path), {
            title: data.title,
            content: data.content,
            imageUrl,
            isPublic: data.isPublic,
            createdAt: serverTimestamp(),
            authorId: user?.uid
          });
        } catch (err) {
          handleFirestoreError(err, 'create', path);
        }
      } else if (editingPost && typeof editingPost !== 'string') {
        const path = `posts/${editingPost.id}`;
        try {
          await updateDoc(doc(db, 'posts', editingPost.id), {
            title: data.title,
            content: data.content,
            imageUrl,
            isPublic: data.isPublic
          });
        } catch (err) {
          handleFirestoreError(err, 'update', path);
        }
      }
      setEditingPost(null);
    } catch (err) {
      // Error already handled by handleFirestoreError
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm("Delete this teaching?")) {
      try {
        await deleteDoc(doc(db, 'posts', id));
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-blue-600 animate-pulse font-bold uppercase tracking-widest">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-600 selection:text-white">
      <CultHeader 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        isAdmin={isAdmin}
        toggleMenu={() => setIsSidebarOpen(true)}
      />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isAdmin={isAdmin}
        setView={setView}
      />

      <main className="pt-16">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-full max-w-4xl px-4 py-12 flex flex-col items-center gap-8">
                <div className="text-center space-y-4">
                  <p className="text-blue-700 font-bold uppercase text-sm md:text-base leading-tight">
                    When Bodhisattva Avalokiteshvara was practicing the profound Prajna Paramita,<br />
                    he illuminated the five skandhas and saw that they are all empty,<br />
                    and he crossed beyond all suffering and difficulty.
                  </p>
                  <h2 className="text-4xl md:text-7xl font-bold text-red-600 uppercase tracking-tighter leading-none">
                    色卽是空 <br /> 空卽是色
                  </h2>
                </div>

                <div className="relative w-full overflow-hidden border border-gray-200 shadow-2xl">
                  <img 
                    src="https://i.postimg.cc/3x4B00wS/v4-728px-Open-Your-Spiritual-Chakras-Step-2-jpg.jpg" 
                    alt="Hero" 
                    className="w-full h-auto"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-sm p-4 border border-gray-200">
                    <p className="text-blue-700 font-bold text-center uppercase text-xs md:text-sm">
                      Form does not differ from emptiness; emptiness does not differ from form.
                    </p>
                  </div>
                </div>

                <div className="w-full p-6 text-center mt-12">
                  <p className="text-xl md:text-2xl font-bold text-red-600 uppercase italic">
                    Heart Sutra
                  </p>
                  <p className="text-[10px] font-bold text-blue-700 uppercase mt-2">
                    Gate Gate Pāragate 2026
                  </p>
                </div>

                <button 
                  onClick={() => setView('feed')}
                  className="mt-8 bg-blue-600 text-white px-12 py-4 text-xl font-bold uppercase hover:bg-blue-700 transition-colors shadow-lg"
                >
                  Enter the Path
                </button>
              </div>
            </motion.div>
          )}

          {view === 'feed' && (
            <motion.div 
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto px-4 py-12 space-y-12"
            >
              <div className="border-b border-gray-200 pb-6 flex justify-between items-end">
                <h2 className="text-4xl md:text-6xl font-bold text-blue-700 uppercase tracking-tighter">
                  Teachings
                </h2>
                {isAdmin && (
                  <button 
                    onClick={() => setEditingPost('new')}
                    className="bg-blue-600 text-white p-2 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {posts.length > 0 ? (
                  <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                    {posts.map((post, index) => (
                      <motion.div 
                        key={post.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group flex items-center justify-between py-6 cursor-pointer hover:bg-gray-50/50 px-4 transition-all"
                        onClick={() => {
                          setSelectedPostId(post.id);
                          setView('post');
                        }}
                      >
                        <div className="flex items-center gap-6">
                          <span className="text-[10px] font-bold text-gray-300 group-hover:text-blue-600 transition-colors">
                            {index + 1 < 10 ? `0${index + 1}` : index + 1}
                          </span>
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight">
                            {post.title}
                          </h3>
                          {isAdmin && post.isPublic === false && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 font-bold uppercase tracking-widest">
                              Private
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          {isAdmin && (
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setEditingPost(post)} className="p-2 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeletePost(post.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <p className="text-xl font-bold text-gray-300 uppercase italic">The path is currently silent...</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'post' && selectedPost && (
            <motion.div 
              key="post"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto px-4 py-12"
            >
              <button 
                onClick={() => setView('feed')}
                className="mb-8 flex items-center gap-2 text-gray-400 hover:text-blue-600 font-bold uppercase text-xs transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to path
              </button>

              <article className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-6xl font-bold text-blue-700 uppercase tracking-tighter italic">
                    {selectedPost.title}
                  </h2>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {selectedPost.createdAt ? format(selectedPost.createdAt.toDate(), 'yyyy.MM.dd') : '...'}
                  </div>
                </div>

                <div className="prose prose-leaflet max-w-none text-gray-800 leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
                </div>
              </article>

              <CommentSection postId={selectedPost.id} isAdmin={isAdmin} />
            </motion.div>
          )}

          {view === 'admin' && isAdmin && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto px-4 py-12 space-y-12"
            >
              <h2 className="text-4xl font-bold text-blue-700 uppercase border-b border-gray-200 pb-4">
                Admin Dashboard
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-gray-50 p-6 border border-gray-200">
                  <div className="text-3xl font-bold text-blue-700">{posts.length}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">Teachings</div>
                </div>
                <div className="md:col-span-2">
                  <button 
                    onClick={() => setEditingPost('new')}
                    className="w-full bg-blue-600 text-white py-4 font-bold uppercase text-lg hover:bg-blue-700 transition-colors"
                  >
                    Create New Teaching
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-4">Title</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {posts.map(post => (
                      <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-gray-900">{post.title}</td>
                        <td className="p-4 text-[10px] font-bold text-gray-400 uppercase">
                          {post.createdAt ? format(post.createdAt.toDate(), 'yyyy.MM.dd') : '-'}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-4">
                            <button onClick={() => setEditingPost(post)} className="text-blue-600 hover:underline font-bold text-xs uppercase">Edit</button>
                            <button onClick={() => handleDeletePost(post.id)} className="text-red-600 hover:underline font-bold text-xs uppercase">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {editingPost && (
        <PostEditor 
          post={editingPost === 'new' ? null : editingPost} 
          onSave={handleSavePost} 
          onCancel={() => setEditingPost(null)} 
        />
      )}

      <footer className="bg-white py-12 px-4 mt-20 border-t border-gray-100">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h3 className="text-2xl font-bold text-blue-700 uppercase tracking-tight">Heart Sutra</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase">© 2026 GATE GATE PĀRAGATE. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
}
