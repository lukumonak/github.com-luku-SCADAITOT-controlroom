import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Register ({ onBack }) {
  const [form, setForm] = useState({ emp_id: '', full_name: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleRegister = async () => {
    setError('')
    if (!form.emp_id.trim()) return setError('Employee ID is required')
    if (!form.full_name.trim()) return setError('Full name is required')
    if (!form.email.trim()) return setError('Email is required')
    if (!form.email.includes('@'))
      return setError('Enter a valid email address')

    setLoading(true)
    try {
      await axios.post(`${API}/register`, form)
      setSuccess(true)
    } catch (err) {
      setError(
        err.response?.data?.error || 'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
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
          <div style={{ color: '#c8d8f0', fontSize: 11 }}>
            Integrated Operations Management Portal
          </div>
        </div>
      </div>

      {/* Register Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #b8cce4',
          borderTop: '5px solid #1a3a6b',
          borderRadius: 4,
          padding: '36px 40px',
          width: 420,
          marginTop: 80,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          position: 'relative',
          zIndex: 1
        }}
      >
        {success ? (
          /* Success Screen */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2
              style={{
                color: '#1a3a6b',
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 12
              }}
            >
              Registration Successful!
            </h2>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
              Your account has been created.
            </p>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 24 }}>
              Login credentials have been sent to{' '}
              <strong style={{ color: '#1a3a6b' }}>{form.email}</strong>. Please
              check your email.
            </p>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 24 }}>
              Note: Your role is set as <strong>Operator</strong> by default.
              Admin can upgrade your role to Resolver if needed.
            </p>
            <button
              onClick={onBack}
              style={{
                background: '#1a3a6b',
                color: '#fff',
                border: 'none',
                padding: '11px 32px',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
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
                New User Registration
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: '#666',
                  marginTop: 4,
                  marginBottom: 0
                }}
              >
                Fill in your details to create an account
              </p>
            </div>

            {/* Form */}
            <label style={labelStyle}>Employee ID *</label>
            <input
              className='input-field'
              placeholder='Enter your office Employee ID'
              value={form.emp_id}
              onChange={e => setForm({ ...form, emp_id: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              style={{ marginBottom: 16, borderColor: '#b8cce4' }}
            />

            <label style={labelStyle}>Full Name *</label>
            <input
              className='input-field'
              placeholder='Enter your full name'
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              style={{ marginBottom: 16, borderColor: '#b8cce4' }}
            />

            <label style={labelStyle}>Email ID *</label>
            <input
              className='input-field'
              placeholder='Enter your office email'
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              style={{ marginBottom: 16, borderColor: '#b8cce4' }}
            />

            {/* Info box */}
            <div
              style={{
                background: '#e8eef6',
                border: '1px solid #b8cce4',
                padding: '10px 12px',
                fontSize: 11,
                color: '#1a3a6b',
                marginBottom: 16
              }}
            >
              📧 A random password will be sent to your email after
              registration. You can change it later from your profile.
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  padding: '10px 12px',
                  fontSize: 12,
                  marginBottom: 14
                }}
              >
                {error}
              </div>
            )}

            {/* Buttons */}
            <button
              onClick={handleRegister}
              disabled={loading}
              style={{
                width: '100%',
                background: '#1a3a6b',
                color: '#fff',
                border: 'none',
                padding: '11px',
                fontWeight: 700,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: loading ? 0.7 : 1,
                marginBottom: 12
              }}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>

            <button
              onClick={onBack}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#1a3a6b',
                border: '1px solid #b8cce4',
                padding: '10px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              ← Back to Login
            </button>
          </>
        )}
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
