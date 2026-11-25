import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import heroImg from './assets/hero.png';
import './index.css';

const TOTAL_STEPS = 12;
const MAX_KIDS_FIELDS = 15;
const ADMIN_PAGE_LIMIT = 10;
const API_BASE = 'http://localhost:5000';

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  age: '',
  kidsCount: '',
  kidsAges: [],
  workingStatus: '',
  industry: '',
  continuedJob: '',
  timeOff: '',
  biggestChallenge: '',
  passionOrHome: '',
  joinedCommunity: false,
};

export default function App() {
  const [viewMode, setViewMode] = useState(() =>
    window.location.pathname.toLowerCase().startsWith('/admin') ? 'admin' : 'survey'
  );

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [girlSrcIndex, setGirlSrcIndex] = useState(0);

  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('pinkPelicanAdminToken') || '');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);

  const [submissions, setSubmissions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [adminFetchError, setAdminFetchError] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);

  const girlImageSources = [
    '/girl-illustration.png',
    '/girl-illustration.png.png',
    heroImg,
  ];

  useEffect(() => {
    const handlePopState = () => {
      const isAdminPath = window.location.pathname.toLowerCase().startsWith('/admin');
      setViewMode(isAdminPath ? 'admin' : 'survey');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, submittedSuccess, viewMode]);

  const fetchSubmissions = useCallback(
    async (pageToFetch = 1, tokenOverride = null) => {
      const activeToken = tokenOverride || adminToken;
      if (!activeToken) return;

      try {
        setIsLoadingSubmissions(true);
        setAdminFetchError('');
        const res = await axios.get(`${API_BASE}/api/admin/submissions`, {
          params: { page: pageToFetch, limit: ADMIN_PAGE_LIMIT },
          headers: { Authorization: `Bearer ${activeToken}` },
        });

        setSubmissions(res.data.data || []);
        setCurrentPage(res.data.pagination?.currentPage || pageToFetch);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.totalCount || 0);
      } catch (err) {
        console.error(err);
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          localStorage.removeItem('pinkPelicanAdminToken');
          setAdminToken('');
          setAdminAuthError('Session expired or invalid credentials. Please log in again.');
        } else {
          setAdminFetchError('Could not load submissions. Check if backend server is running.');
        }
      } finally {
        setIsLoadingSubmissions(false);
      }
    },
    [adminToken]
  );

  useEffect(() => {
    if (viewMode === 'admin' && adminToken) {
      fetchSubmissions(currentPage);
    }
  }, [viewMode, adminToken, currentPage, fetchSubmissions]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminEmailInput.trim() || !adminPasswordInput.trim()) {
      setAdminAuthError('Please enter both ID/Email and Password.');
      return;
    }

    try {
      setIsAdminLoggingIn(true);
      setAdminAuthError('');
      const res = await axios.post(`${API_BASE}/api/admin/login`, {
        email: adminEmailInput.trim(),
        password: adminPasswordInput,
      });

      const receivedToken = res.data.token;
      localStorage.setItem('pinkPelicanAdminToken', receivedToken);
      setAdminToken(receivedToken);
      setAdminPasswordInput('');
      setCurrentPage(1);
      await fetchSubmissions(1, receivedToken);
    } catch (err) {
      console.error(err);
      setAdminAuthError(
        err.response?.data?.message || 'Invalid ID/Email or Password.'
      );
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('pinkPelicanAdminToken');
    setAdminToken('');
    setSubmissions([]);
    setSelectedRow(null);
    setAdminAuthError('');
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMsg('');
  };

  const handleEmailChange = (e) => {
    const lowerEmail = e.target.value.toLowerCase();
    setFormData((prev) => ({ ...prev, email: lowerEmail }));
    setErrorMsg('');
  };

  const handlePhoneChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, phone: onlyDigits }));
    setErrorMsg('');
  };

  const handleAgeChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 3);
    setFormData((prev) => ({ ...prev, age: onlyDigits }));
    setErrorMsg('');
  };

  const handleKidsCountChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 2);
    const parsedCount = onlyDigits === '' ? 0 : parseInt(onlyDigits, 10);
    const safeCount = Math.min(parsedCount, MAX_KIDS_FIELDS);

    setFormData((prev) => {
      const updatedAges = Array.from({ length: safeCount }, (_, idx) => prev.kidsAges[idx] || '');
      return {
        ...prev,
        kidsCount: onlyDigits,
        kidsAges: updatedAges,
      };
    });
    setErrorMsg('');
  };

  const handleSingleKidAgeChange = (index, value) => {
    setFormData((prev) => {
      const updatedAges = [...prev.kidsAges];
      updatedAges[index] = value;
      return { ...prev, kidsAges: updatedAges };
    });
    setErrorMsg('');
  };

  const nextStep = () => {
    if (step === 3 && !formData.email.trim()) {
      setErrorMsg('Please enter your Email Address to continue.');
      return;
    }
    setErrorMsg('');
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const prevStep = () => {
    setErrorMsg('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      setErrorMsg('Email Address is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await axios.post(`${API_BASE}/api/submit`, formData);
      setSubmittedSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMsg('Something went wrong while saving. Make sure backend server is running on port 5000.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = (step / TOTAL_STEPS) * 100;
  const rawKidsCount = formData.kidsCount ? parseInt(formData.kidsCount, 10) : 0;
  const visibleAgeFieldsCount = Math.min(rawKidsCount, MAX_KIDS_FIELDS);

  if (viewMode === 'admin') {
    return (
      <div className="admin-shell">
        <div className="top-utility-bar">
          <button
            type="button"
            className="admin-nav-btn"
            onClick={() => {
              setSelectedRow(null);
              window.history.pushState({}, '', '/');
              setViewMode('survey');
            }}
          >
            ← Back to Form
          </button>
          {adminToken && (
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '12.5px' }}
              onClick={handleAdminLogout}
            >
              Logout
            </button>
          )}
        </div>

        <div className="top-hero-header">
          <span className="brand-pill">
            <span className="brand-dot" />
            The Pink Pelican • Admin Panel
          </span>
          <h2>Admin Responses Dashboard</h2>
        </div>

        {!adminToken ? (
          <div className="app-wrapper">
            <div className="admin-card">
              <h2 style={{ marginBottom: '6px' }}>Admin Login</h2>
              <p className="lead-text">
                Sign in with your Admin ID / Email and Password to view all submitted forms.
              </p>

              <form onSubmit={handleAdminLogin}>
                <div className="theme-inner-box">
                  <div className="field-group">
                    <label className="field-label">Admin ID / Email</label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="admin@thepinkpelican.com"
                      value={adminEmailInput}
                      onChange={(e) => {
                        setAdminEmailInput(e.target.value);
                        setAdminAuthError('');
                      }}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Password</label>
                    <input
                      type="password"
                      className="text-input"
                      placeholder="Enter admin password"
                      value={adminPasswordInput}
                      onChange={(e) => {
                        setAdminPasswordInput(e.target.value);
                        setAdminAuthError('');
                      }}
                    />
                  </div>
                </div>

                {adminAuthError && <div className="error-msg">{adminAuthError}</div>}

                <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn-primary" disabled={isAdminLoggingIn}>
                    {isAdminLoggingIn ? 'Signing in...' : 'Login to Admin Panel →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="admin-card">
            <div className="admin-header-row">
              <div className="admin-stats-strip" style={{ marginBottom: 0 }}>
                <div className="admin-stat-chip">
                  Total Submissions: <span>{totalCount}</span>
                </div>
                <div className="admin-stat-chip">
                  Showing: <span>{ADMIN_PAGE_LIMIT} per page</span>
                </div>
                <div className="admin-stat-chip">
                  Page: <span>{currentPage} of {totalPages}</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => fetchSubmissions(currentPage)}
              >
                ↻ Refresh
              </button>
            </div>

            {adminFetchError && <div className="error-msg">{adminFetchError}</div>}

            {isLoadingSubmissions ? (
              <p className="lead-text" style={{ textAlign: 'center', padding: '28px 0' }}>
                Loading submissions...
              </p>
            ) : submissions.length === 0 ? (
              <div className="theme-inner-box" style={{ textAlign: 'center', padding: '28px' }}>
                <p className="lead-text" style={{ marginBottom: 0 }}>
                  No form submissions found yet.
                </p>
              </div>
            ) : (
              <>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Age</th>
                        <th>Kids</th>
                        <th>Working Status</th>
                        <th>Community</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((item, idx) => {
                        const serialNo = (currentPage - 1) * ADMIN_PAGE_LIMIT + idx + 1;
                        return (
                          <tr key={item._id || serialNo}>
                            <td>{serialNo}</td>
                            <td>{item.name || '—'}</td>
                            <td>{item.email || '—'}</td>
                            <td>{item.phone || '—'}</td>
                            <td>{item.age || '—'}</td>
                            <td>{item.kidsCount || '0'}</td>
                            <td>{item.workingStatus || '—'}</td>
                            <td>{item.joinedCommunity ? 'Yes' : 'No'}</td>
                            <td>
                              <button
                                type="button"
                                className="admin-view-btn"
                                onClick={() => setSelectedRow(item)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pagination-bar">
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (10 records per page)
                  </div>

                  <div className="pagination-buttons">
                    <button
                      type="button"
                      className="page-num-btn"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    >
                      ← Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        className={`page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      type="button"
                      className="page-num-btn"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {selectedRow && (
          <div className="detail-modal-backdrop" onClick={() => setSelectedRow(null)}>
            <div className="detail-modal-card" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ marginBottom: 0 }}>Submission Details</h2>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '12.5px' }}
                  onClick={() => setSelectedRow(null)}
                >
                  ✕ Close
                </button>
              </div>

              <div className="detail-row">
                <span className="detail-key">Name</span>
                {selectedRow.name || '—'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Email</span>
                {selectedRow.email || '—'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Phone</span>
                {selectedRow.phone || '—'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Age</span>
                {selectedRow.age || '—'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Number of Little Ones</span>
                {selectedRow.kidsCount || '0'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Ages of Little Ones</span>
                {Array.isArray(selectedRow.kidsAges) && selectedRow.kidsAges.length > 0
                  ? selectedRow.kidsAges.filter(Boolean).join(', ') || '—'
                  : '—'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Working Status</span>
                {selectedRow.workingStatus || '—'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Industry / Profession</span>
                {selectedRow.industry || '—'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Continued Job After Motherhood</span>
                {selectedRow.continuedJob || '—'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Time Taken Off</span>
                {selectedRow.timeOff || '—'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Biggest Challenge While Rejoining</span>
                {selectedRow.biggestChallenge || '—'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Passion vs Managing Home</span>
                {selectedRow.passionOrHome || '—'}
              </div>
              <div className="detail-row">
                <span className="detail-key">Joined Community Updates</span>
                {selectedRow.joinedCommunity ? 'Yes' : 'No'}
              </div>
              {selectedRow.createdAt && (
                <div className="detail-row">
                  <span className="detail-key">Submitted At</span>
                  {new Date(selectedRow.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-shell">
      {girlSrcIndex < girlImageSources.length && (
        <aside className="floating-girl-left" aria-hidden="true">
          <img
            src={girlImageSources[girlSrcIndex]}
            alt=""
            className="girl-art-img"
            onError={() => setGirlSrcIndex((prev) => prev + 1)}
          />
          <div className="girl-art-caption">
            Grace in every role,<br />warmth in every step
          </div>
          <div className="side-heart-divider">
            <span className="side-heart-line" />
            <span className="side-heart-icon">♡</span>
            <span className="side-heart-line" />
          </div>
        </aside>
      )}

      <div className="top-hero-header">
        <span className="brand-pill">
          <span className="brand-dot" />
          The Pink Pelican • Step {step} of {TOTAL_STEPS}
        </span>

        {step === 1 && (
          <>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                color: '#d85a72',
                marginBottom: '6px',
              }}
            >
              Welcome to The Pink Pelican
            </div>
            <h1>
              Can I truly have both — a <span className="accent-word">thriving career</span> and a
              fulfilling family life?
            </h1>
            <p className="lead-text" style={{ marginBottom: '10px' }}>
              A platform with purpose and a community with heart for working mothers — explore your
              career rhythm and family balance without guilt or judgment.
            </p>
          </>
        )}

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="app-wrapper">
        <div className="form-card">
          {step === 1 && (
            <div style={{ textAlign: 'center' }}>
              <div className="theme-inner-box">
                <div className="step1-pillars-row">
                  <div className="step1-mini-card">
                    <div className="step1-mini-title">Thriving Community</div>
                    <div className="step1-mini-desc">
                      Real stories &amp; everyday support from fellow working moms.
                    </div>
                  </div>

                  <div className="step1-mini-card">
                    <div className="step1-mini-title">Career &amp; Home Rhythm</div>
                    <div className="step1-mini-desc">
                      Full-time, WFH, business, or career break — every path counts.
                    </div>
                  </div>

                  <div className="step1-mini-card">
                    <div className="step1-mini-title">Resources &amp; Growth</div>
                    <div className="step1-mini-desc">
                      Thoughtful check-ins and tools crafted for modern mothers.
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={nextStep}
                style={{ padding: '13px 36px', fontSize: '15px' }}
              >
                Begin Check-In →
              </button>

              <div className="meta-row">
                <span className="meta-item">⏱ About 2 Minutes</span>
                <span className="meta-item">♡ Zero Judgment</span>
                <span className="meta-item">✦ Thriving Moms Community</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2>Before you start</h2>
              <p className="lead-text">
                We see you, working mama! Juggling work, home and kids is not easy. This check-in
                and survey is here to hold space for you and know you better—at your own pace,
                with zero judgment.
              </p>

              <div className="theme-inner-box">
                <div className="intro-strip">
                  <div className="intro-strip-title">What to expect</div>
                  <div className="intro-strip-desc">
                    First you&apos;ll share your basic details, followed by one question at a time
                    about your family and work journey.
                  </div>
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2>Basic Details</h2>
              <p className="lead-text">Tell us a little bit about yourself.</p>

              <div className="theme-inner-box">
                <div className="field-group">
                  <label className="field-label">Name</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Your answer"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">
                    Email Address <span className="required-star">*</span>
                  </label>
                  <input
                    type="email"
                    className="text-input"
                    placeholder="example@gmail.com"
                    value={formData.email}
                    onChange={handleEmailChange}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Phone number</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="text-input"
                    placeholder="Enter numbers only (e.g. 9876543210)"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Age</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="text-input"
                    placeholder="Enter numbers only (e.g. 32)"
                    value={formData.age}
                    onChange={handleAgeChange}
                  />
                </div>
              </div>

              {errorMsg && <div className="error-msg">{errorMsg}</div>}

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="theme-inner-box">
                <div className="field-group">
                  <label className="field-label" style={{ fontSize: '21px', marginBottom: '14px' }}>
                    How many little ones you have in your team?
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="text-input"
                    placeholder="Enter number (e.g. 2, 5, 10)"
                    value={formData.kidsCount}
                    onChange={handleKidsCountChange}
                  />
                  {rawKidsCount > MAX_KIDS_FIELDS && (
                    <div className="error-msg">
                      Showing up to {MAX_KIDS_FIELDS} age fields at a time.
                    </div>
                  )}
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="theme-inner-box">
                <div className="field-group">
                  <label className="field-label" style={{ fontSize: '21px', marginBottom: '14px' }}>
                    Age of your little ones
                  </label>

                  {visibleAgeFieldsCount > 0 ? (
                    <div className="options-list">
                      {Array.from({ length: visibleAgeFieldsCount }, (_, idx) => (
                        <div key={idx} className="field-group" style={{ marginBottom: '10px' }}>
                          <label className="field-label" style={{ fontSize: '13.5px', marginBottom: '5px' }}>
                            Little one #{idx + 1} age
                          </label>
                          <input
                            type="text"
                            className="text-input"
                            placeholder={`Age of child ${idx + 1} (e.g. 4 years or 8 months)`}
                            value={formData.kidsAges[idx] || ''}
                            onChange={(e) => handleSingleKidAgeChange(idx, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Your answer"
                      value={formData.kidsAges[0] || ''}
                      onChange={(e) => handleSingleKidAgeChange(0, e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div>
              <div className="theme-inner-box">
                <div className="field-group">
                  <label className="field-label" style={{ fontSize: '21px', marginBottom: '14px' }}>
                    Are you currently a working mother?
                  </label>
                  <div className="options-list">
                    {[
                      'Yes, Full-time working (8+ hours)',
                      'Yes, Part-time / Freelance / Work From Home',
                      'Yes, Business Owner / Entrepreneur',
                      'Currently on a career break, planning to restart',
                      "Currently on a break and don't want to restart",
                    ].map((opt) => (
                      <label
                        key={opt}
                        className={`option-card ${formData.workingStatus === opt ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="workingStatus"
                          checked={formData.workingStatus === opt}
                          onChange={() => handleChange('workingStatus', opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 7 && (
            <div>
              <div className="theme-inner-box">
                <div className="field-group">
                  <label className="field-label" style={{ fontSize: '21px', marginBottom: '14px' }}>
                    Which industry / profession are you from?
                  </label>
                  <div className="options-list">
                    {[
                      'Corporate - IT, Finance, Marketing, HR',
                      'Education, Healthcare, Government Job',
                      'Freelance / Creator / Consultant / Blogger',
                      'Entrepreneur / Business Owner',
                    ].map((opt) => (
                      <label
                        key={opt}
                        className={`option-card ${formData.industry === opt ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="industry"
                          checked={formData.industry === opt}
                          onChange={() => handleChange('industry', opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 8 && (
            <div>
              <div className="theme-inner-box">
                <div className="field-group">
                  <label className="field-label" style={{ fontSize: '21px', marginBottom: '14px' }}>
                    Did you continue your job after becoming a mother?
                  </label>
                  <div className="options-list">
                    {[
                      'Yes, continued the same profile',
                      'Yes, but switched my profile',
                      'No, took a career break and joined back later',
                      'No, left my job and now focusing on family full-time',
                    ].map((opt) => (
                      <label
                        key={opt}
                        className={`option-card ${formData.continuedJob === opt ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="continuedJob"
                          checked={formData.continuedJob === opt}
                          onChange={() => handleChange('continuedJob', opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 9 && (
            <div>
              <div className="theme-inner-box">
                <div className="field-group">
                  <label className="field-label" style={{ fontSize: '21px', marginBottom: '14px' }}>
                    How much time did you take off after becoming a mother before getting back to work?
                  </label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Your answer"
                    value={formData.timeOff}
                    onChange={(e) => handleChange('timeOff', e.target.value)}
                  />
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 10 && (
            <div>
              <div className="theme-inner-box">
                <div className="field-group">
                  <label className="field-label" style={{ fontSize: '21px', marginBottom: '14px' }}>
                    What was the biggest challenge while rejoining?
                  </label>
                  <div className="options-list">
                    {[
                      'Guilt and emotional struggle of leaving baby',
                      'No family support / No good childcare',
                      'Skills gap / Confidence low after break',
                      'Finding a job with flexible hours / good salary',
                    ].map((opt) => (
                      <label
                        key={opt}
                        className={`option-card ${formData.biggestChallenge === opt ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="biggestChallenge"
                          checked={formData.biggestChallenge === opt}
                          onChange={() => handleChange('biggestChallenge', opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 11 && (
            <div>
              <div className="theme-inner-box">
                <div className="field-group">
                  <label className="field-label" style={{ fontSize: '21px', marginBottom: '14px' }}>
                    Is your current work related to your passion or just for managing home?
                  </label>
                  <div className="options-list">
                    {[
                      'No, I compromised - chose this only because timings / WFH suits family',
                      "Yes, it's my passion - what I always wanted to do",
                      "It's not my first passion, but I enjoy it now and it helps manage home",
                      'I started something of my own to balance passion + family',
                    ].map((opt) => (
                      <label
                        key={opt}
                        className={`option-card ${formData.passionOrHome === opt ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="passionOrHome"
                          checked={formData.passionOrHome === opt}
                          onChange={() => handleChange('passionOrHome', opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
                <button type="button" className="btn-primary" onClick={nextStep}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 12 && !submittedSuccess && (
            <form onSubmit={handleSubmit}>
              <h2>Stay Connected</h2>
              <p className="lead-text">
                Would you like to receive updates, community notes, and resources from The Pink Pelican?
              </p>

              <div className="theme-inner-box">
                <label className={`option-card ${formData.joinedCommunity ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={formData.joinedCommunity}
                    onChange={(e) => handleChange('joinedCommunity', e.target.checked)}
                  />
                  <span>Yes, keep me posted on The Pink Pelican updates &amp; community</span>
                </label>
              </div>

              {errorMsg && <div className="error-msg">{errorMsg}</div>}

              <div className="btn-row">
                <button type="button" className="btn-secondary" onClick={prevStep}>
                  ← Back
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Response'}
                </button>
              </div>
            </form>
          )}

          {step === 12 && submittedSuccess && (
            <div>
              <h2>Thank you for responding</h2>
              <p className="lead-text">
                Your response has been safely recorded. Thank you for taking this gentle pause for yourself.
              </p>

              <div className="resource-box">
                <div className="intro-strip-title">Join our WhatsApp Community</div>
                <p className="intro-strip-desc" style={{ marginBottom: '8px' }}>
                  Connect with other working mothers on a similar journey:
                </p>
                <a
                  href="https://chat.whatsapp.com/l2TaFdFPutMATaa7Y3G3ain?s=cl&p=a&iam=2"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://chat.whatsapp.com/l2TaFdFPutMATaa7Y3G3ain?s=cl&amp;p=a&amp;iam=2
                </a>
              </div>

              <div className="resource-box">
                <div className="intro-strip-title">The Pink Pelican Working Mom&apos;s Journal</div>
                <p className="intro-strip-desc" style={{ marginBottom: '8px' }}>
                  Explore the journal on Amazon:
                </p>
                <a
                  href="https://amzn.in/d/09ZjwUoI"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://amzn.in/d/09ZjwUoI
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}