// API Configuration
// Update this if your backend runs on a different host or port.
const API_BASE_URL = window.location.origin;
const API_ENDPOINTS = {
    login: `${API_BASE_URL}/api/auth/login/`,
    register: `${API_BASE_URL}/api/auth/register/`,
    elections: `${API_BASE_URL}/api/elections/`,
    vote: `${API_BASE_URL}/api/vote/`,
    results: function(electionId) {
        return API_BASE_URL + '/api/results/' + electionId + '/';
    }
};

// Local candidates array (will be populated from API)
let candidates = [];
let currentElectionId = null;

// Current user and voting state
let currentUser = null;
let authToken = sessionStorage.getItem('electionAuthToken');
let selectedCandidates = {};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCandidates();
});

// Show different sections
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(function(section) {
        section.classList.remove('active');
    });

    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
        window.scrollTo(0, 0);
    }
}

function showWelcome() {
    currentUser = null;
    selectedCandidates = {};
    showSection('welcome');
}

function showLogin() {
    showSection('login');
}

function showRegister() {
    showSection('register');
}

function showVoting() {
    showSection('voting');
}

function showAbout() {
    showSection('about');
}

function showSuccess() {
    showSection('success');
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();

    const voterId = document.getElementById('voterId').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!voterId || !password) {
        alert('Please fill in all fields.');
        return;
    }

    try {
        const response = await fetch(API_ENDPOINTS.login, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: voterId, password: password})
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Unable to log in');
        }

        authToken = data.token;
        sessionStorage.setItem('electionAuthToken', authToken);
        currentUser = {id: data.id, name: data.name || voterId, email: data.email || voterId};
        document.getElementById('loginForm').reset();
        showVoting();
    } catch (error) {
        alert(error.message);
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    if (password !== passwordConfirm) {
        alert('Passwords do not match.');
        return;
    }

    try {
        const response = await fetch(API_ENDPOINTS.register, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: name, email: email, password: password})
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Unable to create your account');
        }

        authToken = data.token;
        sessionStorage.setItem('electionAuthToken', authToken);
        currentUser = {id: data.id, name: data.name, email: data.email};
        document.getElementById('registerForm').reset();
        alert(`Registration complete. Your voter ID is ${data.id}.`);
        showVoting();
    } catch (error) {
        alert(error.message);
    }
}

// Load candidates from API
async function loadCandidates() {
    try {
        const response = await fetch(API_ENDPOINTS.elections);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const elections = Array.isArray(data) ? data : [];

        if (elections.length > 0) {
            var activeElection = null;
            for (var i = 0; i < elections.length; i += 1) {
                if (elections[i].is_active) {
                    activeElection = elections[i];
                    break;
                }
            }
            if (!activeElection && elections.length > 0) {
                activeElection = elections[0];
            }
            currentElectionId = activeElection.id || null;
            candidates = [];

            if (Array.isArray(activeElection.candidates) && activeElection.candidates.length > 0) {
                candidates = activeElection.candidates.map(function(candidate) {
                    return {
                        id: candidate.id,
                        name: candidate.name,
                        position: candidate.position || 'General',
                        party: candidate.party || candidate.manifesto || 'Representative',
                        votes: candidate.votes || candidate.vote_count || 0,
                        manifesto: candidate.manifesto || ''
                    };
                });
            }
        }

        renderCandidates();
    } catch (error) {
        console.error('Error loading candidates:', error);
        candidates = [];
        currentElectionId = null;
        renderCandidates();
    }
}

// Render candidates for voting
function renderCandidates() {
    const container = document.getElementById('candidatesContainer');
    container.innerHTML = '';

    if (candidates.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280;">No candidates available.</p>';
        return;
    }

    const byPosition = candidates.reduce(function(groups, candidate) {
        const position = candidate.position || 'General';
        (groups[position] = groups[position] || []).push(candidate);
        return groups;
    }, {});

    Object.keys(byPosition).forEach(function(position) {
        const group = document.createElement('section');
        group.className = 'candidate-position-group';
        const heading = document.createElement('h3');
        heading.textContent = position;
        group.appendChild(heading);
        const grid = document.createElement('div');
        grid.className = 'candidates-grid';

        byPosition[position].forEach(function(candidate) {
            const candidateCard = document.createElement('label');
            candidateCard.className = 'candidate-card';
            candidateCard.id = `candidate-${candidate.id}`;
            candidateCard.dataset.position = position;
            candidateCard.innerHTML = `<input type="radio" name="candidate-${position}" value="${candidate.id}"><div class="candidate-name"></div><div class="candidate-party"></div>`;
            candidateCard.querySelector('.candidate-name').textContent = candidate.name;
            candidateCard.querySelector('.candidate-party').textContent = candidate.party;
            candidateCard.querySelector('input').addEventListener('change', function() {
                selectCandidate(candidate.id, position);
            });
            grid.appendChild(candidateCard);
        });
        group.appendChild(grid);
        container.appendChild(group);
    });
}

// Select candidate
function selectCandidate(candidateId, position) {
    document.querySelectorAll(`[data-position="${position}"]`).forEach(function(card) {
        card.classList.remove('selected');
    });

    const selectedCard = document.getElementById(`candidate-${candidateId}`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        selectedCard.dataset.position = position;
    }

    selectedCandidates[position] = candidateId;
}

// Submit vote to API
async function submitVote() {
    if (Object.keys(selectedCandidates).length === 0) {
        alert('Please select at least one candidate before submitting your votes.');
        return;
    }

    if (!currentUser) {
        alert('Please login first.');
        showLogin();
        return;
    }

    if (!authToken) {
        alert('Your login session has expired. Please log in again.');
        currentUser = null;
        showLogin();
        return;
    }

    if (!currentElectionId) {
        alert('Election information is not loaded yet. Please refresh the page.');
        return;
    }

    try {
        const chosenCandidates = Object.values(selectedCandidates).map(function(candidateId) {
            return candidates.find(function(candidate) { return candidate.id === candidateId; });
        }).filter(Boolean);

        for (const candidate of chosenCandidates) {
            const response = await fetch(API_ENDPOINTS.vote, {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Authorization': `Token ${authToken}`},
                body: JSON.stringify({candidate: candidate.id, election: currentElectionId})
            });
            const responseText = await response.text();
            if (!response.ok) {
                if (response.status === 401) {
                    sessionStorage.removeItem('electionAuthToken');
                    authToken = null;
                    currentUser = null;
                    showLogin();
                }
                throw new Error(`HTTP ${response.status}: ${responseText}`);
            }
        }

        document.getElementById('voteConfirmation').textContent = `Votes submitted for: ${chosenCandidates.map(function(candidate) { return candidate.position + ' — ' + candidate.name; }).join(', ')}`;

        selectedCandidates = {};
        currentUser = null;
        showSuccess();

        document.getElementById('loginForm').reset();
        document.querySelectorAll('.candidate-card').forEach(function(card) {
            card.classList.remove('selected');
        });
        document.querySelectorAll('input[type="radio"]').forEach(function(radio) {
            radio.checked = false;
        });

    } catch (error) {
        console.error('Error submitting vote:', error);

        let message = `Error submitting vote:\n${error.message}`;
        if (error.message && error.message.toLowerCase().includes('networkerror')) {
            message += `\n\nUnable to reach the backend API at ${API_ENDPOINTS.vote}.`;
            message += `\nMake sure the server is running and CORS is configured if using a local frontend server.`;
        }
        message += `\n\nCheck the browser console (F12) for more details.`;

        alert(message);
    }
}

// Load results from API
async function loadResults() {
    try {
        if (!currentElectionId) {
            await loadCandidates();
        }

        if (!currentElectionId) {
            throw new Error('No election is available to load results.');
        }

        var response = await fetch(API_ENDPOINTS.results(currentElectionId));
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }

        var data = await response.json();

        if (data.results) {
            currentElectionId = currentElectionId || data.election_id || null;
            candidates = data.results.map(function(item) {
                return {
                    id: item.candidate_id || item.id,
                    name: item.candidate_name || item.name,
                    position: item.position || 'General',
                    party: item.party || item.manifesto || 'Candidate',
                    votes: item.vote_count || item.votes || 0,
                    manifesto: item.manifesto || ''
                };
            });
        } else if (Array.isArray(data)) {
            candidates = data.map(function(item) {
                return {
                    id: item.id,
                    name: item.name,
                    position: item.position || 'General',
                    party: item.party || item.manifesto || 'Candidate',
                    votes: item.votes || 0,
                    manifesto: item.manifesto || ''
                };
            });
        } else if (data.candidates) {
            currentElectionId = currentElectionId || data.election_id || null;
            candidates = data.candidates.map(function(item) {
                return {
                    id: item.id,
                    name: item.name,
                    position: item.position || 'General',
                    party: item.party || item.manifesto || 'Candidate',
                    votes: item.vote_count || item.votes || 0,
                    manifesto: item.manifesto || ''
                };
            });
        }

        renderResults();
    } catch (error) {
        console.error('Error loading results:', error);
        try {
            var fallbackResponse = await fetch(API_ENDPOINTS.elections);
            if (fallbackResponse.ok) {
                var fallbackData = await fallbackResponse.json();
                candidates = Array.isArray(fallbackData) ? fallbackData : fallbackData.candidates || [];
                renderResults();
                return;
            }
        } catch (err) {
            console.warn('Could not load results from API');
        }
        renderResults();
    }
}

// Render results
function renderResults() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';

    if (candidates.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280;">No results available yet.</p>';
        return;
    }

    var totalVotes = 0;
    for (var i = 0; i < candidates.length; i += 1) {
        totalVotes += candidates[i].votes || 0;
    }
    var sortedCandidates = candidates.slice();
    sortedCandidates.sort(function(a, b) {
        return (b.votes || 0) - (a.votes || 0);
    });

    sortedCandidates.forEach(function(candidate, index) {
        const votes = candidate.votes || 0;
        const percentage = totalVotes > 0 ? (votes / totalVotes * 100).toFixed(1) : 0;
        
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        
        resultCard.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary-color);">
                    #${index + 1}
                </div>
                <div>
                    <div class="result-candidate-name">${candidate.name}</div>
                    <div class="result-party">${candidate.party || 'Independent'}</div>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%;">
                    ${percentage}%
                </div>
            </div>
            <div class="vote-count">${votes} votes</div>
        `;

        container.appendChild(resultCard);
    });

    const totalDiv = document.createElement('div');
    totalDiv.innerHTML = `
        <div style="text-align: center; margin-top: 2rem; padding: 1rem; 
                    background: #f0f9ff; border-radius: 8px;">
            <strong style="font-size: 1.1rem;">Total Votes Cast: ${totalVotes}</strong>
        </div>
    `;
    container.appendChild(totalDiv);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        showWelcome();
    }
});

// Debug functionality removed per user request
