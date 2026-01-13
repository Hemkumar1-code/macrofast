import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Box, Loader } from 'lucide-react';
import '../index.css';

const ADMIN_EMAILS = ['hemk3672@gmail.com', 'rojes@gmail.com'];
const USER_EMAILS = ['dataentry@gmail.com', 'dataentry1@gmail.com'];

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Simulate API call
        setTimeout(() => {
            setLoading(false);

            const normalizedEmail = email.toLowerCase().trim();

            let role = '';
            if (ADMIN_EMAILS.includes(normalizedEmail)) {
                role = 'admin';
            } else if (USER_EMAILS.includes(normalizedEmail)) {
                role = 'user';
            } else {
                setError('Unauthorized email address. Please contact IT support.');
                return;
            }

            localStorage.setItem('role', role);
            localStorage.setItem('user', normalizedEmail);

            if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/entry');
            }
        }, 800);
    };

    return (
        <div style={{
            height: '100vh',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Premium Background Pattern */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.5,
                zIndex: 0
            }}></div>

            <div style={{
                position: 'absolute',
                top: '-10%',
                right: '-10%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(255,255,255,0) 70%)',
                borderRadius: '50%',
                zIndex: 1
            }}></div>

            <div className="erp-card relative z-10 animate-slide-up" style={{ width: '440px', padding: '0', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>

                {/* Header Section */}
                <div style={{ padding: '2.5rem 2.5rem 1.5rem', textAlign: 'center', background: 'white' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'var(--erp-primary)',
                        borderRadius: '16px',
                        margin: '0 auto 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
                    }}>
                        <Box size={32} color="white" strokeWidth={1.5} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--erp-text-main)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                        Carton<span style={{ color: 'var(--erp-accent)' }}>Export</span>
                    </h2>
                    <p style={{ color: 'var(--erp-text-sub)', fontSize: '0.9rem' }}>Enterprise Data Management System</p>
                </div>

                {/* Form Section */}
                <div style={{ padding: '0 2.5rem 2.5rem', background: 'white' }}>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {error && (
                            <div style={{
                                padding: '12px',
                                background: 'var(--erp-error-bg)',
                                color: 'var(--erp-error)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.85rem',
                                textAlign: 'center',
                                border: '1px solid #fee2e2'
                            }}>
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="erp-label" style={{ marginBottom: '8px' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--erp-text-light)' }} />
                                <input
                                    type="email"
                                    className="erp-input"
                                    style={{ paddingLeft: '42px', height: '44px' }}
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="erp-label" style={{ marginBottom: '8px' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--erp-text-light)' }} />
                                <input
                                    type="password"
                                    className="erp-input"
                                    style={{ paddingLeft: '42px', height: '44px' }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="erp-btn erp-btn-primary w-full"
                            disabled={loading}
                            style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                            {loading ? (
                                <>
                                    <Loader size={18} className="animate-spin" /> Authenticating...
                                </>
                            ) : (
                                <>
                                    Secure Login <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div style={{ padding: '1.25rem', background: '#f8fafc', borderTop: '1px solid var(--erp-border)', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--erp-text-light)' }}>
                        Restricted Access • Authorized Personnel Only
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
