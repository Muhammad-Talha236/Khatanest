// components/Layout.js — Updated with activity bell, profile, new nav items
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { activityAPI } from '../services/api';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '◈',  label: 'Dashboard' },
  { path: '/expenses',  icon: '🧾', label: 'Expenses' },
  { path: '/payments',  icon: '💵', label: 'Payments' },
  { path: '/members',   icon: '👥', label: 'Members',  adminOnly: true },
  { path: '/balances',  icon: '⚖️', label: 'Balances' },
  { path: '/history',   icon: '📜', label: 'History' },
  { path: '/reports',   icon: '📊', label: 'Reports' },
  { path: '/activity',  icon: '📡', label: 'Activity' },
  { path: '/archives',  icon: '📦', label: 'Archives', adminOnly: true },
  { path: '/settings',  icon: '⚙️', label: 'Settings', adminOnly: true },
];

const Avatar = ({ name, size = 36, color = '#2ECC9A' }) => {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: `${color}22`, border: `2px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color, flexShrink: 0,
      fontFamily: "'Syne', sans-serif",
    }}>{initials}</div>
  );
};

export { Avatar };

const Layout = ({ children }) => {
  const [collapsed, setCollapsed]         = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile]           = useState(window.innerWidth <= 768);
  const [unseenCount, setUnseenCount]     = useState(0);
  const { user, logout, isAdmin }         = useAuth();
  const { isDark, toggleTheme }           = useTheme();
  const location  = useLocation();
  const navigate  = useNavigate();

  // Fetch unseen activity count
  const fetchUnseen = useCallback(async () => {
    try {
      const res = await activityAPI.getUnseenCount();
      setUnseenCount(res.data.count || 0);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchUnseen();
    const interval = setInterval(fetchUnseen, 60000); // poll every minute
    return () => clearInterval(interval);
  }, [fetchUnseen]);

  // Mark seen when visiting activity page
  useEffect(() => {
    if (location.pathname === '/activity' && unseenCount > 0) {
      activityAPI.markSeen().then(() => setUnseenCount(0)).catch(() => {});
    }
  }, [location.pathname, unseenCount]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) { setCollapsed(false); setMobileMenuOpen(false); }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [location]);

  const handleLogout = () => { logout(); toast.success('Logged out'); navigate('/login'); };

  const currentPage = NAV_ITEMS.find(n => location.pathname === n.path)?.label || 'KhataNest';
  const visibleNav  = NAV_ITEMS.filter(n => !n.adminOnly || isAdmin);

  const NavLink = ({ item }) => {
    const active = location.pathname === item.path;
    const showBadge = item.path === '/activity' && unseenCount > 0;
    return (
      <Link to={item.path} style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: collapsed ? '11px 16px' : '11px 14px',
          borderRadius: 10, marginBottom: 3, cursor: 'pointer',
          background: active ? 'var(--accent-soft)' : 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-muted)',
          borderLeft: `3px solid ${active ? 'var(--accent)' : 'transparent'}`,
          transition: 'all .15s', fontWeight: active ? 700 : 500,
          fontSize: 14, whiteSpace: 'nowrap', position: 'relative',
        }}>
          <span style={{ fontSize: 17, flexShrink: 0 }}>{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
          {showBadge && (
            <span style={{
              position: 'absolute', top: 6, left: collapsed ? 24 : undefined, right: collapsed ? undefined : 8,
              minWidth: 18, height: 18, borderRadius: 99, background: 'var(--accent)',
              color: '#000', fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
            }}>{unseenCount > 99 ? '99+' : unseenCount}</span>
          )}
        </div>
      </Link>
    );
  };

  if (isMobile && mobileMenuOpen) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <header style={{ height: 60, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', position: 'sticky', top: 0, zIndex: 50 }}>
          <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', padding: '8px' }}>✕</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#000' }}>K</div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, color: 'var(--text)' }}>KhataNest</span>
          </div>
          <div style={{ width: 40 }} />
        </header>
        <nav style={{ padding: '16px' }}>
          {visibleNav.map(item => {
            const active = location.pathname === item.path;
            const showBadge = item.path === '/activity' && unseenCount > 0;
            return (
              <Link key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, marginBottom: 4, background: active ? 'var(--accent-soft)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-muted)', fontWeight: active ? 700 : 500, fontSize: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {showBadge && <span style={{ minWidth: 20, height: 20, borderRadius: 99, background: 'var(--accent)', color: '#000', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{unseenCount}</span>}
                </div>
              </Link>
            );
          })}
          <Link to="/profile" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, marginBottom: 4, color: 'var(--text-muted)', fontSize: 16 }}>
              <span style={{ fontSize: 20 }}>👤</span><span>Profile</span>
            </div>
          </Link>
        </nav>
        {user && (
          <div style={{ position: 'fixed', bottom: 20, left: 16, right: 16 }}>
            <div style={{ padding: '16px', borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={user.name} size={40} color={user.avatarColor || '#2ECC9A'} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{user.role}</div>
                </div>
              </div>
              <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--red-soft)', border: '1px solid rgba(255,92,106,0.3)', color: 'var(--red)', fontSize: 13, fontWeight: 700 }}>Logout</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside style={{ width: collapsed ? 64 : 220, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '0 0 24px', transition: 'width .3s cubic-bezier(.4,0,.2,1)', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', zIndex: 50 }}>
          {/* Logo */}
          <div style={{ padding: collapsed ? '20px 16px' : '20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
            {collapsed ? (
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#000' }}>K</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#000', flexShrink: 0 }}>K</div>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 17, color: 'var(--text)', letterSpacing: -0.5 }}>KhataNest</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Hostel Finance</div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
            {visibleNav.map(item => <NavLink key={item.path} item={item} />)}
            {/* Profile link */}
            <NavLink item={{ path: '/profile', icon: '👤', label: 'Profile' }} />
          </nav>

          {/* User card */}
          {!collapsed && user && (
            <div style={{ margin: '0 8px', padding: '12px', borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent-glow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={user.name} size={32} color={user.avatarColor || '#2ECC9A'} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{user.role}</div>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ height: 60, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 16px' : '0 24px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            {isMobile ? (
              <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', padding: '4px' }}>☰</button>
            ) : (
              <button onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: '6px', borderRadius: 8 }}>☰</button>
            )}
            <div style={{ fontSize: isMobile ? 13 : 14, color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text)', fontWeight: 700 }}>{currentPage}</span>
              {!isMobile && <span> · KhataNest</span>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
            {/* Balance badge */}
            {user && !isMobile && (
              <div style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: user.balance >= 0 ? 'var(--accent-soft)' : 'var(--red-soft)', color: user.balance >= 0 ? 'var(--accent)' : 'var(--red)', border: `1px solid ${user.balance >= 0 ? 'var(--accent-glow)' : 'rgba(255,92,106,0.3)'}` }}>
                {user.balance >= 0 ? '+' : ''}Rs. {user.balance?.toLocaleString() || 0}
              </div>
            )}

            {/* Activity bell with badge */}
            <Link to="/activity" style={{ textDecoration: 'none', position: 'relative' }}>
              <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-alt)', cursor: 'pointer', fontSize: 17, color: 'var(--text-muted)' }}>
                🔔
                {unseenCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 99, background: 'var(--accent)', color: '#000', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                    {unseenCount > 99 ? '99+' : unseenCount}
                  </span>
                )}
              </button>
            </Link>

            {/* Theme toggle */}
            <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '6px 10px' : '6px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--text-muted)', fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: 'pointer' }}>
              <span style={{ fontSize: isMobile ? 14 : 15 }}>{isDark ? '☀️' : '🌙'}</span>
              {!isMobile && <span>{isDark ? 'Light' : 'Dark'}</span>}
            </button>

            {/* Profile link (desktop) */}
            {!isMobile && (
              <Link to="/profile" style={{ textDecoration: 'none' }}>
                <Avatar name={user?.name} size={32} color={user?.avatarColor || '#2ECC9A'} />
              </Link>
            )}

            {/* Logout */}
            {!isMobile && (
              <button onClick={handleLogout} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,92,106,0.3)', background: 'var(--red-soft)', color: 'var(--red)', fontSize: 12, fontWeight: 700 }}>Logout</button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: isMobile ? '16px' : '24px', overflowY: 'auto', maxWidth: '100%' }} className="page-enter">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;