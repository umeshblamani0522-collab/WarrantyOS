import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext, useSearchParams, useParams } from 'react-router-dom';
import { get, post, put } from './api';
import { validateEmail, validateIssue, validateName, validatePassword, validatePhone, validateSerial } from './validation';
import './styles.css';

const ROLE_HOME = { ADMIN: '/admin', TECHNICIAN: '/technician', CUSTOMER: '/customer' };

// Resolve notification destinations in one place so the bell drawer and full
// notification history use the same role-safe routing rules.
function getNotificationTarget(role, notification) {
  const type = String(notification?.type || '').toUpperCase();
  if (type.includes('WARRANTY')) {
    if (role === 'CUSTOMER') return '/customer/warranties';
    if (role === 'ADMIN') return '/admin/warranties';
    return '/technician/jobs';
  }
  if (type.includes('PRODUCT')) {
    if (role === 'CUSTOMER') return '/customer/products';
    if (role === 'ADMIN') return '/admin/products';
    return '/technician/history';
  }
  if (type.includes('REPAIR') || type.includes('REPLACEMENT')) {
    if (role === 'CUSTOMER') return '/customer/requests';
    if (role === 'TECHNICIAN') return '/technician/repairs';
    return '/admin/repairs';
  }
  if (type.includes('REQUEST') || type.includes('SERVICE') || type.includes('ASSIGN') || type.includes('SLA') || type.includes('ESCALATION') || type.includes('STATUS')) {
    if (role === 'CUSTOMER') return '/customer/requests';
    if (role === 'TECHNICIAN') return '/technician/jobs';
    return '/admin/requests';
  }
  return ROLE_HOME[role] || '/';
}

const NAV = {
  ADMIN: [
    { to: '/admin', label: 'Overview', icon: 'grid', end: true },
    { to: '/admin/notifications', label: 'Notifications', icon: 'bell' },
    { to: '/admin/customers', label: 'Customers', icon: 'users' },
    { to: '/admin/products', label: 'Products', icon: 'box' },
    { to: '/admin/policies', label: 'Policies', icon: 'shield' },
    { to: '/admin/warranties', label: 'Warranties', icon: 'badge' },
    { to: '/admin/requests', label: 'Service requests', icon: 'ticket' },
    { to: '/admin/repairs', label: 'Repairs & replacements', icon: 'tool' },
    { to: '/admin/analytics', label: 'Analytics', icon: 'chart' },
    { to: '/admin/audit', label: 'Audit trail', icon: 'history' }
  ],
  TECHNICIAN: [
    { to: '/technician', label: 'My workspace', icon: 'grid', end: true },
    { to: '/technician/notifications', label: 'Notifications', icon: 'bell' },
    { to: '/technician/jobs', label: 'Assigned jobs', icon: 'ticket' },
    { to: '/technician/repairs', label: 'Repair work', icon: 'tool' },
    { to: '/technician/history', label: 'Product history', icon: 'history' }
  ],
  CUSTOMER: [
    { to: '/customer', label: 'Overview', icon: 'grid', end: true },
    { to: '/customer/notifications', label: 'Notifications', icon: 'bell' },
    { to: '/customer/products', label: 'My products', icon: 'box' },
    { to: '/customer/warranties', label: 'My warranties', icon: 'badge' },
    { to: '/customer/requests', label: 'Service requests', icon: 'ticket' },
    { to: '/customer/history', label: 'Product history', icon: 'history' }
  ]
};

function Icon({ name, size = 17 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 4.13a3 3 0 0 1 0 5.74"/></>,
    box: <><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></>,
    shield: <><path d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    badge: <><circle cx="12" cy="12" r="8"/><path d="m9.5 12 1.7 1.7 3.8-3.8"/><path d="m16 3 1 2 2 .5-1.5 1.5"/></>,
    ticket: <><path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V7Z"/><path d="M13 7v2"/><path d="M13 15v2"/></>,
    tool: <><path d="m14.7 6.3-7 7 3 3 7-7"/><path d="M16 3a5 5 0 0 1 5 5c0 .5-.1 1-.2 1.4l-4.3-4.3A5 5 0 0 0 16 3Z"/><path d="m5 19 2 2"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 3-4 3 2 4-6"/></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/></>,
    alert: <><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    logout: <><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 3v18"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    refresh: <><path d="M20 11a8 8 0 1 0 1 5"/><path d="M20 4v7h-7"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    close: <><path d="M6 6l12 12M18 6 6 18"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    filter: <><path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z"/></>
  };
  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('warrantyos_user')) || null; } catch { return null; }
}

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = getStoredUser();
    if (user?.role && ROLE_HOME[user.role]) navigate(ROLE_HOME[user.role], { replace: true });
  }, [navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await post('/auth/login', form);
      localStorage.setItem('warrantyos_user', JSON.stringify(user));
      localStorage.setItem('warrantyos_token', user.token);
      navigate(ROLE_HOME[user.role] || '/', { replace: true });
    } catch (e) {
      setError(e.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="login-page-modern login-page-centered">
      <div className="login-shell login-shell-centered">
        <section className="login-auth-panel login-auth-panel-centered">
          <div className="login-auth-card login-auth-card-centered">
            <div className="login-card-brand" aria-label="WarrantyOS">
              <div className="brand-mark">W</div>
              <div>
                <strong>WarrantyOS</strong>
                <span>Warranty and after-sales service</span>
              </div>
            </div>

            <div className="login-auth-head">
              <div className="login-auth-eyebrow">Secure sign in</div>
              <h2>Welcome back</h2>
              <p>Sign in to manage products, warranties and service requests.</p>
            </div>

            <form onSubmit={submit} className="login-form-modern">
              <label>
                <span>Email address</span>
                <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} type="email" placeholder="you@company.com" autoComplete="username" required />
              </label>
              <label>
                <span>Password</span>
                <input value={form.password} onChange={e=>setForm({...form,password:e.target.value})} type="password" placeholder="Enter your password" autoComplete="current-password" required />
              </label>
              {error && <div className="form-error-modern" role="alert">{error}</div>}
              <button className="btn btn-primary btn-lg full login-submit-btn" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
                <Icon name="arrow" size={16}/>
              </button>
            </form>

            <div className="login-account-links">
              <Link to="/forgot-password">Forgot password?</Link>
              <span>New customer? <Link to="/register">Create an account</Link></span>
            </div>

            <div className="login-security-note"><Icon name="check" size={14}/><span>Secure sign in · Role-based access</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}


function AuthShell({ eyebrow, title, text, children }) {
  return <div className="auth-page-modern">
    <div className="auth-shell">
      <section className="auth-brand-panel">
        <div className="login-brand-modern">
          <div className="brand-mark">W</div>
          <div><strong>WarrantyOS</strong><span>After-sales operations platform</span></div>
        </div>
        <div className="auth-brand-copy">
          <span className="auth-brand-kicker">Customer access</span>
          <h1>Keep your warranty journey in one place.</h1>
          <p>Register products, review protection and raise service requests from a secure customer workspace.</p>
          <div className="auth-brand-points">
            <span><Icon name="check" size={15}/> Warranty coverage visibility</span>
            <span><Icon name="check" size={15}/> Service request tracking</span>
            <span><Icon name="check" size={15}/> Repair and replacement history</span>
          </div>
        </div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-card">
          <div className="login-auth-eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
          <p className="auth-form-intro">{text}</p>
          {children}
        </div>
      </section>
    </div>
  </div>;
}

function Register() {
  const [form, setForm] = useState({name:'',email:'',phone:'',password:'',confirmPassword:''});
  const [error,setError]=useState('');
  const [success,setSuccess]=useState(null);
  const [loading,setLoading]=useState(false);
  const submit=async e=>{
    e.preventDefault(); setError(''); setSuccess(null);
    const checks=[validateName(form.name),validateEmail(form.email),validatePhone(form.phone),validatePassword(form.password)];
    const firstError=checks.find(Boolean);
    if(firstError){setError(firstError);return;}
    if(form.password!==form.confirmPassword){setError('Passwords do not match.');return;}
    setLoading(true);
    try { const data=await post('/auth/register',{...form,name:form.name.trim(),email:form.email.trim().toLowerCase(),phone:form.phone.trim()}); setSuccess(data); }
    catch(err){ setError(err.message || 'Unable to create your account.'); }
    finally{ setLoading(false); }
  };
  return <AuthShell eyebrow="Create account" title="Start your customer account" text="Register once, then manage your products, warranties and service requests from one workspace.">
    <form onSubmit={submit} className="auth-form-stack" noValidate>
      <label><span>Full name</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your full name" autoComplete="name" maxLength={100} required/></label>
      <label><span>Email address</span><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} type="email" placeholder="you@example.com" autoComplete="email" maxLength={254} required/></label>
      <label><span>Phone number <em>(optional)</em></span><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 98765 43210" autoComplete="tel" maxLength={20}/></label>
      <div className="auth-two-col">
        <label><span>Password</span><input value={form.password} onChange={e=>setForm({...form,password:e.target.value})} type="password" placeholder="8+ chars, mixed case & symbol" autoComplete="new-password" minLength={8} maxLength={64} required/></label>
        <label><span>Confirm password</span><input value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})} type="password" placeholder="Repeat password" autoComplete="new-password" minLength={8} maxLength={64} required/></label>
      </div>
      {error && <div className="form-error-modern">{error}</div>}
      {success && <div className="form-success-modern"><strong>Account created.</strong><span>{success.message}</span>{success.verificationUrl && <a href={success.verificationUrl}>Open local development verification link</a>} {!success.verificationUrl && <span className="auth-help-note">You must verify the email link before you can sign in.</span>}</div>}
      {!success && <button type="submit" className="btn btn-primary btn-lg full" disabled={loading}>{loading?'Creating account…':'Create customer account'}<Icon name="arrow" size={16}/></button>}
    </form>
    <div className="auth-footer-link">Already have an account? <Link to="/">Sign in</Link></div>
  </AuthShell>;
}

function ForgotPassword() {
  const [email,setEmail]=useState(''); const [error,setError]=useState(''); const [result,setResult]=useState(null); const [loading,setLoading]=useState(false);
  const submit=async e=>{e.preventDefault();setError('');setResult(null);const emailError=validateEmail(email);if(emailError){setError(emailError);return;}setLoading(true);try{setResult(await post('/auth/forgot-password',{email:email.trim().toLowerCase()}));}catch(err){setError(err.message||'Unable to process the request.');}finally{setLoading(false);}};
  return <AuthShell eyebrow="Password recovery" title="Reset your password" text="Enter the email on your WarrantyOS account. We will issue a secure, time-limited reset link.">
    <form onSubmit={submit} className="auth-form-stack">
      <label><span>Email address</span><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required/></label>
      {error && <div className="form-error-modern">{error}</div>}
      {result && <div className="form-success-modern"><strong>Check your email.</strong><span>{result.message}</span>{result.resetUrl && <a href={result.resetUrl}>Open development reset link</a>}</div>}
      <button className="btn btn-primary btn-lg full" disabled={loading}>{loading?'Sending…':'Send reset link'}<Icon name="arrow" size={16}/></button>
    </form>
    <div className="auth-footer-links"><Link to="/">Back to sign in</Link><Link to="/register">Create account</Link></div>
  </AuthShell>;
}

function VerifyEmail() {
  const [params]=useSearchParams(); const [state,setState]=useState({loading:true,error:'',message:''});
  useEffect(()=>{const token=params.get('token'); if(!token){setState({loading:false,error:'Verification token is missing.',message:''});return;} get(`/auth/verify?token=${encodeURIComponent(token)}`).then(data=>setState({loading:false,error:'',message:data.message||'Email verified successfully.'})).catch(err=>setState({loading:false,error:err.message||'Verification failed.',message:''}));},[params]);
  return <AuthShell eyebrow="Email verification" title={state.loading?'Verifying your email…':state.error?'Verification failed':'Email verified'} text={state.loading?'Please wait while we confirm the secure verification link sent to your email.':state.error?'This link may have expired or already been used.':'Your WarrantyOS customer account is now ready to use.'}>
    {state.loading ? <div className="auth-status-card">Checking verification token…</div> : state.error ? <div className="form-error-modern">{state.error}</div> : <div className="form-success-modern"><strong>{state.message}</strong><span>You can sign in now.</span></div>}
    <Link to="/" className="btn btn-primary btn-lg full auth-back-button">Continue to sign in <Icon name="arrow" size={16}/></Link>
  </AuthShell>;
}

function ResetPassword() {
  const [params]=useSearchParams(); const token=params.get('token')||''; const [form,setForm]=useState({password:'',confirmPassword:''}); const [error,setError]=useState(''); const [success,setSuccess]=useState(''); const [loading,setLoading]=useState(false);
  const submit=async e=>{e.preventDefault();setError('');setSuccess('');const passwordError=validatePassword(form.password);if(passwordError){setError(passwordError);return;}if(form.password!==form.confirmPassword){setError('Passwords do not match.');return;}setLoading(true);try{const data=await post('/auth/reset-password',{token,...form});setSuccess(data.message);}catch(err){setError(err.message||'Unable to reset password.');}finally{setLoading(false);}};
  return <AuthShell eyebrow="Password recovery" title="Choose a new password" text="Use a strong password with at least 8 characters. The reset link is single-use and time-limited.">
    {!token ? <div className="form-error-modern">This reset link is missing its token.</div> : <form onSubmit={submit} className="auth-form-stack">
      <label><span>New password</span><input value={form.password} onChange={e=>setForm({...form,password:e.target.value})} type="password" autoComplete="new-password" minLength={8} maxLength={64} required/></label>
      <label><span>Confirm password</span><input value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})} type="password" autoComplete="new-password" minLength={8} maxLength={64} required/></label>
      {error && <div className="form-error-modern">{error}</div>}
      {success && <div className="form-success-modern"><strong>Password updated.</strong><span>{success}</span></div>}
      {!success && <button className="btn btn-primary btn-lg full" disabled={loading}>{loading?'Updating…':'Reset password'}<Icon name="check" size={16}/></button>}
    </form>}
    <div className="auth-footer-link"><Link to="/">Back to sign in</Link></div>
  </AuthShell>;
}

function ProtectedLayout({ role }) {
  const user = getStoredUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user || user.role !== role) { navigate(ROLE_HOME[user?.role] || '/', { replace: true }); return; }
    let active = true;
    let client = null;
    const load = async () => { try { const items = await get('/notifications'); if (active) setNotifications(items || []); } catch {} };
    load();

    // Load the WebSocket libraries only after the protected workspace is mounted.
    // This prevents a SockJS/STOMP browser-runtime problem from blanking the public login page.
    const connectRealtime = async () => {
      try {
        const [{ Client }, SockJSModule] = await Promise.all([
          import('@stomp/stompjs'),
          import('sockjs-client')
        ]);
        if (!active) return;
        const SockJS = SockJSModule.default || SockJSModule;
        client = new Client({
          webSocketFactory: () => new SockJS('/ws'), reconnectDelay: 5000,
          onConnect: () => {
            const push = (m) => {
              try {
                const n = JSON.parse(m.body);
                setNotifications(current => [n, ...current.filter(x=>x.id !== n.id)].slice(0,50));
              } catch {}
            };
            client.subscribe(`/topic/notifications/user/${user.id}`, push);
            client.subscribe(`/topic/notifications/role/${user.role}`, push);
          }
        });
        client.activate();
      } catch (error) {
        console.warn('[WarrantyOS] Real-time notifications unavailable:', error);
      }
    };
    connectRealtime();
    return () => { active = false; if (client) client.deactivate(); };
  }, [role, user?.id, user?.role]);

  if (!user || user.role !== role) return null;

  const unread = notifications.filter(n => !n.readFlag).length;
  const markRead = async (n) => {
    if (n.readFlag) return;
    try {
      await put(`/notifications/${n.id}/read`);
      setNotifications(items => items.map(x => x.id === n.id ? { ...x, readFlag: true } : x));
    } catch (error) {
      console.warn(`[WarrantyOS] Could not mark notification ${n.id} as read:`, error);
    }
  };
  const signOut = () => { localStorage.removeItem('warrantyos_user'); localStorage.removeItem('warrantyos_token'); navigate('/', { replace: true }); };
  const openNotification = async (n) => {
    await markRead(n);
    setNoticeOpen(false);
    navigate(getNotificationTarget(role, n));
  };
  const markAllRead = async () => {
    const pending = notifications.filter(n => !n.readFlag);
    const markedIds = await Promise.all(pending.map(async n => {
      try { await put(`/notifications/${n.id}/read`); return n.id; }
      catch (error) { console.warn(`[WarrantyOS] Could not mark notification ${n.id} as read:`, error); return null; }
    }));
    const marked = new Set(markedIds.filter(id => id !== null));
    setNotifications(items => items.map(n => marked.has(n.id) ? { ...n, readFlag: true } : n));
  };
  const navItems = NAV[role];
  const activeLabel = navItems.find(n => n.to === location.pathname)?.label || navItems.find(n => location.pathname.startsWith(n.to + '/'))?.label || 'Overview';

  return <div className={`app-shell role-${role.toLowerCase()}`}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">W</div><div><strong>WarrantyOS</strong><span>After-sales platform</span></div></div>
      <div className="role-context"><span className="status-dot"/>Live workspace<span className="role-tag">{role}</span></div>
      <nav className="nav"><div className="nav-section-label">Workspace</div>{navItems.map(item => <NavLink key={item.to} to={item.to} end={item.end} className={({isActive})=>`nav-item ${isActive?'active':''}`}><Icon name={item.icon}/><span>{item.label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><button className="profile-card" type="button" aria-label={`Signed in as ${user.name} (${user.email})`}><span className="avatar">{user.name?.charAt(0)?.toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></button></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><div className="breadcrumbs">WarrantyOS <span>/</span> {activeLabel}</div><h1>{activeLabel}</h1></div>
        <div className="topbar-actions">
          <button className="icon-button" onClick={()=>window.location.reload()} title="Refresh"><Icon name="refresh"/></button>
          <button aria-label="Notifications" aria-expanded={noticeOpen} className={`icon-button ${unread?'attention':''}`} onClick={()=>setNoticeOpen(v=>!v)}><Icon name="bell"/>{unread>0&&<b>{unread>99?'99+':unread}</b>}</button>
          {noticeOpen && <NotificationDrawer notifications={notifications} unread={unread} role={role} onClose={()=>setNoticeOpen(false)} onOpen={openNotification} onClear={markAllRead} />}
          <div className="account-chip"><span className="avatar avatar-sm">{user.name?.charAt(0)?.toUpperCase()}</span><span>{user.name}</span><em>{role}</em></div>
          <button className="btn btn-ghost" onClick={signOut}><Icon name="logout"/> Sign out</button>
        </div>
      </header>
      <div className="page-wrap"><Outlet context={{user}} /></div>
    </main>
  </div>;
}

function NotificationDrawer({ notifications, unread, role, onClose, onOpen, onClear }) {
  const navigate = useNavigate();
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // createPortal requires an actual DOM node as its second argument.
  // document.body exists in the Vite browser app and avoids a missing-root crash.
  if (!portalTarget) return null;

  return createPortal(
    <div className="notification-overlay" role="presentation">
      <button type="button" className="notification-overlay-backdrop" aria-label="Close notifications" onClick={onClose}/>
      <aside className="notification-drawer-modern" role="dialog" aria-modal="true" aria-label="Notifications">
        <div className="notification-drawer-head-modern">
          <div>
            <div className="notification-drawer-kicker">Workspace activity</div>
            <h3>Notifications</h3>
            <p>{unread ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'You are all caught up.'}</p>
          </div>
          <button type="button" className="notification-close-modern" onClick={onClose} aria-label="Close"><Icon name="close" size={18}/></button>
        </div>
        <div className="notification-drawer-toolbar">
          <span>{notifications.length} total</span>
          <button type="button" onClick={onClear} disabled={!unread}>{unread ? 'Mark all read' : 'All read'}</button>
        </div>
        <div className="notification-drawer-list-modern">
          {notifications.length ? notifications.map(n => (
            <button type="button" key={n.id} className={`notification-entry-modern ${n.readFlag ? '' : 'is-unread'}`} onClick={()=>onOpen(n)}>
              <span className="notification-entry-icon"><Icon name={String(n.type||'').toUpperCase().includes('WARRANTY')?'badge':String(n.type||'').toUpperCase().includes('REPAIR')?'tool':'ticket'} size={16}/></span>
              <span className="notification-entry-copy">
                <strong>{n.title || 'Service update'}</strong>
                <small>{n.message || 'There is a new update in your workspace.'}</small>
                <em>{n.readFlag ? 'Read' : 'Open related activity'} <Icon name="arrow" size={12}/></em>
              </span>
              {!n.readFlag && <span className="notification-entry-unread"/>}
            </button>
          )) : (
            <div className="notification-drawer-empty">
              <div className="empty-notification-icon"><Icon name="bell" size={22}/></div>
              <strong>No notifications right now</strong>
              <span>Service updates, warranty events and SLA alerts will appear here.</span>
              <button type="button" className="btn btn-secondary" onClick={()=>{onClose(); navigate(ROLE_HOME[role] || '/');}}>Back to workspace</button>
            </div>
          )}
        </div>
        <div className="notification-drawer-footer">
          <NavLink to={role==='ADMIN'?'/admin/notifications':role==='TECHNICIAN'?'/technician/notifications':'/customer/notifications'} onClick={onClose}>View notification history <Icon name="arrow" size={13}/></NavLink>
        </div>
      </aside>
    </div>,
    portalTarget
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[WarrantyOS] React runtime error:', error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:40, background:'#f5f7fb', fontFamily:'Inter,system-ui,sans-serif' }}>
        <div style={{ maxWidth:760, width:'100%', background:'#fff', border:'1px solid #e7ebf2', borderRadius:18, padding:28, boxShadow:'0 20px 50px rgba(16,31,64,.12)' }}>
          <div style={{ color:'#c64d5a', fontWeight:800, fontSize:18 }}>WarrantyOS could not render this page</div>
          <p style={{ color:'#657185', marginTop:10 }}>The backend may still be running. This is a frontend runtime error, shown here so it can be fixed without a blank screen.</p>
          <pre style={{ whiteSpace:'pre-wrap', wordBreak:'break-word', background:'#f8f9fb', padding:14, borderRadius:10, color:'#303a4f', fontSize:13 }}>{String(this.state.error?.stack || this.state.error?.message || this.state.error)}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop:12, border:0, borderRadius:10, padding:'11px 15px', background:'#5b61e9', color:'#fff', fontWeight:800, cursor:'pointer' }}>Reload</button>
        </div>
      </div>
    );
  }
}

function App() {
  return <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="/forgot-password" element={<ForgotPassword/>}/>
      <Route path="/verify-email" element={<VerifyEmail/>}/>
      <Route path="/reset-password" element={<ResetPassword/>}/>
      <Route path="/admin" element={<ProtectedLayout role="ADMIN"/>}><Route index element={<AdminDashboard/>}/><Route path="customers" element={<Customers/>}/><Route path="products" element={<Products/>}/><Route path="policies" element={<Policies/>}/><Route path="warranties" element={<Warranties/>}/><Route path="requests" element={<Requests role="ADMIN"/>}/><Route path="repairs" element={<Repairs role="ADMIN"/>}/><Route path="analytics" element={<Analytics/>}/><Route path="audit" element={<Audit/>}/><Route path="notifications" element={<NotificationCenter/>}/></Route>
      <Route path="/technician" element={<ProtectedLayout role="TECHNICIAN"/>}><Route index element={<TechnicianDashboard/>}/><Route path="jobs" element={<Requests role="TECHNICIAN"/>}/><Route path="repairs" element={<Repairs role="TECHNICIAN"/>}/><Route path="history" element={<History/>}/><Route path="notifications" element={<NotificationCenter/>}/></Route>
      <Route path="/customer" element={<ProtectedLayout role="CUSTOMER"/>}><Route index element={<CustomerDashboard/>}/><Route path="products" element={<Products readonly/>}/><Route path="warranties" element={<Warranties readonly/>}/><Route path="requests" element={<Requests role="CUSTOMER"/>}/><Route path="claims/:serial" element={<CustomerClaim/>}/><Route path="history" element={<History/>}/><Route path="notifications" element={<NotificationCenter/>}/></Route>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </BrowserRouter>;
}

function PageHeader({kicker, title, text, action}) { return <div className="page-header"><div><div className="eyebrow">{kicker}</div><h2>{title}</h2><p>{text}</p></div>{action}</div>; }
function StatCard({label,value,sub,icon,tone='indigo'}) { return <div className={`stat-card tone-${tone}`}><div className="stat-top"><span className="stat-icon"><Icon name={icon}/></span><span>{label}</span></div><strong>{value}</strong><small>{sub}</small></div>; }
function Card({title,subtitle,action,children,className=''}) { return <section className={`card ${className}`}><div className="card-head"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>{children}</section>; }
function Badge({value}) { const v=String(value||'').replaceAll('_',' '); const key=String(value||'').toLowerCase(); return <span className={`badge badge-${key.replaceAll(' ','-')}`}>{v||'—'}</span>; }
function Loading(){ return <div className="loading-state"><div className="spinner"/><span>Loading workspace data…</span></div>; }
function EmptyState({title,text,action}){return <div className="empty-state"><div className="empty-mark">+</div><strong>{title}</strong><p>{text}</p>{action}</div>;}
function ErrorState({message}){return <div className="error-state"><strong>Something went wrong</strong><span>{message||'Unable to load data.'}</span></div>;}
function useFetch(loader,deps=[]){const [state,setState]=useState({loading:true,data:null,error:null});useEffect(()=>{let live=true;setState({loading:true,data:null,error:null});loader().then(data=>live&&setState({loading:false,data,error:null})).catch(error=>live&&setState({loading:false,data:null,error}));return()=>{live=false};},deps);return state;}
function Table({columns,rows,emptyTitle='No records yet',emptyText='Data will appear here as soon as activity is created.'}){ if(!rows?.length)return <EmptyState title={emptyTitle} text={emptyText}/>; return <div className="table-shell"><table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={row.id??i}>{columns.map(c=><td key={c.key}>{c.render?c.render(row):row[c.key]??'—'}</td>)}</tr>)}</tbody></table></div>; }
function Field({label,value,onChange,placeholder,type='text',required=false,options,disabled=false,min,max,maxLength,step}){return <label className="field"><span>{label}{required&&<b>*</b>}</span>{options?<select value={value} onChange={onChange} disabled={disabled} required={required}><option value="">Select…</option>{options.map(o=><option key={o} value={o}>{o.replaceAll('_',' ')}</option>)}</select>:<input value={value} onChange={onChange} placeholder={placeholder} type={type} required={required} disabled={disabled} min={min} max={max} maxLength={maxLength} step={step}/>}</label>}
function Toolbar({children}){return <div className="toolbar">{children}</div>;}
function QuickAction({to,icon,title,text}){return <NavLink to={to} className="quick-action"><span><Icon name={icon}/></span><div><strong>{title}</strong><small>{text}</small></div><Icon name="arrow"/></NavLink>;}

function NotificationCenter(){
  const outlet = useOutletContext();
  const role = outlet?.user?.role || 'CUSTOMER';
  const state=useFetch(()=>get('/notifications'),[]);
  if(state.loading)return <Loading/>;
  if(state.error)return <ErrorState message={state.error.message}/>;
  return <><PageHeader kicker="Workspace activity" title="Notifications" text="Review service updates, warranty events and operational alerts in one place."/>
    <Card title="Recent notifications" subtitle={`${state.data.length} updates`}>
      {state.data.length ? <div className="notification-center-list">{state.data.map(n=><NotificationCenterItem key={n.id} notification={n} role={role}/>)}</div> : <EmptyState title="All caught up" text="There are no new notifications for this account."/>}
    </Card>
  </>;
}

function NotificationCenterItem({notification:n, role}){
  const navigate=useNavigate();
  const open=async()=>{
    try { await put(`/notifications/${n.id}/read`); }
    catch (error) { console.warn(`[WarrantyOS] Could not mark notification ${n.id} as read:`, error); }
    navigate(getNotificationTarget(role, n));
  };
  return <button type="button" className={`notification-center-item ${n.readFlag?'':'unread'}`} onClick={open}>
    <span className="notification-center-dot"/><span className="notification-center-copy"><strong>{n.title}</strong><small>{n.message}</small><em>Open related activity <Icon name="arrow" size={12}/></em></span>
  </button>;
}

function AdminDashboard(){
  const state = useFetch(() => Promise.all([
    get('/dashboard/summary'),
    get('/analytics'),
    get('/escalations')
  ]), []);

  if (state.loading) return <Loading/>;
  if (state.error) return <ErrorState message={state.error.message}/>;

  const [d, a, e] = state.data;
  const recent = d.recentRequests || [];
  const mix = Object.entries(a.byStatus || {});
  const max = Math.max(1, ...mix.map(([, value]) => Number(value)));

  return <>
    <PageHeader
      kicker="Operations control"
      title="Warranty operations, at a glance."
      text="Monitor demand, coverage, service workload and SLA pressure from one operational view."
      action={<div className="live-pill"><span/>All systems operational</div>}
    />

    <div className="stats-grid">
      <StatCard label="Customers" value={d.customers} sub="Active accounts" icon="users"/>
      <StatCard label="Registered products" value={d.products} sub="Tracked serials" icon="box" tone="cyan"/>
      <StatCard label="Active warranties" value={d.activeWarranties} sub="Currently covered" icon="badge" tone="green"/>
      <StatCard label="Open service cases" value={d.openRequests} sub={`${d.escalated} at SLA risk`} icon="ticket" tone="amber"/>
    </div>

    <div className="dashboard-grid admin-dashboard-grid">
      <Card title="Service workload" subtitle="Live distribution by case status" className="span-2">
        <div className="bar-chart">
          {mix.length > 0 ? mix.map(([name, value]) => (
            <div className="bar-row" key={name}>
              <div className="bar-label">
                <span>{name.replaceAll('_', ' ')}</span>
                <strong>{value}</strong>
              </div>
              <div className="bar-track">
                <i style={{ width: `${Number(value) / max * 100}%` }}/>
              </div>
            </div>
          )) : (
            <EmptyState title="No requests yet" text="Create your first service request to activate this view."/>
          )}
        </div>
      </Card>

      <Card title="SLA watch" subtitle="Cases requiring immediate attention">
        <div className="big-stat danger">{e.length}</div>
        <div className="muted">Escalated cases</div>
        {e.slice(0, 3).map(r => (
          <div className="alert-row" key={r.id}>
            <span>!</span>
            <div><strong>Request #{r.id}</strong><small>{r.issue}</small></div>
            <Badge value={r.status}/>
          </div>
        ))}
        {!e.length && <div className="success-callout">No SLA breaches. Operations are on track.</div>}
      </Card>

      <Card title="Recent service activity" subtitle="Latest cases across the network" className="span-2">
        <Table rows={recent} columns={[
          {key:'id', label:'CASE', render:r=><strong>#{r.id}</strong>},
          {key:'serialNumber', label:'SERIAL'},
          {key:'issue', label:'ISSUE'},
          {key:'status', label:'STATUS', render:r=><Badge value={r.status}/>},
          {key:'assignedTo', label:'ASSIGNED'}
        ]}/>
      </Card>

      <Card title="Quick actions" subtitle="Common operations">
        <div className="quick-grid">
          <QuickAction to="/admin/requests" icon="ticket" title="Manage requests" text="Assign and update cases"/>
          <QuickAction to="/admin/products" icon="box" title="Register product" text="Add a new serial"/>
          <QuickAction to="/admin/warranties" icon="badge" title="Activate warranty" text="Start customer coverage"/>
          <QuickAction to="/admin/analytics" icon="chart" title="View analytics" text="Review trends and SLAs"/>
        </div>
      </Card>
    </div>
  </>;
}

function TechnicianDashboard(){
  const state=useFetch(()=>get('/dashboard/summary'),[]); if(state.loading)return <Loading/>; if(state.error)return <ErrorState message={state.error.message}/>; const d=state.data||{}; const jobs=d.recentRequests||[];
  return <>
    <PageHeader kicker="Field service workspace" title="Focus on the jobs that need action." text="See today's workload, SLA risk and the next repair decision without the noise of the admin console." action={<div className="live-pill"><span/>Live job queue</div>}/>
    <div className="stats-grid"><StatCard label="Assigned jobs" value={d.assigned} sub="Your current workload" icon="ticket"/><StatCard label="Open work" value={d.open} sub="Cases needing action" icon="tool" tone="amber"/><StatCard label="Resolved" value={d.resolved} sub="Completed successfully" icon="check" tone="green"/><StatCard label="SLA risk" value={d.escalated} sub="Needs escalation review" icon="shield" tone="red"/></div>
    <div className="dashboard-grid">
      <Card title="My priority queue" subtitle="Work closest to SLA or customer impact" className="span-2"><Table rows={jobs} columns={[{key:'id',label:'CASE',render:r=><strong>#{r.id}</strong>},{key:'serialNumber',label:'PRODUCT'},{key:'issue',label:'ISSUE'},{key:'status',label:'STATUS',render:r=><Badge value={r.status}/>},{key:'escalated',label:'SLA',render:r=>r.escalated?<Badge value="ESCALATED"/>:<span className="on-track">On track</span>}]}/></Card>
      <Card title="Shift checklist" subtitle="Keep customer visibility current"><div className="checklist"><div><Icon name="check"/><span>Update request status after each field action.</span></div><div><Icon name="check"/><span>Record diagnosis and parts used in repairs.</span></div><div><Icon name="check"/><span>Resolve or escalate before the SLA window closes.</span></div></div><NavLink to="/technician/repairs" className="btn btn-secondary full">Open repair workspace <Icon name="arrow"/></NavLink></Card>
    </div>
  </>;
}

function CustomerDashboard(){
  const state=useFetch(()=>Promise.all([get('/dashboard/summary'),get('/products'),get('/warranties'),get('/requests')]),[]); if(state.loading)return <Loading/>; if(state.error)return <ErrorState message={state.error.message}/>; const [d,products,warranties,requests]=state.data;
  const activeW = warranties.filter(w=>w.status==='ACTIVE').length;
  return <>
    <PageHeader kicker="Customer service portal" title={`Welcome back, ${(getStoredUser()?.name || 'Customer').split(' ')[0]}.`} text="See your products, coverage and service journey in one place." action={<NavLink to="/customer/requests" className="btn btn-primary">Create service request <Icon name="arrow"/></NavLink>}/>
    <div className="stats-grid"><StatCard label="My products" value={products.length} sub="Registered with WarrantyOS" icon="box"/><StatCard label="Active coverage" value={activeW} sub="Warranties in force" icon="badge" tone="green"/><StatCard label="Open requests" value={d.openRequests} sub="Still in progress" icon="ticket" tone="amber"/><StatCard label="Resolved" value={d.resolvedRequests} sub="Completed service cases" icon="check" tone="cyan"/></div>
    <div className="dashboard-grid customer-grid">
      <Card title="My products" subtitle="Your registered assets" action={<NavLink to="/customer/products" className="text-link">Manage products <Icon name="arrow" size={14}/></NavLink>} className="span-2"><div className="product-grid">{products.slice(0,4).map(p=><div className="product-card" key={p.id}><div className="product-icon"><Icon name="box"/></div><div><strong>{p.model}</strong><span>{p.serialNumber}</span><small>{p.category} · Purchased {p.purchaseDate}</small></div></div>)}{!products.length&&<EmptyState title="No products registered yet" text="Register your first purchased product from My products to begin its warranty and service journey." action={<NavLink to="/customer/products" className="btn btn-primary btn-sm">Register product <Icon name="plus" size={14}/></NavLink>}/>}</div></Card>
      <Card title="Coverage snapshot" subtitle="Active warranties"><div className="coverage-list">{warranties.slice(0,4).map(w=><div key={w.id}><div><strong>{w.serialNumber}</strong><small>Expires {w.expiryDate}</small></div><Badge value={w.status}/></div>)}{!warranties.length&&<EmptyState title="No warranties" text="Warranty coverage will appear here once a product is activated."/>}</div></Card>
      <Card title="Recent service activity" subtitle="Your latest cases"><Table rows={requests.slice(0,5)} columns={[{key:'id',label:'CASE',render:r=><strong>#{r.id}</strong>},{key:'serialNumber',label:'SERIAL'},{key:'issue',label:'ISSUE'},{key:'status',label:'STATUS',render:r=><Badge value={r.status}/>},{key:'assignedTo',label:'TECHNICIAN'}]}/></Card>
    </div>
  </>;
}

function Customers(){
  const state=useFetch(()=>get('/customers'),[]); const [form,setForm]=useState({name:'',email:'',phone:''}); const [q,setQ]=useState(''); const [error,setError]=useState(''); if(state.loading)return <Loading/>; if(state.error)return <ErrorState message={state.error.message}/>; const rows=state.data.filter(c=>`${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  const save=async e=>{e.preventDefault();setError('');try{await post('/customers',form);setForm({name:'',email:'',phone:''});window.location.reload();}catch(err){setError(err.message||'Unable to create customer.');}};
  return <><PageHeader kicker="Customer management" title="Customer accounts" text="Manage the people, contact details and service footprint behind every case." action={<span className="count-chip">{state.data.length} accounts</span>}/><div className="content-grid two-cols"><Card title="Add customer" subtitle="Create an account record for after-sales operations"><form onSubmit={save} className="form-grid"><Field label="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="Customer full name"/><Field label="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} type="email" required placeholder="customer@example.com"/><Field label="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 …"/>{error&&<div className="form-error-modern">{error}</div>}<button type="submit" className="btn btn-primary">Create customer <Icon name="plus"/></button></form></Card><Card title="Customer directory" subtitle="Search by name, email or phone"><Toolbar><div className="search-box"><Icon name="search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search customers"/></div></Toolbar><Table rows={rows} columns={[{key:'id',label:'ID'},{key:'name',label:'CUSTOMER',render:r=><strong>{r.name}</strong>},{key:'email',label:'EMAIL'},{key:'phone',label:'PHONE'}]}/></Card></div></>;
}

function Products({readonly=false}){
  const state=useFetch(()=>get('/products'),[]);
  const cust=useFetch(()=>readonly?Promise.resolve([]):get('/customers'),[readonly]);
  const [form,setForm]=useState({serialNumber:'',model:'',category:'',purchaseDate:'',customerId:''});
  const [error,setError]=useState('');
  const [showRegister,setShowRegister]=useState(!readonly);
  if(state.loading||(!readonly&&cust.loading))return <Loading/>;
  if(state.error)return <ErrorState message={state.error.message}/>;
  const rows = Array.isArray(state.data) ? state.data : [];
  const categories = [...new Set(rows.map(p=>p.category).filter(Boolean))];
  const latest = rows.filter(p=>p.purchaseDate).sort((a,b)=>String(b.purchaseDate).localeCompare(String(a.purchaseDate)))[0];
  const save=async e=>{
    e.preventDefault();
    setError('');
    const serialError=validateSerial(form.serialNumber);
    if(serialError){setError(serialError);return;}
    if(!form.model.trim()||!form.category.trim()||!form.purchaseDate){
      setError('Serial number, model, category and purchase date are required.');
      return;
    }
    if(!readonly&&!form.customerId){setError('Please select a customer.');return;}
    if(form.purchaseDate>new Date().toISOString().slice(0,10)){
      setError('Purchase date cannot be in the future.');
      return;
    }
    const payload={
      serialNumber:form.serialNumber.trim().toUpperCase(),
      model:form.model.trim(),
      category:form.category.trim(),
      purchaseDate:form.purchaseDate
    };
    if(!readonly) payload.customerId=Number(form.customerId);
    try{
      await post('/products',payload);
      window.location.reload();
    }catch(err){setError(err.message||'Unable to register product.');}
  };
  return <>
    <PageHeader
      kicker={readonly?'Customer assets':'Asset registry'}
      title={readonly?'My products':'Products'}
      text={readonly?'Register products you own, then track their warranty and service journey from one place.':'Register and trace every product entering the warranty lifecycle.'}
      action={readonly
        ? <button type="button" className="btn btn-primary" onClick={()=>{setShowRegister(v=>!v);setError('');}}><Icon name="plus" size={16}/>{showRegister?'Hide form':'Register product'}</button>
        : <span className="count-chip">{rows.length} {rows.length===1?'registered product':'registered products'}</span>}
    />
    {readonly&&<div className="customer-summary-grid">
      <div className="customer-summary-card"><span className="customer-summary-icon"><Icon name="box" size={18}/></span><div><small>Total products</small><strong>{rows.length}</strong><span>Registered to this account</span></div></div>
      <div className="customer-summary-card"><span className="customer-summary-icon customer-summary-icon-cyan"><Icon name="grid" size={18}/></span><div><small>Product categories</small><strong>{categories.length}</strong><span>{categories.length ? categories.slice(0,3).join(' · ') : 'No categories yet'}</span></div></div>
      <div className="customer-summary-card"><span className="customer-summary-icon customer-summary-icon-green"><Icon name="calendar" size={18}/></span><div><small>Latest purchase</small><strong>{latest?.purchaseDate || '—'}</strong><span>{latest?.model || 'No purchase recorded'}</span></div></div>
    </div>}
    {readonly&&showRegister&&<Card className="register-product-card" title="Register your product" subtitle="Add a product you purchased so it can be linked to your customer account and used for warranty and service requests.">
      <form onSubmit={save} className="form-grid product-register-form">
        <div className="form-grid-two">
          <Field label="Serial number" value={form.serialNumber} onChange={e=>setForm({...form,serialNumber:e.target.value})} required maxLength="60" placeholder="SN-10024"/>
          <Field label="Product model" value={form.model} onChange={e=>setForm({...form,model:e.target.value})} required maxLength="120" placeholder="Samsung QLED"/>
          <Field label="Category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required maxLength="80" placeholder="TV"/>
          <Field label="Purchase date" value={form.purchaseDate} onChange={e=>setForm({...form,purchaseDate:e.target.value})} type="date" max={new Date().toISOString().slice(0,10)} required/>
        </div>
        {error&&<div className="form-error-modern">{error}</div>}
        <div className="register-product-actions"><div className="helper-box register-product-helper"><strong>What happens next?</strong><span>The product is linked to your account. An administrator can then activate the applicable warranty policy after reviewing the registered product.</span></div><button type="submit" className="btn btn-primary">Register product <Icon name="plus"/></button></div>
      </form>
    </Card>}
    <div className={`content-grid ${readonly?'single-column':''}`}>
      <Card className="data-card" title={readonly?'Registered products':'Product register'} subtitle={readonly?`${rows.length} product records linked to your account.`:'Register, search and trace every product entering the warranty lifecycle.'}>
        <Table rows={rows} emptyTitle={readonly?'No products registered yet':'No products registered'} emptyText={readonly?'Use Register product above to add your first purchased product.':'Register a product to start its warranty lifecycle.'} columns={[
          {key:'serialNumber',label:'PRODUCT / SERIAL',render:r=><div className="table-product-cell"><span className="table-product-icon"><Icon name="box" size={16}/></span><div><strong>{r.model || 'Unnamed product'}</strong><small>{r.serialNumber}</small></div></div>},
          {key:'category',label:'CATEGORY',render:r=><span className="table-secondary-text">{r.category || '—'}</span>},
          {key:'purchaseDate',label:'PURCHASE DATE',render:r=><span className="table-date">{r.purchaseDate || '—'}</span>},
          ...(!readonly?[{key:'customerId',label:'CUSTOMER',render:r=><span className="table-secondary-text">Customer #{r.customerId ?? '—'}</span>}]:[{key:'status',label:'STATUS',render:()=> <Badge value="REGISTERED"/>}])
        ]}/>
      </Card>
      {!readonly&&<Card title="Register product" subtitle="Link a unique serial to a customer account"><form onSubmit={save} className="form-grid"><Field label="Serial number" value={form.serialNumber} onChange={e=>setForm({...form,serialNumber:e.target.value})} required maxLength="60" placeholder="SN-10024"/><Field label="Model" value={form.model} onChange={e=>setForm({...form,model:e.target.value})} required maxLength="120" placeholder="Samsung QLED"/><Field label="Category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required maxLength="80" placeholder="TV"/><Field label="Purchase date" value={form.purchaseDate} onChange={e=>setForm({...form,purchaseDate:e.target.value})} type="date" max={new Date().toISOString().slice(0,10)} required/><Field label="Customer" value={form.customerId} onChange={e=>setForm({...form,customerId:e.target.value})} options={(cust.data||[]).map(c=>String(c.id))} required/>{error&&<div className="form-error-modern">{error}</div>}<button type="submit" className="btn btn-primary">Register product <Icon name="plus"/></button></form></Card>}
    </div>
  </>
}

function Policies(){
  const state=useFetch(()=>get('/policies'),[]);
  const [form,setForm]=useState({name:'',category:'',model:'',durationMonths:'12',coverageConditions:'',exclusions:'',purchaseConditions:'',replaceAfterRepairs:'3'});
  const [error,setError]=useState('');
  if(state.loading)return <Loading/>;
  if(state.error)return <ErrorState message={state.error.message}/>;
  const save=async e=>{e.preventDefault();setError('');
    if(!form.name.trim()||!form.category.trim()){setError('Policy name and category are required.');return;}
    const duration=Number(form.durationMonths), threshold=Number(form.replaceAfterRepairs);
    if(!Number.isInteger(duration)||duration<1||duration>120){setError('Warranty duration must be 1 to 120 months.');return;}
    if(!Number.isInteger(threshold)||threshold<1||threshold>20){setError('Replacement threshold must be 1 to 20 repairs.');return;}
    try{await post('/policies',{...form,durationMonths:duration,replaceAfterRepairs:threshold,active:true});window.location.reload();}catch(err){setError(err.message||'Unable to save policy.');}
  };
  return <><PageHeader kicker="Coverage design" title="Warranty policies" text="Define duration, coverage conditions, exclusions and purchase conditions used by the warranty decision engine."/>
    <div className="content-grid"><Card title="Policy catalogue"><Table rows={state.data} columns={[{key:'id',label:'ID'},{key:'name',label:'POLICY',render:r=><strong>{r.name}</strong>},{key:'category',label:'CATEGORY'},{key:'model',label:'MODEL'},{key:'durationMonths',label:'TERM'},{key:'coverageConditions',label:'COVERAGE'},{key:'exclusions',label:'EXCLUSIONS'},{key:'replaceAfterRepairs',label:'REPLACE AFTER'}]}/></Card>
      <Card title="Create policy" subtitle="Keep business rules explicit"><form onSubmit={save} className="form-grid">
        <Field label="Policy name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="Premium protection"/>
        <Field label="Category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required placeholder="TV"/>
        <Field label="Model" value={form.model} onChange={e=>setForm({...form,model:e.target.value})} placeholder="Model-specific rule"/>
        <Field label="Duration (months)" value={form.durationMonths} onChange={e=>setForm({...form,durationMonths:e.target.value})} type="number" min="1" max="120" required/>
        <Field label="Coverage conditions" value={form.coverageConditions} onChange={e=>setForm({...form,coverageConditions:e.target.value})} placeholder="Manufacturing defects, performance faults"/>
        <Field label="Exclusions" value={form.exclusions} onChange={e=>setForm({...form,exclusions:e.target.value})} placeholder="physical damage,liquid damage"/>
        <Field label="Purchase conditions" value={form.purchaseConditions} onChange={e=>setForm({...form,purchaseConditions:e.target.value})} placeholder="Valid purchase date / registered product"/>
        <Field label="Replacement threshold" value={form.replaceAfterRepairs} onChange={e=>setForm({...form,replaceAfterRepairs:e.target.value})} type="number" min="1" max="20" required/>
        {error&&<div className="form-error-modern">{error}</div>}
        <button type="submit" className="btn btn-primary">Save policy <Icon name="check"/></button>
      </form></Card></div></>
}

function Warranties({readonly=false}){
  const state=useFetch(()=>get('/warranties'),[]);
  const prod=useFetch(()=>get('/products'),[]);
  if(state.loading||prod.loading)return <Loading/>;
  if(state.error)return <ErrorState message={state.error.message}/>;

  const products=Array.isArray(prod.data)?prod.data:[];
  const warrantyList=Array.isArray(state.data)?state.data:[];
  const warrantyBySerial=new Map(warrantyList.map(w=>[String(w.serialNumber||'').toUpperCase(),w]));

  const rows=readonly
    ? products.map(p=>{
        const w=warrantyBySerial.get(String(p.serialNumber||'').toUpperCase());
        return w
          ? {...w, model:p.model, category:p.category}
          : { id:`pending-${p.id}`, serialNumber:p.serialNumber, model:p.model, category:p.category, status:'PENDING_ACTIVATION', activationDate:null, expiryDate:null, policyId:null };
      })
    : warrantyList.map(w=>{
        const p=products.find(x=>String(x.serialNumber||'').toUpperCase()===String(w.serialNumber||'').toUpperCase());
        return {...w, model:p?.model, category:p?.category};
      });

  const active=rows.filter(w=>String(w.status||'').toUpperCase()==='ACTIVE').length;
  const expired=rows.filter(w=>String(w.status||'').toUpperCase()==='EXPIRED').length;
  const pending=rows.filter(w=>String(w.status||'').toUpperCase()==='PENDING_ACTIVATION').length;
  const nextExpiry=rows.filter(w=>String(w.status||'').toUpperCase()==='ACTIVE'&&w.expiryDate).sort((a,b)=>String(a.expiryDate).localeCompare(String(b.expiryDate)))[0];

  return <>
    <PageHeader
      kicker="Warranty coverage"
      title={readonly?'My warranties':'Warranty register'}
      text={readonly?'Review your protection, start a warranty claim for active coverage and track service eligibility.':'Activate and monitor warranty coverage against registered serial numbers.'}
      action={<span className="count-chip">{rows.length} {rows.length===1?'coverage record':'coverage records'}</span>}
    />

    {readonly&&<div className="customer-summary-grid">
      <div className="customer-summary-card"><span className="customer-summary-icon customer-summary-icon-green"><Icon name="badge" size={18}/></span><div><small>Active coverage</small><strong>{active}</strong><span>Eligible to raise warranty claims</span></div></div>
      <div className="customer-summary-card"><span className="customer-summary-icon customer-summary-icon-amber"><Icon name="calendar" size={18}/></span><div><small>Next expiry</small><strong>{nextExpiry?.expiryDate || '—'}</strong><span>{nextExpiry?.serialNumber ? `Serial ${nextExpiry.serialNumber}` : 'No active coverage yet'}</span></div></div>
      <div className="customer-summary-card"><span className="customer-summary-icon customer-summary-icon-cyan"><Icon name="box" size={18}/></span><div><small>Awaiting activation</small><strong>{pending}</strong><span>{pending ? 'Registered products need admin activation' : 'All registered products have coverage records'}</span></div></div>
    </div>}

    <Card className="data-card" title={readonly?'Coverage register':'Warranty register'} subtitle={readonly?`${rows.length} registered product coverage records.`:`${rows.length} coverage records in the warranty register.`}>
      <Table rows={rows} columns={[
        {key:'serialNumber',label:'PRODUCT / SERIAL',render:r=><div className="table-product-cell"><span className="table-product-icon table-warranty-icon"><Icon name="badge" size={16}/></span><div><strong>{r.model || 'Registered product'}</strong><small>{r.serialNumber}</small></div></div>},
        {key:'category',label:'CATEGORY',render:r=><span className="table-secondary-text">{r.category || '—'}</span>},
        {key:'activationDate',label:'ACTIVATED',render:r=><span className="table-date">{r.activationDate || '—'}</span>},
        {key:'expiryDate',label:'EXPIRES',render:r=><span className="table-date">{r.expiryDate || '—'}</span>},
        {key:'status',label:'STATUS',render:r=><Badge value={r.status}/>},
        ...(readonly?[{key:'action',label:'ACTION',render:r=>{
          const status=String(r.status||'').toUpperCase();
          if(status==='ACTIVE') return <NavLink to={`/customer/claims/${encodeURIComponent(r.serialNumber)}`} className="mini-btn claim-mini">Claim warranty <Icon name="arrow" size={12}/></NavLink>;
          if(status==='PENDING_ACTIVATION') return <span className="muted">Awaiting activation</span>;
          return <span className="muted">Coverage expired</span>;
        }}]:[]),
      ]}/>
    </Card>

    {!readonly&&<Card title="Activate warranty" subtitle="Activation uses the applicable policy and the registered product purchase date">
      <WarrantyActivationForm/>
    </Card>}
  </>;
}

function WarrantyActivationForm(){
  const [serial,setSerial]=useState('');
  const [error,setError]=useState('');
  const submit=async e=>{
    e.preventDefault();
    setError('');
    const serialError=validateSerial(serial);
    if(serialError){setError(serialError);return;}
    try{await post(`/warranties/activate/${encodeURIComponent(serial.trim().toUpperCase())}`);window.location.reload();}
    catch(err){setError(err.message||'Unable to activate warranty.');}
  };
  return <>
    <form onSubmit={submit} className="form-grid">
      <Field label="Product serial" value={serial} onChange={e=>setSerial(e.target.value)} required placeholder="TV-10001"/>
      {error&&<div className="form-error-modern">{error}</div>}
      <button type="submit" className="btn btn-primary">Activate coverage <Icon name="badge"/></button>
    </form>
    <div className="helper-box">The warranty engine selects an active policy using product model/category and calculates the coverage period from the purchase date.</div>
  </>;
}

function CustomerClaim(){
  const {serial:encodedSerial=''}=useParams();
  const serial=decodeURIComponent(encodedSerial);
  const data=useFetch(()=>Promise.all([get('/products'),get('/warranties')]),[serial]);
  const [issue,setIssue]=useState('');
  const [error,setError]=useState('');
  const [result,setResult]=useState(null);
  const [submitting,setSubmitting]=useState(false);

  if(data.loading)return <Loading/>;
  if(data.error)return <ErrorState message={data.error.message}/>;
  const products=Array.isArray(data.data?.[0])?data.data[0]:[];
  const warranties=Array.isArray(data.data?.[1])?data.data[1]:[];
  const product=products.find(p=>String(p.serialNumber||'').toUpperCase()===serial.toUpperCase());
  const warranty=warranties.find(w=>String(w.serialNumber||'').toUpperCase()===serial.toUpperCase());
  const status=String(warranty?.status||'').toUpperCase();

  if(!product)return <><PageHeader kicker="Warranty claim" title="Product not found" text="The selected product is not registered to your customer account."/><ErrorState message="Return to My products and select a registered product."/></>;
  if(!warranty || status!=='ACTIVE')return <>
    <PageHeader kicker="Warranty claim" title="Warranty claim unavailable" text="A warranty claim can be submitted only while the product has active coverage." action={<NavLink to="/customer/warranties" className="btn btn-secondary">Back to my warranties</NavLink>}/>
    <div className="claim-decision-card claim-unavailable">
      <div className="claim-decision-icon"><Icon name="shield" size={22}/></div>
      <div><strong>{warranty ? `Coverage is ${status.toLowerCase()}.` : 'Warranty is awaiting activation.'}</strong><p>{warranty ? 'This product is not currently eligible for a warranty claim.' : 'Your product has been registered successfully, but an administrator must activate the applicable warranty policy before a warranty claim can be submitted.'}</p></div>
    </div>
  </>;

  const submit=async e=>{
    e.preventDefault();
    setError('');setResult(null);
    const issueError=validateIssue(issue);
    if(issueError){setError(issueError);return;}
    setSubmitting(true);
    try{
      const created=await post('/requests/warranty-claim',{serialNumber:serial,issue:issue.trim()});
      setResult(created);
      setIssue('');
    }catch(err){setError(err.message||'Unable to submit warranty claim.');}
    finally{setSubmitting(false);}
  };

  return <>
    <PageHeader kicker="Warranty claim" title="Claim warranty service" text="Describe the product problem. WarrantyOS will evaluate your coverage and choose the appropriate service path automatically." action={<NavLink to="/customer/warranties" className="btn btn-secondary">Back to my warranties</NavLink>}/>
    <div className="claim-grid">
      <Card title="Product under warranty" subtitle="This product is linked to your customer account">
        <div className="claim-product-card"><span className="claim-product-icon"><Icon name="box" size={22}/></span><div><strong>{product.model}</strong><span>{product.serialNumber}</span><small>{product.category} · Purchased {product.purchaseDate}</small></div><Badge value="ACTIVE"/></div>
        <div className="claim-coverage-row"><span>Warranty expires</span><strong>{warranty.expiryDate}</strong></div>
        <div className="helper-box">Submitting this form creates a service request and invokes the warranty eligibility and service decision engine.</div>
      </Card>
      <Card title="Describe the problem" subtitle="This information is used during warranty validation">
        <form onSubmit={submit} className="form-grid">
          <label className="field"><span>Product serial</span><input value={product.serialNumber} disabled/></label>
          <label className="field field-wide"><span>Issue description<b>*</b></span><textarea value={issue} onChange={e=>setIssue(e.target.value)} placeholder="Describe the fault, symptoms, error message or performance problem" maxLength={1000} required/></label>
          {error&&<div className="form-error-modern">{error}</div>}
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>{submitting?'Checking warranty…':'Submit warranty claim'} <Icon name="arrow"/></button>
        </form>
      </Card>
    </div>
    {result&&<div className="claim-result-wrap">
      <Card title="Warranty decision" subtitle={`Claim #${result.id} has been registered`} className="claim-result-card">
        <div className="claim-result-grid">
          <div><small>Eligibility</small><Badge value={result.eligibility}/></div>
          <div><small>Service path</small><Badge value={result.path}/></div>
          <div><small>Status</small><Badge value={result.status}/></div>
        </div>
        <div className="claim-reason"><strong>Decision</strong><p>{result.reason || 'The warranty engine has processed your claim.'}</p></div>
        <div className="claim-result-actions"><NavLink to="/customer/requests" className="btn btn-primary">Track service request <Icon name="arrow"/></NavLink><NavLink to="/customer/notifications" className="btn btn-secondary">View notifications</NavLink></div>
      </Card>
    </div>}
  </>;
}

function Requests({role}){
  const state=useFetch(()=>get('/requests'),[role]);
  const techs=useFetch(()=>role==='ADMIN'?get('/users/technicians'):Promise.resolve([]),[role]);
  const [form,setForm]=useState({serialNumber:'',issue:''});
  const [error,setError]=useState('');
  if(state.loading||techs.loading)return <Loading/>;
  if(state.error)return <ErrorState message={state.error.message}/>;

  const update=async(id,status)=>{setError('');try{await put(`/requests/${id}/status?status=${encodeURIComponent(status)}`);window.location.reload();}catch(err){setError(err.message||'Unable to update request.');}};
  const assign=async(id,tech)=>{setError('');try{await put(`/requests/${id}/assign?tech=${encodeURIComponent(tech)}`);window.location.reload();}catch(err){setError(err.message||'Unable to assign request.');}};
  const create=async e=>{
    e.preventDefault();setError('');
    const serialError=validateSerial(form.serialNumber);const issueError=validateIssue(form.issue);
    if(serialError||issueError){setError(serialError||issueError);return;}
    try{await post('/requests',{serialNumber:form.serialNumber.trim().toUpperCase(),issue:form.issue.trim()});setForm({serialNumber:'',issue:''});window.location.reload();}
    catch(err){setError(err.message||'Unable to create service request.');}
  };
  const canCreate=role==='CUSTOMER'||role==='ADMIN'||role==='TECHNICIAN';

  const actionFor=(r)=>{
    if(role==='TECHNICIAN'){
      if(r.status==='ASSIGNED') return <button type="button" onClick={()=>update(r.id,'UNDER_REPAIR')} className="mini-btn">Start work</button>;
      if(r.status==='UNDER_REPAIR') return <NavLink to={`/technician/repairs?requestId=${r.id}${String(r.path||'').toUpperCase()==='REPLACE'?'&mode=replacement':''}`} className="mini-btn success">{String(r.path||'').toUpperCase()==='REPLACE'?'Record replacement':'Record repair'}</NavLink>;
      if(r.status==='RESOLVED') return <button type="button" onClick={()=>update(r.id,'CLOSED')} className="mini-btn">Close case</button>;
      return <span className="muted">—</span>;
    }
    if(role==='ADMIN'){
      if(['CLOSED','RESOLVED'].includes(r.status)) return <span className="muted">—</span>;
      return <select value="" onChange={e=>{if(e.target.value)assign(r.id,e.target.value)}}><option value="">Assign…</option>{techs.data.map(t=><option value={t.name} key={t.id}>{t.name}</option>)}</select>;
    }
    return <span className="muted">Track progress</span>;
  };

  return <>
    <PageHeader
      kicker={role==='CUSTOMER'?'Customer service':'Service operations'}
      title={role==='CUSTOMER'?'My service requests':role==='TECHNICIAN'?'Assigned jobs':'Service request command centre'}
      text={role==='CUSTOMER'?'Every warranty claim becomes a service request. Use Claim warranty from active coverage to start a guided claim.':role==='TECHNICIAN'?'Work only on assigned cases. Starting work does not resolve a request; the repair or replacement record completes the case.':'Control intake, assignment, SLA exposure and resolution across the network.'}
      action={role==='CUSTOMER'?<NavLink to="/customer/warranties" className="btn btn-primary">Claim warranty <Icon name="badge" size={15}/></NavLink>:null}
    />
    {canCreate&&<Card title={role==='CUSTOMER'?'Request service':'Register service request'} subtitle={role==='CUSTOMER'?'For products with active warranty, use Claim warranty for the guided coverage flow. This form is available for general or paid service requests.':'Use this intake for operational service cases; customer warranty claims use the guided claim flow.'}><form onSubmit={create} className="request-form"><div className="request-grid"><Field label="Product serial" value={form.serialNumber} onChange={e=>setForm({...form,serialNumber:e.target.value})} required maxLength="60" placeholder="TV-10001"/><label className="field field-wide"><span>Issue<b>*</b></span><textarea value={form.issue} onChange={e=>setForm({...form,issue:e.target.value})} placeholder="Describe the issue, symptoms or error message" maxLength={1000} required/></label></div>{error&&<div className="form-error-modern">{error}</div>}<button type="submit" className="btn btn-primary">Submit service request <Icon name="arrow"/></button></form></Card>}
    <Card title={role==='TECHNICIAN'?'My work queue':'Service queue'} subtitle={`${state.data.length} cases visible`}>
      <Table rows={state.data} columns={[
        {key:'id',label:'CASE',render:r=><strong>#{r.id}</strong>},
        {key:'serialNumber',label:'SERIAL'},
        {key:'issue',label:'ISSUE'},
        {key:'status',label:'STATUS',render:r=><Badge value={r.status}/>},
        {key:'assignedTo',label:'ASSIGNED'},
        {key:'eligibility',label:'COVERAGE',render:r=><Badge value={r.eligibility}/>},
        {key:'path',label:'SERVICE PATH',render:r=><Badge value={r.path}/>},
        ...(role==='CUSTOMER'?[{key:'reason',label:'DECISION',render:r=><span className="decision-cell" title={r.reason||''}>{r.reason||'—'}</span>}]:[]),
        {key:'actions',label:'ACTION',render:actionFor}
      ]}/>
    </Card>
  </>;
}

function Repairs({role}){
  const [searchParams]=useSearchParams();
  const requestedId=searchParams.get('requestId')||'';
  const requestedMode=searchParams.get('mode')||'';
  const state=useFetch(()=>Promise.all([get('/repairs'),role==='ADMIN'||role==='TECHNICIAN'?get('/replacements'):Promise.resolve([])]),[role]);
  const [form,setForm]=useState({requestId:requestedId,diagnosis:'',action:'',parts:'',laborCost:''});
  const [replacement,setReplacement]=useState({requestId:requestedId,replacementSerial:'',reason:''});
  const [error,setError]=useState('');
  useEffect(()=>{
    if(requestedId){setForm(x=>({...x,requestId:requestedId}));setReplacement(x=>({...x,requestId:requestedId}));}
  },[requestedId]);
  if(state.loading)return <Loading/>;
  if(state.error)return <ErrorState message={state.error.message}/>;
  const [repairs,replacements]=state.data;
  const save=async e=>{e.preventDefault();setError('');if(!form.requestId||!form.diagnosis.trim()||!form.action.trim()){setError('Request ID, diagnosis and action are required.');return;}const cost=Number(form.laborCost||0);if(!Number.isFinite(cost)||cost<0){setError('Labour cost must be zero or greater.');return;}try{await post('/repairs',{...form,requestId:Number(form.requestId),diagnosis:form.diagnosis.trim(),action:form.action.trim(),laborCost:cost});window.location.reload();}catch(err){setError(err.message||'Unable to record repair.');}};
  const doReplacement=async e=>{e.preventDefault();setError('');const serialError=validateSerial(replacement.replacementSerial);if(serialError||!replacement.requestId||replacement.reason.trim().length<5){setError(serialError||'Request ID and a replacement reason of at least 5 characters are required.');return;}try{await post('/replacements',{...replacement,requestId:Number(replacement.requestId),replacementSerial:replacement.replacementSerial.trim().toUpperCase(),reason:replacement.reason.trim()});window.location.reload();}catch(err){setError(err.message||'Unable to record replacement.');}};
  const showRepair=role==='TECHNICIAN';
  const showReplacement=role==='ADMIN'||role==='TECHNICIAN';
  return <>
    <PageHeader kicker="After-sales execution" title={role==='TECHNICIAN'?'Repair workspace':'Repairs & replacements'} text={role==='TECHNICIAN'?'Record diagnosis, action, parts and completion details. Recording the work completes the linked service request.':'Review repairs and replacements across the service network.'}/>
    <div className="stats-grid"><StatCard label="Repairs logged" value={repairs.length} sub="Recorded work orders" icon="tool"/><StatCard label="Replacements" value={replacements.length} sub="Processed units" icon="box" tone="cyan"/><StatCard label="Service actions" value={repairs.length+replacements.length} sub="Operational history" icon="history" tone="green"/><StatCard label="Data source" value="Live" sub="MySQL" icon="check" tone="indigo"/></div>
    {requestedId&&<div className="claim-context-banner"><Icon name="ticket" size={17}/><div><strong>Working on request #{requestedId}</strong><span>{requestedMode==='replacement'?'Record the approved replacement for this case.':'Record the repair details for this case.'}</span></div></div>}
    <div className="content-grid">
      {showRepair&&<Card title="Record repair" subtitle="A repair record is required before a case can be resolved"><form onSubmit={save} className="form-grid"><Field label="Request ID" value={form.requestId} onChange={e=>setForm({...form,requestId:e.target.value})} type="number" min="1" required placeholder="104"/><Field label="Diagnosis" value={form.diagnosis} onChange={e=>setForm({...form,diagnosis:e.target.value})} required maxLength="1500" placeholder="What was found?"/><Field label="Action" value={form.action} onChange={e=>setForm({...form,action:e.target.value})} required maxLength="2000" placeholder="What was repaired?"/><Field label="Parts used" value={form.parts} onChange={e=>setForm({...form,parts:e.target.value})} maxLength="1000" placeholder="Main board, connector, etc."/><Field label="Labour cost" value={form.laborCost} onChange={e=>setForm({...form,laborCost:e.target.value})} type="number" min="0" step="0.01"/><button type="submit" className="btn btn-primary">Record repair & resolve case <Icon name="check"/></button></form>{error&&<div className="form-error-modern">{error}</div>}</Card>}
      {showReplacement&&<Card title="Record replacement" subtitle="Use only when the warranty decision engine routes the case to replacement"><form onSubmit={doReplacement} className="form-grid"><Field label="Request ID" value={replacement.requestId} onChange={e=>setReplacement({...replacement,requestId:e.target.value})} type="number" min="1" required/><Field label="Replacement serial" value={replacement.replacementSerial} onChange={e=>setReplacement({...replacement,replacementSerial:e.target.value})} required maxLength="60" placeholder="SN-20024"/><Field label="Reason" value={replacement.reason} onChange={e=>setReplacement({...replacement,reason:e.target.value})} required maxLength="1000" placeholder="Repeated covered failures"/>{error&&<div className="form-error-modern">{error}</div>}<button type="submit" className="btn btn-primary">Record replacement & resolve case <Icon name="box"/></button></form></Card>}
    </div>
    <Card title="Repair history" subtitle={`${repairs.length} recorded repairs`} className={role==='ADMIN'?'span-2':''}><Table rows={repairs} columns={[{key:'id',label:'ID'},{key:'requestId',label:'CASE'},{key:'diagnosis',label:'DIAGNOSIS'},{key:'action',label:'ACTION'},{key:'parts',label:'PARTS'},{key:'laborCost',label:'LABOUR'}]}/></Card>
    {role==='ADMIN'&&<Card title="Replacement history" subtitle={`${replacements.length} processed replacements`}><Table rows={replacements} columns={[{key:'id',label:'ID'},{key:'requestId',label:'CASE'},{key:'originalSerial',label:'ORIGINAL'},{key:'replacementSerial',label:'REPLACEMENT'},{key:'reason',label:'REASON'}]}/></Card>}
  </>;
}

function History(){const [serial,setSerial]=useState('');const [data,setData]=useState(null);const [error,setError]=useState('');const search=async e=>{e.preventDefault();setError('');try{setData(await get(`/history/${encodeURIComponent(serial)}`));}catch(err){setError(err.message)}};return <><PageHeader kicker="Traceability" title="Product history" text="Follow one serial number from purchase to service, repair and replacement."/><Card title="Search product lifecycle" subtitle="Use the exact registered serial"><form onSubmit={search} className="search-form"><div className="search-box large"><Icon name="search"/><input value={serial} onChange={e=>setSerial(e.target.value)} placeholder="Enter serial number" required/></div><button className="btn btn-primary">Search history <Icon name="arrow"/></button></form></Card>{error&&<ErrorState message={error}/>} {data&&<div className="history-grid"><Card title="Service requests"><Table rows={data.requests||[]} columns={[{key:'id',label:'CASE',render:r=><strong>#{r.id}</strong>},{key:'issue',label:'ISSUE'},{key:'status',label:'STATUS',render:r=><Badge value={r.status}/>},{key:'createdAt',label:'CREATED',render:r=>String(r.createdAt||'').replace('T',' ').slice(0,16)}]}/></Card><Card title="Repairs"><Table rows={data.repairs||[]} columns={[{key:'requestId',label:'CASE'},{key:'diagnosis',label:'DIAGNOSIS'},{key:'action',label:'ACTION'},{key:'parts',label:'PARTS'}]}/></Card><Card title="Replacements"><Table rows={data.replacements||[]} columns={[{key:'requestId',label:'CASE'},{key:'originalSerial',label:'ORIGINAL'},{key:'replacementSerial',label:'REPLACEMENT'},{key:'reason',label:'REASON'}]}/></Card></div>}</>}

function Analytics(){
  const state=useFetch(()=>Promise.all([get('/analytics'),get('/escalations')]),[]);
  if(state.loading)return <Loading/>;
  if(state.error)return <ErrorState message={state.error.message}/>;

  const [a,e]=state.data;
  const entries=Object.entries(a.byStatus||{});
  const max=Math.max(1,...entries.map(([,v])=>Number(v)));
  const modelEntries=Object.entries(a.requestsByModel||{});

  return <>
    <PageHeader
      kicker="Operations intelligence"
      title="Service analytics"
      text="Understand demand, turnaround, model concentration and SLA pressure."
    />

    <div className="stats-grid">
      <StatCard label="Total requests" value={a.totalRequests} sub="All-time service cases" icon="ticket"/>
      <StatCard label="Replacement rate" value={`${a.replacementRatePct}%`} sub="Requests ending in replacement" icon="box" tone="cyan"/>
      <StatCard label="Avg turnaround" value={`${a.avgTurnaroundHours}h`} sub="Resolved cases" icon="history" tone="green"/>
      <StatCard label="Escalated" value={a.escalated} sub="Past SLA" icon="shield" tone="red"/>
    </div>

    <div className="dashboard-grid">
      <Card title="Request mix" subtitle="Status distribution" className="span-2">
        <div className="bar-chart">
          {entries.map(([name,value])=>(
            <div className="bar-row" key={name}>
              <div className="bar-label">
                <span>{name.replaceAll('_',' ')}</span>
                <strong>{value}</strong>
              </div>
              <div className="bar-track">
                <i style={{width:`${(Number(value)/max)*100}%`}} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Top models" subtitle="Request concentration">
        <div className="model-list">
          {modelEntries.length === 0 ? (
            <EmptyState title="No model data" text="Service request analytics will appear here once cases are recorded." />
          ) : (
            modelEntries.map(([name,value])=>(
              <div className="model-row" key={name}>
                <div className="model-row-head">
                  <strong>{name}</strong>
                  <span>{value} cases</span>
                </div>
                <div className="progress">
                  <i style={{width:`${Math.min(100,Number(value)*12)}%`}} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>

    <Card title="Escalation watch" subtitle={`${e.length} cases beyond the SLA window`}>
      <Table
        rows={e}
        columns={[
          {key:'id',label:'CASE',render:r=><strong>#{r.id}</strong>},
          {key:'serialNumber',label:'SERIAL'},
          {key:'issue',label:'ISSUE'},
          {key:'status',label:'STATUS',render:r=><Badge value={r.status}/>},
          {key:'assignedTo',label:'ASSIGNED'}
        ]}
      />
    </Card>
  </>;
}

function Audit(){const state=useFetch(()=>get('/audit'),[]);const [q,setQ]=useState('');if(state.loading)return <Loading/>;if(state.error)return <ErrorState message={state.error.message}/>;const rows=state.data.filter(r=>`${r.entity} ${r.action} ${r.detail}`.toLowerCase().includes(q.toLowerCase()));return <><PageHeader kicker="Governance" title="Audit trail" text="Traceable operational history for customer, warranty and service changes."/><Card title="System audit log" subtitle={`${rows.length} matching events`}><Toolbar><div className="search-box"><Icon name="search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search action, entity or detail"/></div></Toolbar><Table rows={rows} columns={[{key:'at',label:'TIME',render:r=>String(r.at||'').replace('T',' ').slice(0,19)},{key:'entity',label:'ENTITY'},{key:'entityId',label:'ID'},{key:'action',label:'ACTION',render:r=><Badge value={r.action}/>},{key:'detail',label:'DETAIL'}]}/></Card></>}

createRoot(document.getElementById('root')).render(<AppErrorBoundary><App/></AppErrorBoundary>);
