'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import React, { useState, useRef, type FormEvent } from 'react';
import { RtuSeal } from '@/components/rtu-seal';
import {
  BookOpen,
  ShieldCheck,
  Building2,
  CalendarDays,
  Clock,
  ChartNoAxesCombined,
  LockKeyhole,
  UserRound,
  UserPlus,
  Eye,
  EyeOff,
  LoaderCircle,
  AlertCircle,
  ArrowRight,
  HelpCircle,
  X,
  GraduationCap,
  BriefcaseBusiness,
  Sparkles,
} from 'lucide-react';
import { demoAccounts } from '@/packages/test-utils/fixtures';

interface LoginViewProps {
  initialAuthError?: string;
  google?: boolean;
  demo?: boolean;
  configured: boolean;
  redirectTo?: string;
  onAuthSubmit: (provider: string, values: Record<string, string>) => Promise<unknown>;
}

export default function LandingLoginView({ configured, demo=false, google=false, initialAuthError='', redirectTo = '/', onAuthSubmit }: LoginViewProps) {
  const router=useRouter();
  const [activeTab, setActiveTab] = useState<'credentials' | 'demo'>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busyKey, setBusyKey] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState(initialAuthError);
  const [helpOpen, setHelpOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const loginSectionRef = useRef<HTMLDivElement>(null);
  const featuresSectionRef = useRef<HTMLElement>(null);

  const scrollToLogin = () => {
    loginSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 400);
  };

  const scrollToFeatures = () => {
    featuresSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const validate = () => {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      errors.username = 'Please enter your university username or institutional email.';
    }
    if (!password) {
      errors.password = 'Please enter your password.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    setFormErrors(errors);
    if (errors.username) usernameInputRef.current?.focus();
    else if (errors.password) passwordInputRef.current?.focus();
    return Object.keys(errors).length === 0;
  };

  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    if (!validate()) return;

    setBusyKey('credentials');
    try {
      await onAuthSubmit('callback/credentials', {
        username: username.trim(),
        password,
      });
      router.push('/login/complete?redirect='+encodeURIComponent(redirectTo));
    } catch (err) {
      setGeneralError(
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please verify your credentials and try again.'
      );
      setBusyKey('');
    }
  };

  const handleDemoSignIn = async (accountId: string) => {
    setBusyKey(accountId);
    setGeneralError('');
    try {
      await onAuthSubmit('callback/credentials', { demoId: accountId });
      router.push('/login/complete?redirect='+encodeURIComponent(redirectTo));
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Demo sign-in failed.');
      setBusyKey('');
    }
  };

  return (
    <div className="ps-landing-wrapper">
      {/* Top Navigation Bar */}
      <header className="ps-landing-nav">
        <div className="ps-landing-nav-inner">
          <div className="ps-landing-brand">
            <span className="ps-brand-badge">
              <RtuSeal size={38} />
            </span>
            <div className="ps-brand-titles">
              <div className="ps-brand-name">
                PractiSync<span className="ps-gold-dot">.</span>
              </div>
            </div>
          </div>

          <div className="ps-landing-actions">
            <span className="ps-academic-tag">
              <CalendarDays size={12} className="ps-tag-icon" />
              <span>A.Y. 2026–2027 · 1st Semester</span>
            </span>
            <span className="ps-campus-tag">
              <Building2 size={12} className="ps-tag-icon" />
              <span>Boni &amp; Pasig Campuses</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero & Login Main Container */}
      <main className="ps-landing-main">
        <div className="ps-landing-hero-grid">
          {/* Left Column: Story, Institutional Inspiration & Interactive Visual */}
          <section className="ps-hero-col">
            <div className="ps-hero-eyebrow">
              <ShieldCheck size={14} className="ps-eyebrow-icon" />
              <span>RTU COOPERATIVE EDUCATION &amp; INTERNSHIP WORKSPACE</span>
            </div>

            <h1 className="ps-hero-title">
              Forged by learning.<br />
              Built through experience.<br />
              <em className="ps-gold-em">Ready for what comes next.</em>
            </h1>



            <div className="ps-hero-cta-group">
              <button
                type="button"
                className="ps-hero-primary-btn"
                onClick={() => setRegisterModalOpen(true)}
              >
                Register
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="ps-hero-secondary-btn"
                onClick={scrollToFeatures}
              >
                Learn More
              </button>
            </div>
          </section>

          {/* Right Column: Login Card */}
          <section className="ps-login-col" ref={loginSectionRef}>
            <div className="ps-login-card">
              <div className="ps-login-card-header">
                <h2 className="ps-login-title">Welcome to PractiSync</h2>
              </div>

              {/* Segmented Mode Selector: Credentials vs Demo */}
              {demo && (
                <div className="ps-login-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'credentials'}
                    className={`ps-login-tab ${activeTab === 'credentials' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('credentials');
                      setGeneralError('');
                    }}
                  >
                    <UserRound size={15} />
                    <span>University Account</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'demo'}
                    className={`ps-login-tab ${activeTab === 'demo' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('demo');
                      setGeneralError('');
                    }}
                  >
                    <Sparkles size={15} />
                    <span>Quick Demo Access</span>
                  </button>
                </div>
              )}

              {/* General / Server Error Alert */}
              {generalError && (
                <div className="ps-alert ps-alert-error" role="alert">
                  <AlertCircle size={16} className="ps-alert-icon" />
                  <div className="ps-alert-content">
                    <strong>Authentication Error</strong>
                    <p>{generalError}</p>
                  </div>
                  <button
                    type="button"
                    className="ps-alert-dismiss"
                    onClick={() => setGeneralError('')}
                    aria-label="Dismiss error"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {!configured && (
                <div className="ps-alert ps-alert-warn" role="alert">
                  <AlertCircle size={16} className="ps-alert-icon" />
                  <div className="ps-alert-content">
                    <strong>Notice</strong>
                    <p>Authentication server is in setup mode. Please contact your system administrator.</p>
                  </div>
                </div>
              )}

              {(!demo || activeTab === 'credentials') ? (
                <>
                  <form className="ps-form" onSubmit={handleCredentialsSubmit} noValidate>
                    {/* Username / Institutional Email */}
                    <div className={`ps-field-group ${formErrors.username ? 'has-error' : ''}`}>
                      <label htmlFor="ps-username" className="ps-field-label">
                        <span>Username or Institutional Email</span>
                        <span className="ps-required-star" aria-hidden="true">*</span>
                      </label>
                      <div className="ps-input-wrap">
                        <span className="ps-input-icon">
                          <UserRound size={16} />
                        </span>
                        <input
                          ref={usernameInputRef}
                          id="ps-username"
                          name="username"
                          type="text"
                          autoComplete="username"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="e.g. jreyes or jreyes@rtu.edu.ph"
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            if (formErrors.username) {
                              setFormErrors((prev) => ({ ...prev, username: undefined }));
                            }
                          }}
                          className="ps-input"
                          aria-invalid={!!formErrors.username}
                          aria-describedby={formErrors.username ? 'username-error' : undefined}
                        />
                      </div>
                      {formErrors.username ? (
                        <p id="username-error" className="ps-field-error" role="alert">
                          <AlertCircle size={13} />
                          <span>{formErrors.username}</span>
                        </p>
                      ) : null}
                    </div>

                    {/* Password Field */}
                    <div className={`ps-field-group ${formErrors.password ? 'has-error' : ''}`}>
                      <div className="ps-label-row">
                        <label htmlFor="ps-password" className="ps-field-label">
                          <span>Password</span>
                          <span className="ps-required-star" aria-hidden="true">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setHelpOpen(true)}
                          className="ps-forgot-link"
                        >
                          Need assistance?
                        </button>
                      </div>
                      <div className="ps-input-wrap">
                        <span className="ps-input-icon">
                          <LockKeyhole size={16} />
                        </span>
                        <input
                          ref={passwordInputRef}
                          id="ps-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (formErrors.password) {
                              setFormErrors((prev) => ({ ...prev, password: undefined }));
                            }
                          }}
                          className="ps-input"
                          aria-invalid={!!formErrors.password}
                          aria-describedby={formErrors.password ? 'password-error' : undefined}
                        />
                        <button
                          type="button"
                          className="ps-toggle-password-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {formErrors.password && (
                        <p id="password-error" className="ps-field-error" role="alert">
                          <AlertCircle size={13} />
                          <span>{formErrors.password}</span>
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="ps-submit-btn"
                      disabled={!!busyKey || !configured}
                    >
                      {busyKey === 'credentials' ? (
                        <>
                          <LoaderCircle size={16} className="spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <LockKeyhole size={16} />
                          <span>Sign In to PractiSync</span>
                        </>
                      )}
                    </button>
                  </form>

                  <Link className="ps-forgot-link" href="/account-access">Forgot your local account password?</Link>
                  {/* Divider & Secondary Sign-In */}
                  <div className="ps-divider">
                    <span>or use university single sign-on</span>
                  </div>

                  <div className="ps-sso-wrap">
                    <button
                      type="button"
                      disabled={!google||!!busyKey}
                      onClick={async()=>{setBusyKey('google');setGeneralError('');try{const result=await onAuthSubmit('signin/google',{}) as {url?:string};if(result.url)window.location.assign(result.url);}catch(e){setGeneralError(e instanceof Error?e.message:'Google sign-in is unavailable. Try again.');setBusyKey('');}}}
                      className="ps-google-btn"
                      title="Google Workspace OAuth integration for RTU faculty & students"
                    >
                      <span className="ps-google-icon">G</span>
                      <span>Continue with @rtu.edu.ph Google Account</span>
                      <span className="ps-sso-badge">{google?'RTU Workspace':'Not configured'}</span>
                    </button>
                    <p className="ps-sso-note">
                      {google?'Students complete registration after sign-in. Staff need an invitation from the Cooperative Education Office.':'Google Workspace sign-in is unavailable in this fictional demo.'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="ps-demo-section">
                  <div className="ps-demo-notice">
                    <Sparkles size={15} />
                    <span>Instant QA &amp; Evaluation Access (No password needed)</span>
                  </div>
                  <div className="ps-demo-grid">
                    {demoAccounts.map((account, i) => {
                      const icons = [GraduationCap, BookOpen, ShieldCheck, BriefcaseBusiness];
                      const Icon = icons[i] ?? UserRound;
                      const roleColors = ['student', 'coordinator', 'admin', 'supervisor'];
                      const colorClass = roleColors[i] ?? 'default';

                      return (
                        <button
                          key={account.id}
                          type="button"
                          className={`ps-demo-card ps-demo-${colorClass}`}
                          disabled={!!busyKey || !configured}
                          onClick={() => handleDemoSignIn(account.id)}
                        >
                          <div className="ps-demo-card-head">
                            <span className="ps-demo-icon">
                              {busyKey === account.id ? (
                                <LoaderCircle size={16} className="spin" />
                              ) : (
                                <Icon size={16} />
                              )}
                            </span>
                            <span className="ps-demo-role-badge">{account.title}</span>
                          </div>
                          <strong className="ps-demo-name">{account.name}</strong>
                          <p className="ps-demo-desc">{account.description}</p>
                          <span className="ps-demo-click-hint">Click to launch &rarr;</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="ps-first-login-demo"
                    disabled={!!busyKey || !configured}
                    onClick={() => handleDemoSignIn('demo-new-student')}
                  >
                    {busyKey === 'demo-new-student' ? <LoaderCircle size={17} className="spin"/> : <UserPlus size={17}/>}
                    <span><strong>Try first-time student setup</strong><small>Fictional identity · join with a class code</small></span>
                    <ArrowRight size={16}/>
                  </button>
                </div>
              )}

              <div className="ps-login-footer-notes">
                <p>
                  Protected by RTU Institutional Access Policy · Fictional Demo Environment
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Platform Pillars Section */}
        <section className="ps-features-section" ref={featuresSectionRef}>
          <div className="ps-features-header">
            <span className="ps-features-eyebrow">RTU COE ORIENTATION · INTERNSHIP KICKSTART</span>
            <h2 className="ps-features-title">From internship orientation to industry practice</h2>
          </div>

          <div className="ps-features-grid">
            <div className="ps-feature-card ps-feature-blue">
              <div className="ps-feature-icon-wrap ps-icon-blue">
                <Clock size={22} />
              </div>
              <h3 className="ps-feature-card-title">Industry Partner Supervisor Time Verification</h3>
              <p className="ps-feature-card-copy">Verify logged hours with your Industry Partner Supervisor before coordinator review.</p>
              <div className="ps-feature-card-footer">
                <span className="ps-feature-tag">Final DTR Verification</span>
              </div>
            </div>

            <div className="ps-feature-card ps-feature-navy">
              <div className="ps-feature-icon-wrap ps-icon-navy">
                <ChartNoAxesCombined size={22} />
              </div>
              <h3 className="ps-feature-card-title">Outcome &amp; Competency Analytics</h3>
              <p className="ps-feature-card-copy">Track competency progress against course expectations and placement outcomes.</p>
              <div className="ps-feature-card-footer">
                <span className="ps-feature-tag">Curriculum Alignment</span>
              </div>
            </div>

            <div className="ps-feature-card ps-feature-gold">
              <div className="ps-feature-icon-wrap ps-icon-gold">
                <BookOpen size={22} />
              </div>
              <h3 className="ps-feature-card-title">Internship orientation</h3>
              <p className="ps-feature-card-copy">Review internship policies, required forms, and professional expectations before placement.</p>
              <div className="ps-feature-card-footer">
                <span className="ps-feature-tag">Internship readiness</span>
                <a
                  className="ps-feature-source"
                  href="https://www.rtu.edu.ph/ojt-kickstart-rtu-coe-office-launches-internship-orientation-for-the-new-semester/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  COE Office site <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="ps-landing-footer">
        <div className="ps-footer-inner">
          <div className="ps-footer-branding">
            <RtuSeal size={40} />
            <div className="ps-brand-titles">
              <div className="ps-brand-name">
                PractiSync<span className="ps-gold-dot">.</span>
              </div>
            </div>
          </div>

          <div className="ps-footer-col">
            <strong>Campuses</strong>
            <span>Boni Campus, Mandaluyong City</span>
            <span>Pasig Campus, Pasig City</span>
            <span>College of Engineering &amp; Technology</span>
          </div>

          <div className="ps-footer-col">
            <strong>Workflows</strong>
            <span>Student Daily Time Records</span>
            <span>Industry Partner Validation</span>
            <span>Faculty Coordinator Review</span>
            <span>MOA Partner Registry</span>
          </div>
        </div>
        <div className="ps-footer-bottom">
          <span>&copy; {new Date().getFullYear()} Rizal Technological University · PractiSync Workspace</span>
          <span>Privacy &amp; Data Governance · Academic Integrity</span>
        </div>
      </footer>

      {/* Account Help Modal */}
      {helpOpen && (
        <div className="ps-help-modal-overlay" role="dialog" aria-modal="true">
          <div className="ps-help-modal">
            <div className="ps-help-modal-header">
              <div className="ps-help-modal-title-row">
                <HelpCircle size={20} className="ps-help-icon" />
                <h3>PractiSync Account Help</h3>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="ps-modal-close-btn"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>
            <div className="ps-help-modal-body">
              <p>
                <strong>Need access or forgot your credentials?</strong>
              </p>
              <ul>
                <li>
                  <strong>Students:</strong> Your account is provisioned upon enrollment in your
                  practicum section. Use your RTU Student Number / institutional email and default
                  security PIN provided by your department coordinator.
                </li>
                <li>
                  <strong>Faculty Coordinators:</strong> Access is managed by the College of
                  Engineering &amp; Technology Dean&apos;s Office / Management Information System (MIS).
                </li>
                <li>
                  <strong>Industry Partner Supervisors:</strong> Account invitations are issued once
                  your company&apos;s Memorandum of Agreement (MOA) and training profile are verified by
                  the university.
                </li>
              </ul>
              {demo && (
                <div className="ps-help-demo-tip">
                  <Sparkles size={14} />
                  <span>
                    For this evaluation demo, you can instantly test any role by selecting the{' '}
                    <strong>&ldquo;Quick Demo Access&rdquo;</strong> tab on the sign-in card.
                  </span>
                </div>
              )}
            </div>
            <div className="ps-help-modal-footer">
              <button
                type="button"
                className="ps-modal-primary-btn"
                onClick={() => setHelpOpen(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hte-register-link"><a href="/register/industry-partner">Industry Partner supervisor? Register your company for approval</a></div>
      {/* Account Registration Modal */}
      {registerModalOpen && (
        <div className="ps-help-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="register-dialog-title">
          <div className="ps-help-modal">
            <div className="ps-help-modal-header">
              <div className="ps-help-modal-title-row">
                <UserPlus size={20} className="ps-help-icon" />
                <h3 id="register-dialog-title">RTU Practicum Account Registration</h3>
              </div>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="ps-modal-close-btn"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>
            <div className="ps-help-modal-body">
              <p>
                <strong>New to PractiSync? Here is how to activate or register your account:</strong>
              </p>
              <ul>
                <li>
                  <strong>RTU Students:</strong> The university provisions your account. On your first sign-in, enter your school details and the class code from your coordinator. The code identifies your program and practicum section. Completing registration opens your workspace immediately; no coordinator approval is needed. Student access requires an @rtu.edu.ph email or an explicitly authorized manual account.
                </li>
                <li>
                  <strong>Class Section Join Codes:</strong> A coordinator-provided code (e.g. <code>SYNC4A</code>) identifies a practicum section during first-time setup. Verified students can also use it in My class when they need to request enrollment.
                </li>
                <li>
                  <strong>Industry Partners:</strong> <a href="/register/industry-partner">Register your Industry Partner</a>. Industry supervisors can submit company and account details for Super Admin approval.
                </li>
              </ul>
              {demo && (
                <div className="ps-help-demo-tip">
                  <Sparkles size={14} />
                  <span>
                    Testing the system? You can jump straight in using the{' '}
                    <strong>&ldquo;Quick Demo Access&rdquo;</strong> tab to explore student, coordinator, or supervisor workflows immediately.
                  </span>
                </div>
              )}
            </div>
            <div className="ps-help-modal-footer" style={{ gap: '10px' }}>
              {demo && (
                <button
                  type="button"
                  className="ps-hero-secondary-btn"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={() => {
                    setRegisterModalOpen(false);
                    setActiveTab('demo');
                    scrollToLogin();
                  }}
                >
                  Explore Demo
                </button>
              )}
              <button
                type="button"
                className="ps-modal-primary-btn"
                onClick={() => {
                  setRegisterModalOpen(false);
                  setActiveTab('credentials');
                  scrollToLogin();
                }}
              >
                Sign In to Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
