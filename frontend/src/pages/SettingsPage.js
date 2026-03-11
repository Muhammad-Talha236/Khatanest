// pages/SettingsPage.js
import React, { useState, useEffect } from 'react';
import { groupAPI } from '../services/api';
import Spinner from '../components/Spinner';
import toast from 'react-hot-toast';

const CATEGORIES = ['grocery', 'electricity', 'gas', 'internet', 'water', 'rent', 'other'];
const CAT_COLORS = { grocery: '#2ECC9A', electricity: '#FFB547', gas: '#FF5C6A', internet: '#5B8DEF', water: '#34D399', rent: '#E879F9', other: '#9CA3AF' };

const Section = ({ title, subtitle, children }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: 0 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>{subtitle}</p>}
    </div>
    {children}
  </div>
);

const SettingsPage = () => {
  const [group, setGroup]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingBudgets, setSavingBudgets]   = useState(false);
  const [savingName, setSavingName]         = useState(false);

  const [groupName, setGroupName] = useState('');
  const [settings, setSettings]   = useState({
    descriptionClearDays  : 21,
    paymentGraceDays      : 7,
    allowMemberToSeeOthers: false,
    allowCoAdminExpenses  : true,
  });
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    groupAPI.getGroup().then(res => {
      const g = res.data.group;
      setGroup(g);
      setGroupName(g.name);
      if (g.settings) setSettings(s => ({ ...s, ...g.settings }));
      if (g.budgets)  setBudgets(g.budgets);
    }).catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveName = async () => {
    if (!groupName.trim()) return toast.error('Group name required');
    setSavingName(true);
    try {
      await groupAPI.updateGroup({ name: groupName });
      toast.success('Group name updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingName(false); }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await groupAPI.updateSettings({ settings });
      toast.success('Settings saved!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingSettings(false); }
  };

  const addBudget = (category) => {
    if (budgets.find(b => b.category === category)) return toast.error('Budget for this category already exists');
    setBudgets(prev => [...prev, { category, limit: 5000, alertAt: 80 }]);
  };

  const removeBudget = (category) => setBudgets(prev => prev.filter(b => b.category !== category));

  const updateBudget = (category, field, value) => {
    setBudgets(prev => prev.map(b => b.category === category ? { ...b, [field]: parseFloat(value) || 0 } : b));
  };

  const handleSaveBudgets = async () => {
    setSavingBudgets(true);
    try {
      await groupAPI.updateBudgets({ budgets });
      toast.success('Budgets saved!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingBudgets(false); }
  };

  const Toggle = ({ label, desc, checked, onChange }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}
      </div>
      <button onClick={() => onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 99, border: 'none', flexShrink: 0,
        background: checked ? 'var(--accent)' : 'var(--border)',
        cursor: 'pointer', position: 'relative', transition: 'background .2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );

  if (loading) return <Spinner message="Loading settings..." />;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, color: 'var(--text)', margin: 0 }}>Group Settings</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Configure your group preferences and budget limits</p>
      </div>

      {/* Group Name */}
      <Section title="Group Details">
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name" style={{ flex: 1 }} />
          <button onClick={handleSaveName} disabled={savingName} style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
            color: '#000', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {savingName ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Section>

      {/* Group Settings */}
      <Section title="Preferences" subtitle="Control how the group behaves">
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Description Clear Days
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="number" value={settings.descriptionClearDays} min={7} max={90}
              onChange={e => setSettings(s => ({ ...s, descriptionClearDays: parseInt(e.target.value) || 21 }))}
              style={{ width: 100 }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>days after which expense descriptions are auto-cleared</span>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Payment Grace Period
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="number" value={settings.paymentGraceDays} min={1} max={30}
              onChange={e => setSettings(s => ({ ...s, paymentGraceDays: parseInt(e.target.value) || 7 }))}
              style={{ width: 100 }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>days before overdue flag appears</span>
          </div>
        </div>
        <Toggle label="Allow members to see each other's balances"
          desc="Members can view all group balances, not just their own"
          checked={settings.allowMemberToSeeOthers}
          onChange={v => setSettings(s => ({ ...s, allowMemberToSeeOthers: v }))} />
        <Toggle label="Allow co-admins to add expenses"
          desc="Co-admins can add and delete expenses (not just view)"
          checked={settings.allowCoAdminExpenses}
          onChange={v => setSettings(s => ({ ...s, allowCoAdminExpenses: v }))} />

        <button onClick={handleSaveSettings} disabled={savingSettings} style={{
          marginTop: 20, padding: '10px 24px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #2ECC9A, #1A7A5C)',
          color: '#000', fontWeight: 800, cursor: 'pointer',
          opacity: savingSettings ? 0.7 : 1,
        }}>
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>
      </Section>

      {/* Budget Limits */}
      <Section title="Category Budgets" subtitle="Set monthly spending limits per category. You'll get an alert when approaching the limit.">
        {budgets.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {budgets.map((b) => (
              <div key={b.category} style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                background: 'var(--surface-alt)', borderRadius: 10, padding: '12px 14px',
                border: `1px solid ${CAT_COLORS[b.category]}44`,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: CAT_COLORS[b.category],
                }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize', minWidth: 80 }}>{b.category}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Limit: Rs.</span>
                  <input type="number" value={b.limit} min={100}
                    onChange={e => updateBudget(b.category, 'limit', e.target.value)}
                    style={{ width: 90, padding: '6px 10px', fontSize: 13 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Alert at</span>
                  <input type="number" value={b.alertAt} min={50} max={100}
                    onChange={e => updateBudget(b.category, 'alertAt', e.target.value)}
                    style={{ width: 60, padding: '6px 10px', fontSize: 13 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                </div>
                <button onClick={() => removeBudget(b.category)} style={{
                  background: 'var(--red-soft)', border: '1px solid rgba(255,92,106,0.3)',
                  borderRadius: 6, padding: '4px 10px', color: 'var(--red)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {/* Add budget for category */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Add budget for category:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.filter(c => !budgets.find(b => b.category === c)).map(c => (
              <button key={c} onClick={() => addBudget(c)} style={{
                padding: '6px 14px', borderRadius: 99, border: `1px solid ${CAT_COLORS[c]}44`,
                background: `${CAT_COLORS[c]}18`, color: CAT_COLORS[c],
                fontWeight: 600, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize',
              }}>+ {c}</button>
            ))}
          </div>
        </div>

        <button onClick={handleSaveBudgets} disabled={savingBudgets} style={{
          padding: '10px 24px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #5B8DEF, #3B5FBF)',
          color: '#fff', fontWeight: 800, cursor: 'pointer',
          opacity: savingBudgets ? 0.7 : 1,
        }}>
          {savingBudgets ? 'Saving...' : 'Save Budgets'}
        </button>
      </Section>
    </div>
  );
};

export default SettingsPage;