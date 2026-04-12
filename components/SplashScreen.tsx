'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('splash-shown')) return
    setVisible(true)

    const fadeTimer = setTimeout(() => {
      setFading(true)
      const unmountTimer = setTimeout(() => {
        setVisible(false)
        sessionStorage.setItem('splash-shown', '1')
      }, 600)
      return () => clearTimeout(unmountTimer)
    }, 1400)

    return () => clearTimeout(fadeTimer)
  }, [])

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .splash-progress {
          transform-origin: left;
          animation: progress 1.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at 50% 38%, #22c55e 0%, #16a34a 50%, #14532d 100%)',
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.6s ease',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        {/* Icon with ring */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <div style={{
            position: 'absolute',
            inset: -10,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.18)',
          }} />
          <img
            src="/icon.svg"
            alt="Splitwise"
            style={{
              width: 88,
              height: 88,
              borderRadius: 20,
              display: 'block',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}
          />
        </div>

        {/* Name */}
        <h1 style={{
          color: 'white',
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '-0.4px',
          margin: '0 0 6px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          Splitwise
        </h1>

        {/* Tagline */}
        <p style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: 14,
          fontWeight: 400,
          margin: 0,
          letterSpacing: '0.15px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          Split expenses with friends
        </p>

        {/* Progress bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'rgba(255,255,255,0.12)',
        }}>
          <div
            className="splash-progress"
            style={{
              height: '100%',
              background: 'rgba(255,255,255,0.55)',
            }}
          />
        </div>
      </div>
    </>
  )
}
