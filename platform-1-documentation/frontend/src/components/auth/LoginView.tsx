import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, ShieldAlert } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from '../../i18n';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const { isRtl } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg(isRtl ? 'يرجى إدخال اسم المستخدم وكلمة المرور' : 'Please enter username and password');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      setErrorMsg(err.message || (isRtl ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'Invalid username or password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.08), transparent 70%), var(--bg-main, #0b0f17)',
        padding: '1.5rem',
        direction: isRtl ? 'rtl' : 'ltr'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: 'var(--bg-card, rgba(17, 24, 39, 0.85))',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45)'
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
            }}
          >
            <Lock size={26} />
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Field 1: Identifier */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="login-identifier"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text, #e5e7eb)',
                marginBottom: '0.45rem'
              }}
            >
              {isRtl ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or Email'}
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  [isRtl ? 'right' : 'left']: '0.85rem',
                  color: 'var(--text-dim, #6b7280)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <User size={17} />
              </span>
              <input
                id="login-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={isRtl ? 'أدخل اسم المستخدم أو البريد' : 'Enter username or email'}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem',
                  fontSize: '0.9rem',
                  borderRadius: '10px',
                  border: errorMsg ? '1px solid #ef4444' : '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                  background: 'var(--bg-input, rgba(0, 0, 0, 0.25))',
                  color: 'var(--text-main, #ffffff)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Field 2: Password with Show/Hide toggle */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text, #e5e7eb)',
                marginBottom: '0.45rem'
              }}
            >
              {isRtl ? 'كلمة المرور' : 'Password'}
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  [isRtl ? 'right' : 'left']: '0.85rem',
                  color: 'var(--text-dim, #6b7280)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Lock size={17} />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRtl ? 'أدخل كلمة المرور' : 'Enter password'}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem',
                  fontSize: '0.9rem',
                  borderRadius: '10px',
                  border: errorMsg ? '1px solid #ef4444' : '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                  background: 'var(--bg-input, rgba(0, 0, 0, 0.25))',
                  color: 'var(--text-main, #ffffff)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  [isRtl ? 'left' : 'right']: '0.75rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim, #9ca3af)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? (isRtl ? 'إخفاء الرمز' : 'Hide password') : (isRtl ? 'إظهار الرمز' : 'Show password')}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Standard Red Error Message */}
          {errorMsg && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontSize: '0.84rem',
                fontWeight: 600,
                marginBottom: '1.25rem'
              }}
            >
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '10px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
              transition: 'transform 0.1s, box-shadow 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {isSubmitting
              ? isRtl ? 'جاري التحقق...' : 'Signing in...'
              : isRtl ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
