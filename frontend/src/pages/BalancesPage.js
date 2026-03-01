// pages/BalancesPage.js - Fixed responsive balance sheet
import React, { useState, useEffect } from 'react';
import { balanceAPI } from '../services/api';
import Spinner from '../components/Spinner';
import { Avatar } from '../components/Layout';
import toast from 'react-hot-toast';

const COLORS = ['#2ECC9A', '#5B8DEF', '#FFB547', '#E879F9', '#FB923C', '#34D399'];

const BalancesPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    balanceAPI.getBalances()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load balances'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner message="Calculating balances..." />;

  const isMobile = windowWidth <= 768;
  const isSmallMobile = windowWidth <= 480;

  const maxBalance = Math.max(...(data?.members || []).map(m => Math.abs(m.balance)), 1);

  // Summary cards data
  const summaryCards = [
    { 
      label: 'Total Outstanding', 
      value: `Rs. ${data?.summary?.totalReceivable?.toLocaleString() || 0}`, 
      color: 'var(--red)',
      bgColor: 'var(--red-soft)',
      borderColor: 'rgba(255,92,106,0.3)'
    },
    { 
      label: 'Total Positive', 
      value: `Rs. ${data?.summary?.totalPayable?.toLocaleString() || 0}`, 
      color: 'var(--accent)',
      bgColor: 'var(--accent-soft)',
      borderColor: 'var(--accent-glow)'
    },
    { 
      label: 'Total Members', 
      value: data?.members?.length || 0, 
      color: 'var(--blue)',
      bgColor: 'var(--blue-soft)',
      borderColor: 'rgba(91,141,239,0.3)'
    },
    { 
      label: 'Settled Members', 
      value: data?.members?.filter(m => m.balance === 0).length || 0, 
      color: 'var(--yellow)',
      bgColor: 'var(--yellow-soft)',
      borderColor: 'rgba(255,181,71,0.3)'
    },
  ];

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <h2 style={{ 
          fontFamily: "'Syne', sans-serif", 
          fontWeight: 900, 
          fontSize: isMobile ? (isSmallMobile ? 22 : 24) : 26, 
          color: 'var(--text)', 
          margin: 0 
        }}>
          Balance Sheet
        </h2>
        <p style={{ 
          color: 'var(--text-muted)', 
          margin: '4px 0 0', 
          fontSize: isMobile ? 12 : 13 
        }}>
          Live view of who owes what
        </p>
      </div>

      {/* Summary Cards - 2x2 grid on mobile */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: isMobile ? 8 : 16,
        marginBottom: isMobile ? 20 : 24
      }}>
        {summaryCards.map((card, i) => (
          <div 
            key={i} 
            style={{
              background: card.bgColor,
              border: `1px solid ${card.borderColor}`,
              borderRadius: 14,
              padding: isMobile ? '14px 12px' : '18px 20px',
            }}
          >
            <div style={{ 
              fontSize: isMobile ? 10 : 11, 
              color: 'var(--text-muted)', 
              marginBottom: 4, 
              textTransform: 'uppercase', 
              letterSpacing: 0.6, 
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {card.label}
            </div>
            <div style={{ 
              fontFamily: "'Syne', sans-serif", 
              fontWeight: 900, 
              fontSize: isMobile ? (isSmallMobile ? 16 : 18) : 22, 
              color: card.color,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content - Stack on mobile */}
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 16 : 20
      }}>
        {/* Individual Balances */}
        <div style={{ 
          background: 'var(--surface)', 
          border: '1px solid var(--border)', 
          borderRadius: 16, 
          padding: isMobile ? 16 : 24 
        }}>
          <div style={{ 
            fontWeight: 700, 
            color: 'var(--text)', 
            fontSize: isMobile ? 16 : 18, 
            marginBottom: isMobile ? 16 : 20 
          }}>
            Individual Balances
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? 16 : 20 
          }}>
            {data?.members?.map((m, i) => {
              const color = COLORS[i % COLORS.length];
              const pct = Math.min((Math.abs(m.balance) / maxBalance) * 100, 100);
              const barColor = m.balance >= 0 ? 'var(--accent)' : 'var(--red)';
              
              return (
                <div key={m._id}>
                  {/* Member info - stacked on mobile */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: isSmallMobile ? 'column' : 'row',
                    alignItems: isSmallMobile ? 'flex-start' : 'center',
                    justifyContent: 'space-between', 
                    marginBottom: 10,
                    gap: isSmallMobile ? 8 : 0
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 12,
                      width: isSmallMobile ? '100%' : 'auto'
                    }}>
                      <Avatar name={m.name} size={isMobile ? 36 : 38} color={color} />
                      <div>
                        <div style={{ 
                          fontWeight: 700, 
                          color: 'var(--text)', 
                          fontSize: isMobile ? 14 : 15 
                        }}>
                          {m.name}
                        </div>
                        <div style={{ 
                          fontSize: isMobile ? 11 : 12, 
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap'
                        }}>
                          <span style={{
                            background: m.role === 'admin' ? 'var(--accent-soft)' : 'var(--blue-soft)',
                            color: m.role === 'admin' ? 'var(--accent)' : 'var(--blue)',
                            padding: '2px 8px',
                            borderRadius: 99,
                            fontSize: isMobile ? 10 : 11,
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}>
                            {m.role}
                          </span>
                          <span style={{ color: 'var(--text-dim)' }}>
                            {m.balance > 0 ? 'Admin owes this member' : 
                             m.balance < 0 ? 'Owes admin' : 'Settled'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Balance amount - full width on small mobile */}
                    <div style={{ 
                      fontWeight: 900, 
                      fontSize: isMobile ? 16 : 18, 
                      fontFamily: "'Syne', sans-serif",
                      color: m.balance >= 0 ? 'var(--accent)' : 'var(--red)',
                      background: m.balance >= 0 ? 'var(--accent-soft)' : 'var(--red-soft)',
                      padding: isSmallMobile ? '6px 12px' : '0',
                      borderRadius: isSmallMobile ? 99 : 0,
                      width: isSmallMobile ? '100%' : 'auto',
                      textAlign: isSmallMobile ? 'center' : 'right'
                    }}>
                      {m.balance >= 0 ? '+' : ''}Rs. {m.balance?.toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div style={{ 
                    height: 7, 
                    borderRadius: 99, 
                    background: 'var(--border)', 
                    overflow: 'hidden',
                    marginTop: isSmallMobile ? 4 : 0
                  }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 99,
                      transition: 'width 1s ease',
                      width: `${pct}%`,
                      background: m.balance >= 0
                        ? 'linear-gradient(90deg, var(--accent), #1A7A5C)'
                        : 'linear-gradient(90deg, var(--red), #ff8a94)',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Settlement Plan & Guide - Side by side on tablet, stacked on mobile */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : (windowWidth <= 1024 ? '1fr 1fr' : '1fr 280px'),
          gap: isMobile ? 16 : 20
        }}>
          {/* Settlement Plan */}
          <div style={{ 
            background: 'linear-gradient(135deg, #0f1923, #0a1520)', 
            border: '1px solid rgba(91,141,239,0.25)', 
            borderRadius: 16, 
            padding: isMobile ? 18 : 20 
          }}>
            <div style={{ 
              fontWeight: 700, 
              color: 'var(--text)', 
              fontSize: isMobile ? 15 : 16, 
              marginBottom: 4 
            }}>
              💡 Settlement Plan
            </div>
            <p style={{ 
              color: 'var(--text-muted)', 
              fontSize: isMobile ? 12 : 13, 
              marginBottom: 16, 
              lineHeight: 1.5 
            }}>
              Minimum transactions to clear all balances:
            </p>
            
            {data?.settlements?.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: isMobile ? 16 : 20, 
                color: 'var(--accent)', 
                fontWeight: 700, 
                fontSize: isMobile ? 14 : 15 
              }}>
                ✅ All Settled!
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: isMobile ? 8 : 10 
              }}>
                {data?.settlements?.map((s, i) => (
                  <div key={i} style={{
                    padding: isMobile ? '10px 12px' : '12px 14px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: 4,
                      flexWrap: 'wrap',
                      gap: 4
                    }}>
                      <div style={{ fontSize: isMobile ? 12 : 13 }}>
                        <span style={{ color: 'var(--red)', fontWeight: 700 }}>{s.from}</span>
                        <span style={{ color: 'var(--text-muted)' }}> pays </span>
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{s.to}</span>
                      </div>
                    </div>
                    <div style={{ 
                      fontFamily: "'Syne', sans-serif", 
                      fontWeight: 800, 
                      color: 'var(--yellow)', 
                      fontSize: isMobile ? 16 : 18 
                    }}>
                      Rs. {s.amount?.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Balance Guide */}
          <div style={{ 
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 14, 
            padding: isMobile ? 16 : 18 
          }}>
            <div style={{ 
              fontWeight: 700, 
              color: 'var(--text)', 
              fontSize: isMobile ? 14 : 15, 
              marginBottom: isMobile ? 12 : 14 
            }}>
              Balance Guide
            </div>
            {[
              { color: 'var(--accent)', label: 'Positive (+)', desc: 'Admin owes them' },
              { color: 'var(--red)', label: 'Negative (−)', desc: 'They owe admin' },
              { color: 'var(--text-muted)', label: 'Zero (0)', desc: 'Fully settled' },
            ].map((g, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: isMobile ? 8 : 10, 
                marginBottom: isMobile ? 8 : 10,
                flexWrap: 'wrap'
              }}>
                <div style={{ 
                  width: isMobile ? 8 : 10, 
                  height: isMobile ? 8 : 10, 
                  borderRadius: '50%', 
                  background: g.color, 
                  flexShrink: 0 
                }} />
                <div style={{ 
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: isMobile ? 2 : 6
                }}>
                  <span style={{ 
                    fontSize: isMobile ? 12 : 13, 
                    fontWeight: 600, 
                    color: g.color 
                  }}>
                    {g.label}
                  </span>
                  <span style={{ 
                    fontSize: isMobile ? 11 : 12, 
                    color: 'var(--text-muted)' 
                  }}>
                    — {g.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalancesPage;