import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Login ({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState('operator')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [captchaQuestion, setCaptchaQuestion] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState(0)
  const [captchaInput, setCaptchaInput] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState('')

  const [failedAttempts, setFailedAttempts] = useState(() =>
    parseInt(localStorage.getItem('crt_failed') || '0')
  )
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    const val = localStorage.getItem('crt_lockout')
    return val ? new Date(val) : null
  })

  useEffect(() => {
    if (!lockoutUntil) return
    const interval = setInterval(() => {
      const remaining = lockoutUntil - new Date()

      if (remaining <= 0) {
        setLockoutUntil(null)
        localStorage.removeItem('crt_lockout')
        setCountdown('')
        setLoginError('')
        clearInterval(interval)
      } else {
        const totalSecs = Math.ceil(remaining / 1000)
        setCountdown(`${totalSecs}`)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockoutUntil])

  useEffect(() => {
    generateCaptcha()
  }, [])

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 9) + 1
    const b = Math.floor(Math.random() * 9) + 1
    const ops = ['+', '-', '×']
    const op = ops[Math.floor(Math.random() * ops.length)]
    let answer
    if (op === '+') answer = a + b
    else if (op === '-') answer = a - b
    else answer = a * b
    setCaptchaQuestion(`${a} ${op} ${b} = ?`)
    setCaptchaAnswer(answer)
    setCaptchaInput('')
  }

  const handleFailedAttempt = () => {
    const newAttempts = failedAttempts + 1
    setFailedAttempts(newAttempts)
    localStorage.setItem('crt_failed', newAttempts)
    if (newAttempts >= 5) {
      const lockout = new Date(Date.now() + 2 * 60 * 1000)
      setLockoutUntil(lockout)
      localStorage.setItem('crt_lockout', lockout.toISOString())
      setFailedAttempts(0)
      localStorage.setItem('crt_failed', '0')
      setLoginError('Too many failed attempts. Locked for 2 minutes.')
    } else {
      setLoginError(`Wrong password. ${5 - newAttempts} attempt(s) remaining.`)
    }
    generateCaptcha()
  }

  const handleLogin = async () => {
    setLoginError('')

    // Lockout check
    if (lockoutUntil && new Date() < lockoutUntil) {
      const mins = Math.ceil((lockoutUntil - new Date()) / 60000)
      setLoginError(`Too many attempts. Try again in ${mins} minute(s).`)
      return
    }

    // Captcha check
    if (parseInt(captchaInput) !== captchaAnswer) {
      setLoginError('Wrong answer. Please solve the math problem.')
      generateCaptcha()
      return
    }

    const endpoint =
      selectedRole === 'admin'
        ? '/admin-login'
        : selectedRole === 'resolver'
        ? '/resolver-login'
        : '/operator-login'

    try {
      await axios.post(`${API}${endpoint}`, { password: loginPassword })
      // Clear lockout on success
      setFailedAttempts(0)
      setLockoutUntil(null)
      localStorage.removeItem('crt_failed')
      localStorage.removeItem('crt_lockout')
      sessionStorage.setItem('crt_role', selectedRole)
      onLogin(selectedRole)
    } catch (err) {
      if (!err.response) {
        setLoginError('⚠️ Cannot connect to server. Please try again.')
        return
      }
      handleFailedAttempt()
    }
  }

  const isLocked = lockoutUntil && new Date() < lockoutUntil

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: 'url(/src/assets/Power_grid.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.55)',
          zIndex: 0
        }}
      />
      {/* Top Header Bar */}
      <div
        style={{
          background: '#1a3a6b',
          width: '100%',
          borderBottom: '4px solid #f0a500',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          position: 'fixed',
          top: 0,
          zIndex: 2
        }}
      >
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>
            Control Room Ticketing System
          </div>
          <div style={{ color: '#c8d8f0', fontSize: 11 }}>
            Integrated Operations Management Portal
          </div>
        </div>
      </div>

      {/* Login Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #b8cce4',
          borderTop: '5px solid #1a3a6b',
          borderRadius: 4,
          padding: '36px 40px',
          width: 400,
          marginTop: 80,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* Card Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 28,
            paddingBottom: 20,
            borderBottom: '1px solid #e0e0e0'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 20px',
              borderRadius: 4,
              marginBottom: 14
            }}
          >
            <img
              src='/src/assets/GridIndiaLogo.png'
              alt='logo'
              style={{ height: 32, objectFit: 'contain' }}
            />
            <span
              style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: '1px'
              }}
            ></span>
          </div>
          <h2
            style={{
              color: '#1a3a6b',
              fontSize: 16,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: 0
            }}
          >
            Authorized Login
          </h2>
          <p
            style={{
              fontSize: 12,
              color: '#666',
              marginTop: 4,
              marginBottom: 0
            }}
          >
            Select your role and enter credentials
          </p>
        </div>

        {/* Role */}
        <label style={labelStyle}>Role</label>

        <input
          className='input-field'
          placeholder='Enter role'
          value={selectedRole}
          disabled={isLocked}
          onChange={e => {
            setSelectedRole(e.target.value.toLowerCase().trim())
            setLoginPassword('')
            setLoginError('')
          }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ marginBottom: 16, borderColor: '#b8cce4' }}
        />

        {/* Password */}
        <label style={labelStyle}>Password</label>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type={showPassword ? 'text' : 'password'}
            className='input-field'
            placeholder='Enter password'
            value={loginPassword}
            disabled={isLocked}
            onChange={e => setLoginPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ borderColor: '#b8cce4', paddingRight: 40 }}
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: '#1a3a6b'
            }}
          >
            {showPassword ? (
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='#d5d8dc'
                strokeWidth='2'
              >
                <path d='M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94' />
                <path d='M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19' />
                <line x1='1' y1='1' x2='23' y2='23' />
              </svg>
            ) : (
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='#d5d8dc'
                strokeWidth='2'
              >
                <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                <circle cx='12' cy='12' r='3' />
              </svg>
            )}
          </button>
        </div>

        {/* Captcha */}
        <label style={labelStyle}>Security Check</label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16
          }}
        >
          <div
            style={{
              background: '#e8eef6',
              border: '2px solid #1a3a6b',
              padding: '10px 20px',
              borderRadius: 4,
              fontSize: 18,
              fontWeight: 700,
              color: '#1a3a6b',
              letterSpacing: '4px',
              minWidth: 120,
              textAlign: 'center',
              userSelect: 'none'
            }}
          >
            {captchaQuestion}
          </div>
          <button
            onClick={generateCaptcha}
            style={{
              background: 'transparent',
              border: '1px solid #1a3a6b',
              color: '#1a3a6b',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: 16,
              borderRadius: 4
            }}
            title='Refresh'
          >
            🔄
          </button>
          <input
            className='input-field'
            placeholder='Answer'
            value={captchaInput}
            disabled={isLocked}
            onChange={e => setCaptchaInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ borderColor: '#b8cce4', width: 90 }}
          />
        </div>

        {/* Error */}
        {loginError && (
          <div
            style={{
              color: '#b91c1c',
              fontSize: 12,
              marginBottom: 12,
              background: '#fef2f2',
              padding: '10px 12px',
              border: '1px solid #fca5a5'
            }}
          >
            <div>{loginError}</div>
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={isLocked}
          style={{
            width: '100%',
            marginTop: 4,
            background: isLocked ? '#999' : '#1a3a6b',
            color: '#fff',
            border: 'none',
            padding: '11px',
            fontWeight: 700,
            fontSize: 14,
            cursor: isLocked ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderRadius: 2
          }}
        >
          {isLocked ? `Locked — ${countdown} sec remaining` : 'Login'}
        </button>
      </div>

      {/* <p style={{ marginTop: 16, fontSize: 11, color: '#666' }}> */}
      {/* © Control Room Ticketing System — Authorized Access Only */}
      {/* </p> */}
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#1a3a6b',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
}
