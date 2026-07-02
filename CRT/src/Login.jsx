import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Login ({ onLogin, onRegister }) {
  const [empId, setEmpId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Admin login
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [showAdminPass, setShowAdminPass] = useState(false)

  // Captcha
  const [captchaQuestion, setCaptchaQuestion] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState(0)
  const [captchaInput, setCaptchaInput] = useState('')
  //forgot password
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmpId, setForgotEmpId] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg] = useState(null)

  // Countdown
  const [countdown, setCountdown] = useState('')

  // Lockout
  const [failedAttempts, setFailedAttempts] = useState(() =>
    parseInt(localStorage.getItem('crt_failed') || '0')
  )
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    const val = localStorage.getItem('crt_lockout')
    return val ? new Date(val) : null
  })

  const isLocked = lockoutUntil && new Date() < lockoutUntil

  useEffect(() => {
    generateCaptcha()
  }, [])

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
        setCountdown(`${Math.ceil(remaining / 1000)}`)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockoutUntil])

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
      setLoginError(
        `Wrong credentials. ${5 - newAttempts} attempt(s) remaining.`
      )
    }
    generateCaptcha()
  }

  const clearLockout = () => {
    setFailedAttempts(0)
    setLockoutUntil(null)
    localStorage.removeItem('crt_failed')
    localStorage.removeItem('crt_lockout')
    localStorage.removeItem('crt_last_fail')
  }

  // ── User login (operator/resolver) ──
  const handleLogin = async () => {
    setLoginError('')

    if (isLocked) return

    if (!empId.trim()) return setLoginError('Please enter your Employee ID')
    if (!loginPassword.trim())
      return setLoginError('Please enter your password')

    if (parseInt(captchaInput) !== captchaAnswer) {
      setLoginError('Wrong answer. Please solve the math problem.')
      generateCaptcha()
      return
    }

    try {
      const res = await axios.post(`${API}/user-login`, {
        emp_id: empId.trim(),
        password: loginPassword
      })
      const user = res.data.data
      clearLockout()
      sessionStorage.setItem('crt_role', user.role)
      sessionStorage.setItem('crt_name', user.full_name)
      sessionStorage.setItem('crt_emp_id', user.emp_id)
      sessionStorage.setItem('crt_email', user.email)
      onLogin(user.role, user.full_name, user.emp_id, user.email)
    } catch (err) {
      if (!err.response) {
        setLoginError('⚠️ Cannot connect to server. Please try again.')
        return
      }
      handleFailedAttempt()
    }
  }

  //handle forgot password

  const handleForgotPassword = async () => {
    setForgotMsg(null)
    if (!forgotEmpId.trim())
      return setForgotMsg({ type: 'error', text: 'Enter your Employee ID' })
    setForgotLoading(true)
    try {
      await axios.post(`${API}/forgot-password`, { emp_id: forgotEmpId.trim() })
      setForgotMsg({
        type: 'success',
        text: 'A new password has been sent to your registered email.'
      })
      setForgotEmpId('')
    } catch (err) {
      setForgotMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed. Please try again.'
      })
    } finally {
      setForgotLoading(false)
    }
  }

  // ── Admin login ──
  const handleAdminLogin = async () => {
    setLoginError('')
    if (!adminPassword.trim())
      return setLoginError('Please enter admin password')

    try {
      await axios.post(`${API}/admin-login`, { password: adminPassword })
      clearLockout()
      sessionStorage.setItem('crt_role', 'admin')
      sessionStorage.setItem('crt_name', 'Admin')
      sessionStorage.setItem('crt_emp_id', 'ADMIN')
      sessionStorage.setItem('crt_email', '')
      onLogin('admin', 'Admin', 'ADMIN', '')
    } catch (err) {
      if (!err.response) {
        setLoginError('⚠️ Cannot connect to server.')
        return
      }
      setLoginError('Wrong admin password.')
    }
  }

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
          background: 'rgba(0,0,0,0.55)',
          zIndex: 0,
          pointerEvents: 'none'
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
        <div
          style={{
            background: '#fff',
            padding: '6px',
            border: '2px solid #f0a500',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            height: 55,
            width: 55,
            justifyContent: 'center'
          }}
        >
          <img
            src='/src/assets/round_gi.png'
            alt='logo'
            style={{ height: 45, borderRadius: '50%', objectFit: 'contain' }}
          />
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>
            Control Room Ticketing System
          </div>
          <div style={{ color: '#c8d8f0', fontSize: 11 }}>
            Integrated Operations Management Portal
          </div>
        </div>
      </div>

      {/* ── ADMIN LOGIN MODAL ── */}
      {showAdminLogin && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: '#fff',
              borderTop: '5px solid #1a3a6b',
              padding: '32px 36px',
              width: 360,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <h3
              style={{
                color: '#1a3a6b',
                fontSize: 15,
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: 20
              }}
            >
              👑 Admin Login
            </h3>

            <label style={labelStyle}>Admin Password</label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input
                type={showAdminPass ? 'text' : 'password'}
                className='input-field'
                placeholder='Enter admin password'
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                style={{ borderColor: '#b8cce4', paddingRight: 40 }}
              />
              <button
                onClick={() => setShowAdminPass(!showAdminPass)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#1a3a6b'
                }}
              >
                {showAdminPass ? (
                  <svg
                    width='18'
                    height='18'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='#1a3a6b'
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
                    stroke='#1a3a6b'
                    strokeWidth='2'
                  >
                    <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                    <circle cx='12' cy='12' r='3' />
                  </svg>
                )}
              </button>
            </div>

            {loginError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  padding: '8px 12px',
                  fontSize: 12,
                  marginBottom: 12
                }}
              >
                {loginError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleAdminLogin}
                style={{
                  flex: 1,
                  background: '#1a3a6b',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                Login as Admin
              </button>
              <button
                onClick={() => {
                  setShowAdminLogin(false)
                  setAdminPassword('')
                  setLoginError('')
                }}
                style={{
                  background: '#64748b',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 16px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGIN CARD ── */}
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
          zIndex: 1
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
            Enter your Employee ID and password
          </p>
        </div>

        {/* Employee ID */}
        <label style={labelStyle}>Employee ID</label>
        <input
          className='input-field'
          placeholder='Enter your Employee ID'
          value={empId}
          disabled={isLocked}
          onChange={e => setEmpId(e.target.value.toUpperCase())}
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
              color: '#1a3a6b'
            }}
          >
            {showPassword ? (
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='#1a3a6b'
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
                stroke='#1a3a6b'
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

        {/* Error + Countdown */}
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
            {isLocked && countdown && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#1a3a6b',
                  textAlign: 'center',
                  letterSpacing: '3px'
                }}
              >
                ⏳ {countdown}s
              </div>
            )}
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
          {isLocked ? `Locked — ${countdown}s remaining` : 'Login'}
        </button>

        <p
          style={{
            textAlign: 'center',
            marginTop: 8,
            fontSize: 12,
            color: '#64748b',
            marginBottom: 0
          }}
        >
          <span
            onClick={() => {
              setShowForgot(true)
              setForgotMsg(null)
              setForgotEmpId('')
            }}
            style={{
              color: '#1a3a6b',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Forgot Password?
          </span>
        </p>
        {/* Register link */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 16,
            fontSize: 12,
            color: '#64748b',
            marginBottom: 0
          }}
        >
          New user?{' '}
          <span
            onClick={onRegister}
            style={{
              color: '#1a3a6b',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Register here
          </span>
        </p>
      </div>
      {/* Admin login link */}
      <p
        style={{
          marginTop: 16,
          fontSize: 11,
          color: '#ccc',
          position: 'relative',
          zIndex: 2
        }}
      >
        <span
          onClick={() => {
            setShowAdminLogin(true)
            setLoginError('')
          }}
          style={{
            cursor: 'pointer',
            textDecoration: 'underline',
            color: '#a0b4d0'
          }}
        >
          Admin Login
        </span>
      </p>

      {showForgot && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: '#fff',
              borderTop: '4px solid #1a3a6b',
              padding: 28,
              width: 380,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <h3
              style={{
                color: '#1a3a6b',
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: 20
              }}
            >
              🔑 Forgot Password
            </h3>

            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
              Enter your Employee ID. A new random password will be sent to your
              registered email.
            </p>

            <label style={labelStyle}>Employee ID</label>
            <input
              className='input-field'
              placeholder='Enter your Employee ID'
              value={forgotEmpId}
              onChange={e => setForgotEmpId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
              style={{ marginBottom: 14, borderColor: '#b8cce4' }}
            />
            {forgotMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  fontSize: 12,
                  marginBottom: 14,
                  background:
                    forgotMsg.type === 'error' ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${
                    forgotMsg.type === 'error' ? '#fca5a5' : '#86efac'
                  }`,
                  color: forgotMsg.type === 'error' ? '#b91c1c' : '#15803d',
                  fontWeight: 600
                }}
              >
                <div>{forgotMsg.text}</div>
                {forgotMsg.type === 'success' && (
                  <span
                    onClick={() => {
                      setShowForgot(false)
                      setForgotMsg(null)
                    }}
                    style={{
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      color: '#0b284f'
                    }}
                  >
                    Go to Login
                  </span>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                style={{
                  flex: 1,
                  background: '#1a3a6b',
                  color: '#fff',
                  border: 'none',
                  padding: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: forgotLoading ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                  opacity: forgotLoading ? 0.7 : 1
                }}
              >
                {forgotLoading ? 'Sending...' : 'Send New Password'}
              </button>
              <button
                onClick={() => {
                  setShowForgot(false)
                  setForgotMsg(null)
                }}
                style={{
                  background: '#64748b',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 16px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
