'use client'

import { useEffect, useState } from 'react'

const PARTICLES = [
  { size: 5,  top: '12%', left: '8%',  delay: '0s',    dur: '9s'  },
  { size: 7,  top: '22%', left: '88%', delay: '1.2s',  dur: '11s' },
  { size: 4,  top: '68%', left: '12%', delay: '2.1s',  dur: '8s'  },
  { size: 6,  top: '78%', left: '78%', delay: '0.6s',  dur: '10s' },
  { size: 3,  top: '42%', left: '94%', delay: '1.8s',  dur: '12s' },
  { size: 4,  top: '58%', left: '4%',  delay: '3.1s',  dur: '9s'  },
  { size: 8,  top: '8%',  left: '52%', delay: '0.9s',  dur: '13s' },
  { size: 3,  top: '88%', left: '38%', delay: '2.6s',  dur: '10s' },
  { size: 5,  top: '35%', left: '22%', delay: '1.5s',  dur: '8s'  },
  { size: 4,  top: '50%', left: '68%', delay: '0.3s',  dur: '11s' },
]

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('splash-shown')) {
      setVisible(false)
      return
    }

    const fadeTimer = setTimeout(() => {
      setFading(true)
      const unmountTimer = setTimeout(() => {
        setVisible(false)
        sessionStorage.setItem('splash-shown', '1')
      }, 600)
      return () => clearTimeout(unmountTimer)
    }, 1800)

    return () => clearTimeout(fadeTimer)
  }, [])

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes splashBg {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes splashIcon {
          0%   { opacity: 0; transform: scale(0.6); }
          65%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashTitle {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashTag {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 0.6; transform: translateY(0); }
        }
        @keyframes ringPulse {
          0%   { transform: scale(1);   opacity: 0.55; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes ringBreath {
          0%, 100% { transform: scale(1);    opacity: 0.3; }
          50%       { transform: scale(1.07); opacity: 0.5; }
        }
        @keyframes float {
          0%,100% { transform: translate(0,    0px); }
          25%      { transform: translate(5px,  -14px); }
          50%      { transform: translate(-4px, -7px); }
          75%      { transform: translate(7px,  -18px); }
        }
        @keyframes progressFill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes progressShimmer {
          0%   { left: -80%; }
          100% { left: 130%; }
        }

        .sp-icon  { animation: splashIcon  0.65s cubic-bezier(0.34,1.56,0.64,1) 0.1s  both; }
        .sp-title { animation: splashTitle 0.55s cubic-bezier(0.22,1,0.36,1)     0.5s  both; }
        .sp-tag   { animation: splashTag   0.55s cubic-bezier(0.22,1,0.36,1)     0.75s both; }
        .sp-ring-pulse  {
          position: absolute; inset: -18px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.45);
          animation: ringPulse 2.2s ease-out 0.6s infinite;
          pointer-events: none;
        }
        .sp-ring-breath {
          position: absolute; inset: -8px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.28);
          animation: ringBreath 3s ease-in-out 0.5s infinite;
          pointer-events: none;
        }
        .sp-progress-fill {
          transform-origin: left;
          animation: progressFill 1.8s cubic-bezier(0.4,0,0.15,1) 0.2s both;
        }
        .sp-progress-shimmer {
          position: absolute; top: 0; width: 70%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent);
          animation: progressShimmer 1.3s ease-in-out 0.5s infinite;
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a4a20 0%, #16a34a 40%, #22c55e 70%, #14532d 100%)',
        backgroundSize: '300% 300%',
        animation: 'splashBg 7s ease infinite',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.6s ease',
        userSelect: 'none', WebkitUserSelect: 'none',
        overflow: 'hidden',
      }}>

        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: p.size, height: p.size, borderRadius: '50%',
            background: 'white', opacity: 0.12,
            top: p.top, left: p.left,
            animation: `float ${p.dur} ease-in-out ${p.delay} infinite`,
          }} />
        ))}

        {/* Large ambient blobs */}
        <div style={{
          position: 'absolute', width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          top: '-80px', right: '-60px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
          bottom: '-60px', left: '-40px', pointerEvents: 'none',
        }} />

        {/* Icon */}
        <div className="sp-icon" style={{ position: 'relative', marginBottom: 30 }}>
          <div className="sp-ring-pulse" />
          <div className="sp-ring-breath" />
          <img
            src="/icon.svg"
            alt="Splitwise"
            style={{
              width: 88, height: 88, borderRadius: 22, display: 'block',
              boxShadow: '0 16px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.12)',
            }}
          />
        </div>

        {/* Title */}
        <h1 className="sp-title" style={{
          color: 'white', fontSize: 32, fontWeight: 700,
          letterSpacing: '-0.5px', margin: '0 0 8px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
          textShadow: '0 2px 16px rgba(0,0,0,0.2)',
        }}>
          Splitwise
        </h1>

        {/* Tagline */}
        <p className="sp-tag" style={{
          color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 400,
          margin: 0, letterSpacing: '0.2px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
        }}>
          Split expenses with friends
        </p>

        {/* Progress bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
        }}>
          <div className="sp-progress-fill" style={{
            height: '100%', position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.85))',
          }}>
            <div className="sp-progress-shimmer" />
          </div>
        </div>
      </div>
    </>
  )
}
