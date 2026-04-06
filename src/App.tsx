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
  setDoc,
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
  Plus, LogOut, LogIn, Edit2, Trash2, ChevronRight, X, Menu, Settings, Users, MessageSquare, Image as ImageIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { format } from 'date-fns';
import { cn } from './lib/utils';

// --- Types ---
interface Post { id: string; title: string; content: string; createdAt: Timestamp; authorId: string; imageUrl?: string; isPublic: boolean; }
interface Comment { id: string; postId: string; content: string; ip: string; createdAt: Timestamp; parentId?: string; }
interface Visitor { id: string; ip: string; visitedAt: Timestamp; }

const ADMIN_EMAIL = "rumm030419@gmail.com";

// --- Components ---
const CultHeader = ({ user, onLogin, onLogout, isAdmin, toggleMenu }: any) => (
  <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-2 flex justify-between items-center">
    <div className="flex items-center gap-4">
      <button onClick={toggleMenu} className="p-1 hover:bg-gray-100 rounded transition-colors">
        <Menu className="w-6 h-6 text-blue-700" />
      </button>
      <h1 className="text-xl md:text-2xl font-bold text-blue-700 tracking-tight uppercase">Heart Sutra</h1>
    </div>
    <div className="flex items-center gap-4">
      {user ? (
        <div className="flex items-center gap-3">
          <span className="hidden md:block font-medium text-gray-600 text-sm">{user.email}</span>
          <button onClick={onLogout} className="text-red-600 font-bold uppercase text-xs hover:underline">Leave</button>
        </div>
      ) : (
        <button onClick={onLogin} className="text-blue-600 font-bold uppercase text-sm hover:underline flex items-center gap-2">
          <LogIn className="w-4 h-4" /> 관리자 로그인
        </button>
      )}
    </div>
  </header>
);

const Sidebar = ({ isOpen, onClose, isAdmin, setView }: any) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm" />
        <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed top-0 left-0 h-full w-64 bg-white z-[70] border-r border-gray-200 p-6 flex flex-col gap-8 shadow-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-blue-700 uppercase">Menu</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
          </div>
          <nav className="flex flex-col gap-6">
            <button onClick={() => { setView('home'); onClose(); }} className="flex items-center gap-4 text-lg font-bold text-gray-700 hover:text-blue-700">Home</button>
            <button onClick={() => { setView('feed'); onClose(); }} className="flex items-center gap-4 text-lg font-bold text-gray-700 hover:text-blue-700">Teachings</button>
            <button onClick={() => { setView('board'); onClose(); }} className="flex items-center gap-4 text-lg font-bold text-gray-700 hover:text-blue-700">익명 게시판</button>
            {isAdmin && (
              <button onClick={() => { setView('admin'); onClose(); }} className="flex items-center gap-4 text-lg font-bold text-gray-700 hover:text-blue-700">Admin</button>
            )}
          </nav>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// 공용 댓글/게시판 컴포넌트 (익명 허용)
const CommentItem = ({ comment, depth = 0, isAdmin, replyTo, setReplyTo, newComment, setNewComment, isSubmitting, onSubmit, onDelete, allComments }: any) => {
  const replies = allComments.filter((c: any) => c.parentId === comment.id);
  const isReply = depth > 0;
  return (
    <div className={cn("bg-gray-50 p-4 border-l-2 border-blue-600 relative group transition-all", isReply ? "mt-2 border-blue-300 bg-gray-50/50" : "mt-6")} style={{ marginLeft: isReply ? `${Math.min(depth * 1.5, 4)}rem` : '0' }}>
      <div className="flex justify-between items-start mb-2">
        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
          익명({comment.ip}) • {comment.createdAt ? format(comment.createdAt.toDate(), 'yyyy.MM.dd HH:mm') : '...'}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setReplyTo(comment.id)} className="text-[10px] font-bold text-gray-400 hover:text-blue-600 uppercase tracking-widest">Reply</button>
          {isAdmin && <button onClick={() => onDelete(comment.id)} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>}
        </div>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
      {replyTo === comment.id && (
        <div className="mt-4 pl-4 border-l border-gray-200">
          <form onSubmit={onSubmit} className="space-y-2">
            <textarea autoFocus value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a reply..." className="w-full border border-gray-200 p-2 text-sm focus:outline-none focus:border-blue-600 min-h-[60px] resize-none" required />
            <div className="flex gap-2">
              <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-1 font-bold uppercase text-[10px] hover:bg-blue-700">Post Reply</button>
              <button type="button" onClick={() => { setReplyTo(null); setNewComment(''); }} className="text-gray-400 font-bold uppercase text-[10px] hover:underline">Cancel</button>
            </div>
          </form>
        </div>
      )}
      {replies.map((reply: any) => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} isAdmin={isAdmin} replyTo={replyTo} setReplyTo={setReplyTo} newComment={newComment} setNewComment={setNewComment} isSubmitting={isSubmitting} onSubmit={onSubmit} onDelete={onDelete} allComments={allComments} />
      ))}
    </div>
  );
};

const ThreadSection = ({ collectionName, title, isAdmin }: { collectionName: string, title: string, isAdmin: boolean }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    });
    return () => unsubscribe();
  }, [collectionName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // ✅ 1번 해결: Vercel에서 에러 안 나게 무료 공용 IP API로 변경
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipRes.json();
      // IP 뒷자리 가리기 (예: 123.456.xxx.xxx)
      const maskedIp = ip.split('.').slice(0, 2).join('.') + '.*.*';

      await addDoc(collection(db, collectionName), {
        content: newComment.trim(),
        ip: maskedIp,
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

  const handleDelete = async (commentId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, collectionName, commentId));
    } catch (err) { alert("삭제 실패!"); }
  };

  const rootComments = comments.filter(c => !c.parentId);

  return (
    <div className="mt-12 pt-12 border-t border-gray-100 space-y-8 w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-blue-700 uppercase tracking-tight">{title}</h3>
        <span className="text-xs font-bold text-gray-400 uppercase">{comments.length} Thoughts</span>
      </div>
      {!replyTo && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="자유롭게 이야기를 남겨주세요 (익명)" className="w-full border border-gray-200 p-4 text-sm focus:outline-none focus:border-blue-600 min-h-[100px] resize-none" required />
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-2 font-bold uppercase text-xs hover:bg-blue-700">{isSubmitting ? 'Posting...' : 'Post'}</button>
        </form>
      )}
      <div className="space-y-2">
        {rootComments.map(comment => (
          <CommentItem key={comment.id} comment={comment} isAdmin={isAdmin} replyTo={replyTo} setReplyTo={setReplyTo} newComment={newComment} setNewComment={setNewComment} isSubmitting={isSubmitting} onSubmit={handleSubmit} onDelete={handleDelete} allComments={comments} />
        ))}
      </div>
    </div>
  );
};

// --- 에디터 (글쓰기) ---
const PostEditor = ({ post, onSave, onCancel }: any) => {
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [isPublic, setIsPublic] = useState(post?.isPublic !== false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) return alert('제목과 내용을 모두 입력해주세요.');
    setIsSaving(true);
    await onSave({ title, content, isPublic });
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-white/95 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white border border-gray-300 w-full max-w-4xl p-8 shadow-2xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h2 className="text-3xl font-bold text-blue-700 uppercase">{post ? 'Edit Teaching' : 'New Teaching'}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>
        <div className="space-y-6 flex-1 overflow-hidden flex flex-col">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border-b border-gray-300 p-2 font-bold text-blue-900 focus:outline-none" placeholder="Enter title..." disabled={isSaving} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-4 h-4 text-blue-600" />
            <label htmlFor="isPublic" className="text-xs font-bold text-gray-700 cursor-pointer">전체 공개 (Public)</label>
          </div>
          <div className="flex-1 overflow-hidden bg-white border border-gray-200">
            <ReactQuill theme="snow" value={content} onChange={setContent} className="h-full flex flex-col" readOnly={isSaving} />
          </div>
        </div>
        <div className="flex justify-end gap-6 mt-10 pt-4 border-t">
          <button onClick={onCancel} disabled={isSaving} className="text-xs font-bold uppercase text-gray-400 hover:text-gray-600">Cancel</button>
          <button onClick={handlePublish} disabled={isSaving} className="bg-blue-600 text-white px-10 py-3 font-bold uppercase hover:bg-blue-700">Publish</button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [view, setView] = useState<'home' | 'feed' | 'admin' | 'post' | 'board'>('home'); // board 추가
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null | 'new'>(null);
  const [loading, setLoading] = useState(true);
  const [homeImageUrl, setHomeImageUrl] = useState("https://i.postimg.cc/3x4B00wS/v4-728px-Open-Your-Spiritual-Chakras-Step-2-jpg.jpg");
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const selectedPost = posts.find(p => p.id === selectedPostId);

  // Auth & IP Tracking (2번 해결)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    
    // 방문자 IP 기록 로직
    const trackVisitor = async () => {
      try {
        if (!sessionStorage.getItem('visited')) {
          const res = await fetch('https://api.ipify.org?format=json');
          const { ip } = await res.json();
          await addDoc(collection(db, 'visitors'), { ip, visitedAt: serverTimestamp() });
          sessionStorage.setItem('visited', 'true');
        }
      } catch (e) { console.log("Visitor tracking skipped"); }
    };
    trackVisitor();

    // 홈 이미지 가져오기 (5번 해결)
    const unsubImage = onSnapshot(doc(db, 'settings', 'homepage'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().imageUrl) setHomeImageUrl(docSnap.data().imageUrl);
    });

    return () => { unsubscribe(); unsubImage(); };
  }, []);

  // Posts & Visitors Fetch
  useEffect(() => {
    let q = isAdmin ? query(collection(db, 'posts'), orderBy('createdAt', 'desc')) 
                    : query(collection(db, 'posts'), where('isPublic', '==', true), orderBy('createdAt', 'desc'));
    
    const unsubPosts = onSnapshot(q, (snapshot) => setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post))));
    
    let unsubVisitors = () => {};
    if (isAdmin) {
      unsubVisitors = onSnapshot(query(collection(db, 'visitors'), orderBy('visitedAt', 'desc')), (snap) => {
        setVisitors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Visitor)));
      });
    }

    return () => { unsubPosts(); unsubVisitors(); };
  }, [isAdmin]);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (err) { console.error(err); }
  };
  const handleLogout = () => signOut(auth);

  // 5번 해결: 홈화면 이미지 수정 함수
  const handleEditHomeImage = async () => {
    if (!isAdmin) return;
    const newUrl = prompt("새로운 메인 이미지 URL을 입력하세요:", homeImageUrl);
    if (newUrl && newUrl.trim() !== "") {
      try { await setDoc(doc(db, 'settings', 'homepage'), { imageUrl: newUrl }, { merge: true }); alert("이미지가 변경되었습니다!"); } 
      catch (e) { alert("변경 실패"); }
    }
  };

  const handleSavePost = async (data: any) => {
    if (!isAdmin) return;
    const path = editingPost === 'new' ? 'posts' : `posts/${(editingPost as Post).id}`;
    const postData = { title: data.title, content: data.content, isPublic: data.isPublic };
    try {
      if (editingPost === 'new') await addDoc(collection(db, path), { ...postData, createdAt: serverTimestamp(), authorId: user?.uid });
      else await updateDoc(doc(db, 'posts', (editingPost as Post).id), postData);
      setEditingPost(null);
    } catch (err) { alert("저장 실패"); }
  };

  const handleDeletePost = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm("정말 삭제하시겠습니까?")) await deleteDoc(doc(db, 'posts', id));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-600 selection:text-white">
      <CultHeader user={user} onLogin={handleLogin} onLogout={handleLogout} isAdmin={isAdmin} toggleMenu={() => setIsSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isAdmin={isAdmin} setView={setView} />

      <main className="pt-16">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
              <div className="w-full max-w-4xl px-4 py-12 flex flex-col items-center gap-8">
                <div className="text-center space-y-4">
                  <h2 className="text-4xl md:text-7xl font-bold text-red-600 uppercase tracking-tighter">색즉시공 <br /> 공즉시색</h2>
                </div>
                <div className="relative w-full overflow-hidden border border-gray-200 shadow-2xl group">
                  <img src={homeImageUrl} alt="Hero" className="w-full h-auto object-cover max-h-[600px]" referrerPolicy="no-referrer" />
                  {/* 5번 해결: 관리자용 이미지 수정 버튼 */}
                  {isAdmin && (
                    <button onClick={handleEditHomeImage} className="absolute top-4 right-4 bg-blue-600 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10">
                      <ImageIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <button onClick={() => setView('feed')} className="mt-8 bg-blue-600 text-white px-12 py-4 text-xl font-bold uppercase hover:bg-blue-700 shadow-lg">Enter the Path</button>
              </div>
            </motion.div>
          )}

          {view === 'feed' && (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-5xl mx-auto px-4 py-12 space-y-12">
              <div className="border-b border-gray-200 pb-6 flex justify-between items-end">
                <h2 className="text-4xl md:text-6xl font-bold text-blue-700 uppercase tracking-tighter">Teachings</h2>
                {isAdmin && <button onClick={() => setEditingPost('new')} className="bg-blue-600 text-white p-2"><Plus className="w-6 h-6" /></button>}
              </div>
              <div className="space-y-4">
                {posts.map((post, index) => (
                  <motion.div key={post.id} className="group flex items-center justify-between py-6 cursor-pointer hover:bg-gray-50/50 px-4 transition-all" onClick={() => { setSelectedPostId(post.id); setView('post'); }}>
                    <div className="flex items-center gap-6">
                      <span className="text-gray-400">{index + 1}</span>
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-blue-700">{post.title}</h3>
                      {isAdmin && !post.isPublic && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 font-bold">비공개</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      {isAdmin && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setEditingPost(post)} className="p-2 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeletePost(post.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'post' && selectedPost && (
            <motion.div key="post" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto px-4 py-12">
              <button onClick={() => setView('feed')} className="mb-8 flex items-center gap-2 text-gray-400 hover:text-blue-600 font-bold uppercase text-xs">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back
              </button>
              <article className="space-y-8">
                <h2 className="text-4xl md:text-5xl font-bold text-blue-700">{selectedPost.title}</h2>
                <div className="prose max-w-none text-gray-800"><div dangerouslySetInnerHTML={{ __html: selectedPost.content }} /></div>
              </article>
              {/* 개별 글 댓글 섹션 */}
              <ThreadSection collectionName={`posts/${selectedPost.id}/comments`} title="Comments" isAdmin={isAdmin} />
            </motion.div>
          )}

          {/* 6번 해결: 익명 스레드 게시판 */}
          {view === 'board' && (
            <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-5xl mx-auto px-4 py-12">
              <ThreadSection collectionName="anonymous_board" title="익명 게시판" isAdmin={isAdmin} />
            </motion.div>
          )}

          {/* 2번 해결: 관리자 대시보드 (방문자 통계 추가) */}
          {view === 'admin' && isAdmin && (
            <motion.div key="admin" className="max-w-5xl mx-auto px-4 py-12 space-y-12">
              <h2 className="text-4xl font-bold text-blue-700 uppercase border-b pb-4">Admin Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-gray-50 p-6 border border-gray-200">
                  <div className="text-3xl font-bold text-blue-700">{posts.length}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase">전체 글 수</div>
                </div>
                <div className="bg-blue-50 p-6 border border-blue-200">
                  <div className="text-3xl font-bold text-blue-700 flex items-center gap-2"><Users className="w-8 h-8"/> {visitors.length}</div>
                  <div className="text-[10px] font-bold text-blue-400 uppercase">누적 방문자 수</div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 p-6 max-h-[400px] overflow-y-auto">
                <h3 className="font-bold text-lg mb-4">최근 방문자 IP 기록</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  {visitors.slice(0, 50).map(v => (
                     <li key={v.id} className="flex justify-between border-b py-2">
                       <span>{v.ip}</span>
                       <span>{v.visitedAt ? format(v.visitedAt.toDate(), 'yyyy.MM.dd HH:mm') : '-'}</span>
                     </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {editingPost && <PostEditor post={editingPost === 'new' ? null : editingPost} onSave={handleSavePost} onCancel={() => setEditingPost(null)} />}
    </div>
  );
}
