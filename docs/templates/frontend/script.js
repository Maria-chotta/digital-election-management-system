console.log("SCRIPT FILE LOADED SUCCESSFULLY");
/* =====================================
   DIGITAL ELECTION MANAGEMENT SYSTEM
   FRONTEND JAVASCRIPT (STATIC)
===================================== */



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

function setAuthMessage(message, type = 'info') {
  const el = $('authMessage');
  if (!el) return;
  if (!message) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }

  el.textContent = message;
  el.classList.remove('success', 'error', 'info');
  el.classList.add(type);
  el.style.display = 'block';
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
      setAuthMessage('Registration successful! Logging you in...', 'success');
      // Save token and auto-login
      const access = data?.access;
      if (access) {
        token = access;
        localStorage.setItem('token', token);
        setTimeout(() => {
          checkAuth();
        }, 1000);
      } else {
        if ($('authEmail')) $('authEmail').value = email;
        setTimeout(() => showAuth('login'), 1000);
      }
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
      setAuthMessage('Login successful! Redirecting...', 'success');

      window.setTimeout(() => {
        checkAuth();
      }, 1000);
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



    const candidates =
      data.candidates || [];



    if (!candidates.length) {


      container.innerHTML =
        '<p class="muted">No candidates found.</p>';


      showSection('candidates');

      return;

    }



    container.innerHTML = candidates.map(c => `


      <div class="card">


        <h3>
          ${escapeHtml(c.name)}
        </h3>



        <p>
          <strong>Position:</strong>
          ${escapeHtml(c.position)}
        </p>



        <p>
          <strong>Manifesto:</strong>
          ${escapeHtml(c.manifesto || '')}
        </p>



        <button
          class="vote-btn"
          onclick="vote(${c.id}, ${electionId})">

          Vote

        </button>



      </div>



    `).join('');



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

async function vote(candidateId, electionId) {
  if (!token) {
    setAuthMessage('Please login first.', 'error');
    openLogin();
    return;
  }

  try {
    setSpinner(true);

    const { response, data } = await safeFetchJson(API.vote, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ candidate: candidateId, election: electionId }),
    });

    if (response.ok) {
      setAuthMessage(data?.message || 'Vote submitted successfully!', 'success');
      return;
    }

    setAuthMessage(data?.error || data?.detail || 'Vote failed.', 'error');
  } catch (e) {
    setAuthMessage('Network error while voting.', 'error');
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

