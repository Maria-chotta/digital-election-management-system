console.log("SCRIPT FILE LOADED SUCCESSFULLY");
/* =====================================
   DIGITAL ELECTION MANAGEMENT SYSTEM
   FRONTEND JAVASCRIPT (STATIC)
===================================== */

// IMPORTANT:
// This file must live in Django static directory so that templates can load it via:
//   {% static 'frontend/script.js' %}

const API_BASE_URL = window.location.origin;

const API = {
  register: `${API_BASE_URL}/api/auth/register/`,
  login: `${API_BASE_URL}/api/auth/login/`,
  elections: `${API_BASE_URL}/api/elections/`,
  vote: `${API_BASE_URL}/api/vote/`,
  results: (id) => `${API_BASE_URL}/api/results/${id}/`,
};

// JWT token
let token = localStorage.getItem("token");

// UI helpers
const $ = (id) => document.getElementById(id);

function setSpinner(isLoading) {
  const spinner = document.getElementById('globalSpinner');
  if (!spinner) return;
  spinner.style.display = isLoading ? 'inline-block' : 'none';
}

function setFlashMessage(elementId, message, type = 'info') {
  const el = $(elementId);
  if (!el) return;
  if (!message) {
    el.style.display = 'none';
    el.textContent = '';
    el.classList.remove('error', 'success', 'info');
    return;
  }

  el.textContent = message;
  el.classList.remove('error', 'success', 'info');
  el.classList.add(type);
  el.style.display = 'block';
}

function setAuthMessage(message, type = 'info') {
  setFlashMessage('authAlert', message, type);
}

function setVoteMessage(message, type = 'info') {
  setFlashMessage('voteAlert', message, type);
}

function setGlobalMessage(message, type = 'info') {
  setFlashMessage('globalAlert', message, type);
}

function showStoredFlashMessage() {
  const raw = sessionStorage.getItem('flashMessage');
  if (!raw) return;
  sessionStorage.removeItem('flashMessage');
  try {
    const { message, type } = JSON.parse(raw);
    if (message) setGlobalMessage(message, type || 'success');
  } catch {
    // ignore invalid stored message
  }
}

function validateNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function safeFetchJson(url, options) {
  if (!options) options = {};
  if (!options.headers) options.headers = {};
  if (token && !options.headers['Authorization']) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, options);

  if (response.status === 401) {
    localStorage.removeItem('token');
    token = null;
    checkAuth();
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // non-json response
  }

  return { response, data };
}

/* ===========================
   SECURITY & AUTH GUARD
=========================== */

function checkAuth() {
  token = localStorage.getItem("token");
  
  const navHome = $('navHome');
  const navElections = $('navElections');
  const navResults = $('navResults');
  const navLogin = $('navLogin');
  const navRegister = $('navRegister');
  const navLogout = $('navLogout');

  if (token) {
    if (navHome) navHome.style.display = 'inline-block';
    if (navElections) navElections.style.display = 'inline-block';
    if (navResults) navResults.style.display = 'inline-block';
    if (navLogout) navLogout.style.display = 'inline-block';
    
    if (navLogin) navLogin.style.display = 'none';
    if (navRegister) navRegister.style.display = 'none';

    const activeSection = document.querySelector('.section.active');
    if (!activeSection || activeSection.id === 'auth-section') {
      showSection('home');
    }
  } else {
    if (navHome) navHome.style.display = 'none';
    if (navElections) navElections.style.display = 'none';
    if (navResults) navResults.style.display = 'none';
    if (navLogout) navLogout.style.display = 'none';
    
    if (navLogin) navLogin.style.display = 'inline-block';
    if (navRegister) navRegister.style.display = 'inline-block';

    showSection('auth-section');
    showAuth('login');
  }
}

function showAuth(mode) {
  const loginForm = $('loginForm');
  const registerForm = $('registerForm');
  const tabLogin = $('tabLogin');
  const tabRegister = $('tabRegister');
  const alertEl = $('authAlert');

  if (alertEl) alertEl.style.display = 'none';

  if (mode === 'register') {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabRegister) tabRegister.classList.add('active');
  } else {
    if (registerForm) registerForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    if (tabRegister) tabRegister.classList.remove('active');
    if (tabLogin) tabLogin.classList.add('active');
  }
}

/* ===========================
   SECTION NAVIGATION
=========================== */

function showSection(sectionId) {
  if (!token && sectionId !== 'auth-section') {
    setAuthMessage('Please login or register to access the election system.', 'error');
    showSection('auth-section');
    return;
  }

  document
    .querySelectorAll('.section')
    .forEach((section) => section.classList.remove('active'));

  const target = $(sectionId);
  if (target) target.classList.add('active');

  if (sectionId === 'elections') {
    loadElections();
  }
}

/* ===========================
   AUTH (Register/Login)
=========================== */

async function registerUser() {
  const name = $('authRegisterName')?.value;
  const email = $('authRegisterEmail')?.value;
  const password = $('authRegisterPassword')?.value;

  // Client-side validation
  if (!validateNonEmpty(name)) return setAuthMessage('Full name is required.', 'error');
  if (!validateNonEmpty(email) || !email.includes('@')) return setAuthMessage('A valid email is required.', 'error');
  if (!validateNonEmpty(password) || password.length < 6) return setAuthMessage('Password must be at least 6 characters.', 'error');

  try {
    setSpinner(true);
    setAuthMessage('Creating account...', 'info');

    const { response, data } = await safeFetchJson(API.register, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (response.ok) {
      setAuthMessage('Registration successful! Please login.', 'success');
      // Do NOT auto-login. User must enter credentials to get a token.
      if ($('authEmail')) $('authEmail').value = email;
      setTimeout(() => {
        showAuth('login');
      }, 300);
      return;
    }

    const msg = data?.error || data?.detail || 'Registration failed.';
    setAuthMessage(msg, 'error');
  } catch (e) {
    setAuthMessage('Network error while registering. Check your connection.', 'error');
  } finally {
    setSpinner(false);
  }
}

async function login() {
  const email = $('authEmail')?.value;
  const password = $('authPassword')?.value;

  if (!validateNonEmpty(email) || !email.includes('@')) return setAuthMessage('A valid email is required.', 'error');
  if (!validateNonEmpty(password)) return setAuthMessage('Password is required.', 'error');

  try {
    setSpinner(true);
    setAuthMessage('Logging in...', 'info');

    const { response, data } = await safeFetchJson(API.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      token = data?.access;
      if (!token) {
        setAuthMessage('Login succeeded but token was not returned.', 'error');
        return;
      }

      localStorage.setItem('token', token);
      const successMsg = data?.message || 'Login successful!';
      setAuthMessage(successMsg, 'success');
      sessionStorage.setItem(
        'flashMessage',
        JSON.stringify({ message: successMsg, type: 'success' }),
      );

      window.setTimeout(() => {
        window.location.href = '/';
      }, 800);
      return;
    }

    const msg = data?.error || data?.detail || 'Login failed.';
    setAuthMessage(msg, 'error');
  } catch (e) {
    setAuthMessage('Network error while logging in. Check your connection.', 'error');
  } finally {
    setSpinner(false);
  }
}

function logout() {
  localStorage.removeItem('token');
  token = null;
  setAuthMessage('Logged out.', 'info');
  checkAuth();
}

/* ===========================
   ELECTIONS
=========================== */

async function loadElections() {

  const container = $('electionContainer');

  if (!container) return;


  container.innerHTML =
    '<p class="muted">Loading elections...</p>';


  try {

    const { response, data } =
      await safeFetchJson(API.elections, {
        method: 'GET'
      });


    if (!response.ok) {

      container.innerHTML =
        `<p style="color:#b91c1c">
          Failed to load elections.
        </p>`;

      return;
    }


    const elections =
      Array.isArray(data)
        ? data
        : (data.results || []);



    if (!elections.length) {

      container.innerHTML =
        '<p class="muted">No elections available.</p>';

      return;
    }



    container.innerHTML = elections.map(e => `

      <div class="card">

        <h3>
          ${escapeHtml(e.title)}
        </h3>


        <p>
          ${escapeHtml(e.description)}
        </p>


        <p>
          Status:
          ${
            e.is_active
            ? '<span class="badge badge-success">Active</span>'
            : '<span class="badge badge-muted">Closed</span>'
          }
        </p>


        <button 
          class="primary-btn"
          onclick="loadCandidates(${e.id})">

          View Candidates

        </button>


      </div>


    `).join('');



  } catch(error) {

    console.log(error);

    container.innerHTML =
      '<p style="color:#b91c1c">Network error while loading elections.</p>';

  }

}





/* ===========================
   CANDIDATES
=========================== */


async function loadCandidates(electionId) {


  const container =
    $('candidateContainer');


  if (!container) return;



  container.innerHTML =
    '<p class="muted">Loading candidates...</p>';



  try {


    const { response, data } =
      await safeFetchJson(
        `${API.elections}${electionId}/candidates/`,
        {
          method: 'GET'
        }
      );



    if (!response.ok) {


      container.innerHTML =
        '<p class="muted">Failed loading candidates.</p>';

      showSection('candidates');

      return;

    }



    const candidates = data.candidates || [];
    const votedPositions = new Set(data.voted_positions || []);

    if (!candidates.length) {
      container.innerHTML = '<p class="muted">No candidates found.</p>';
      showSection('candidates');
      return;
    }

    container.innerHTML = candidates.map((c) => {
      const alreadyVoted = votedPositions.has(c.position);
      const voteButton = alreadyVoted
        ? `<button class="vote-btn" type="button" disabled title="You already voted for this position">Already voted</button>`
        : `<button class="vote-btn" type="button" data-candidate-id="${c.id}" data-election-id="${electionId}" onclick="vote(${c.id}, ${electionId}, this)">Vote</button>`;

      return `
      <div class="card">
        <h3>${escapeHtml(c.name)}</h3>
        <p><strong>Position:</strong> ${escapeHtml(c.position)}</p>
        <p><strong>Manifesto:</strong> ${escapeHtml(c.manifesto || '')}</p>
        ${voteButton}
      </div>`;
    }).join('');

    showSection('candidates');



  } catch(error) {


    console.log(error);


    container.innerHTML =
      '<p class="muted">Network error while loading candidates.</p>';

  }


}
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
}

/* ===========================
   VOTE
=========================== */

async function vote(candidateId, electionId, buttonEl) {
  if (!token) {
    setAuthMessage('Please login first.', 'error');
    showSection('auth-section');
    showAuth('login');
    return;
  }

  const voteBtn = buttonEl || document.querySelector(
    `.vote-btn[data-candidate-id="${candidateId}"][data-election-id="${electionId}"]`,
  );
  if (voteBtn) {
    voteBtn.disabled = true;
    voteBtn.textContent = 'Submitting...';
  }

  try {
    setSpinner(true);
    setVoteMessage('', 'info');

    const { response, data } = await safeFetchJson(API.vote, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ candidate: candidateId, election: electionId }),
    });

    if (response.ok) {
      const msg = data?.message || 'Vote successful!';
      setVoteMessage(msg, 'success');
      if (voteBtn) {
        voteBtn.textContent = 'Voted';
        voteBtn.disabled = true;
      }
      await loadCandidates(electionId);
      return;
    }

    const msg = data?.error || data?.detail || 'Vote failed.';
    setVoteMessage(msg, 'error');
    if (voteBtn) {
      voteBtn.disabled = false;
      voteBtn.textContent = 'Vote';
    }
  } catch (e) {
    setVoteMessage('Network error while voting.', 'error');
    if (voteBtn) {
      voteBtn.disabled = false;
      voteBtn.textContent = 'Vote';
    }
  } finally {
    setSpinner(false);
  }
}

// results loading uses a separate template in this project, so keep placeholder
async function loadResults() {
  const container = $('resultContainer');
  if (!container) return;
  container.innerHTML = '<p class="muted">Results are displayed on the results page.</p>';
}

// Initialize application on DOM load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

