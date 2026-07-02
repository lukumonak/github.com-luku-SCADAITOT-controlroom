import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Profile ({ user, onBack }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfPass, setShowConfPass] = useState(false)
  const [passMsg, setPassMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const changePassword = async () => {
    setPassMsg(null)
    if (!newPassword)
      return setPassMsg({ type: 'error', text: 'Enter new password' })
    if (newPassword.length < 6)
      return setPassMsg({
        type: 'error',
        text: 'Password must be at least 6 characters'
      })
    if (newPassword !== confirmPass)
      return setPassMsg({ type: 'error', text: 'Passwords do not match' })

    setLoading(true)
    try {
      await axios.post(`${API}/change-password`, {
        emp_id: user.empId,
        new_password: newPassword
      })
      setPassMsg({ type: 'success', text: '✅ Password changed successfully!' })
      setNewPassword('')
      setConfirmPass('')
    } catch (err) {
      setPassMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to change password'
      })
    } finally {
      setLoading(false)
    }
  }

  const roleBg =
    user.role === 'admin'
      ? '#1a3a6b'
      : user.role === 'resolver'
      ? '#15803d'
      : '#1a3a6b'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e8eef6 0%, #c8d8f0 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      {/* Header */}
      <div
        style={{
          background: roleBg,
          width: '100%',
          borderBottom: '4px solid #f0a500',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'fixed',
          top: 0,
          zIndex: 2
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              background: '#fff',
              padding: '6px 16px',
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
            <div style={{ color: '#c8d8f0', fontSize: 11 }}>My Profile</div>
          </div>
        </div>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          ← Back
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          marginTop: 100,
          width: '100%',
          maxWidth: 520,
          padding: '0 16px'
        }}
      >
        {/* Profile Card */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #b8cce4',
            borderTop: '5px solid ' + roleBg,
            borderRadius: 4,
            boxShadow: '0 4px 24px rgba(26,58,107,0.12)',
            marginBottom: 20
          }}
        >
          {/* Avatar Section */}
          <div
            style={{
              textAlign: 'center',
              padding: '28px 24px 20px',
              borderBottom: '1px solid #e0e0e0'
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                background: roleBg,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                color: '#fff',
                fontWeight: 700,
                marginBottom: 12
              }}
            >
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#1a1a1a',
                marginBottom: 6
              }}
            >
              {user.name}
            </div>
            <span
              style={{
                background: roleBg,
                color: '#fff',
                padding: '3px 16px',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                borderRadius: 2
              }}
            >
              {user.role}
            </span>
          </div>

          {/* Details */}
          <div style={{ padding: '20px 24px' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#1a3a6b',
                textTransform: 'uppercase',
                marginBottom: 12,
                letterSpacing: '0.5px'
              }}
            >
              Account Details
            </div>
            {[
              ['Employee ID', user.empId || '—'],
              ['Full Name', user.name || '—'],
              ['Email ID', user.email || '—'],
              ['Role', user.role?.toUpperCase() || '—']
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  padding: '10px 0',
                  borderBottom: '1px solid #f0f0f0',
                  fontSize: 13
                }}
              >
                <div
                  style={{
                    width: 120,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase'
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    color: '#1a1a1a',
                    fontWeight: label === 'Role' ? 700 : 400
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Change Password Card — not for admin */}
        {
          <div
            style={{
              background: '#fff',
              border: '1px solid #b8cce4',
              borderTop: '5px solid #f0a500',
              borderRadius: 4,
              padding: '24px',
              marginBottom: 24,
              boxShadow: '0 4px 24px rgba(26,58,107,0.12)'
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#1a3a6b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 20
              }}
            >
              🔐 Change Password
            </div>

            {/* New Password */}
            <label style={labelStyle}>New Password</label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input
                type={showNewPass ? 'text' : 'password'}
                className='input-field'
                placeholder='Enter new password (min 6 characters)'
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ borderColor: '#b8cce4', paddingRight: 40 }}
              />
              <button
                onClick={() => setShowNewPass(!showNewPass)}
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
                {showNewPass ? (
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

            {/* Confirm Password */}
            <label style={labelStyle}>Confirm Password</label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input
                type={showConfPass ? 'text' : 'password'}
                className='input-field'
                placeholder='Confirm new password'
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && changePassword()}
                style={{ borderColor: '#b8cce4', paddingRight: 40 }}
              />
              <button
                onClick={() => setShowConfPass(!showConfPass)}
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
                {showConfPass ? (
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

            {/* Password match indicator */}
            {confirmPass && (
              <div
                style={{
                  fontSize: 11,
                  marginBottom: 12,
                  color: newPassword === confirmPass ? '#15803d' : '#b91c1c'
                }}
              >
                {newPassword === confirmPass
                  ? '✓ Passwords match'
                  : '✗ Passwords do not match'}
              </div>
            )}

            {/* Message */}
            {passMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  fontSize: 12,
                  marginBottom: 14,
                  background: passMsg.type === 'error' ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${
                    passMsg.type === 'error' ? '#fca5a5' : '#86efac'
                  }`,
                  color: passMsg.type === 'error' ? '#b91c1c' : '#15803d',
                  fontWeight: 600
                }}
              >
                {passMsg.text}
              </div>
            )}

            <button
              onClick={changePassword}
              disabled={loading}
              style={{
                width: '100%',
                background: '#1a3a6b',
                color: '#fff',
                border: 'none',
                padding: '11px',
                fontWeight: 700,
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        }
      </div>
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
