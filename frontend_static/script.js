// API Configuration
// Update this if your backend runs on a different host or port.
const API_BASE_URL = 'http://localhost:8000';
const API_ENDPOINTS = {
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
let selectedCandidate = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCandidates();
    // Do not load results on page load; only load when admin clicks.
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
    selectedCandidate = null;
    showSection('welcome');
}

function showLogin() {
    showSection('login');
}

function showVoting() {
    showSection('voting');
}

async function showResults() {
    // Frontend gate: only show for admin users.
    // Backend still enforces permissions.
    if (!currentUser || !currentUser.is_staff) {
        alert('Permission denied');
        showWelcome();
        return;
    }

    try {
        await loadResults();
        showSection('results');
    } catch (e) {
        // loadResults may throw if backend blocks access
        alert('Permission denied');
        showWelcome();
    }
}

function showAbout() {
    showSection('about');
}

function showSuccess() {
    showSection('success');
}

// Handle login
function handleLogin(event) {
    event.preventDefault();

    const voterId = document.getElementById('voterId').value.trim();
    const password = document.getElementById('password').value.trim();

    if (voterId && password) {
        const numericId = /^[0-9]+$/.test(voterId) ? parseInt(voterId, 10) : null;

        // If using the real backend auth, currentUser should come from API.
        // For this static frontend, we keep a minimal user object.
        // Admin gate relies on `is_staff`.
        currentUser = {
            voterId: voterId,
            id: numericId,
            name: numericId ? `Student ${numericId}` : voterId,
            // Static frontend cannot know staff status reliably.
            // Keep button hidden by default; admin should rely on backend permission.
            is_staff: false
        };

        const adminBtn = document.getElementById('adminResultsBtn');
        if (adminBtn) adminBtn.style.display = 'none';

        document.getElementById('loginForm').reset();
        showVoting();
    } else {
        alert('Please fill in all fields.');
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
                        party: candidate.party || candidate.manifesto || 'Representative',
                        votes: candidate.votes || candidate.vote_count || 0,
                        manifesto: candidate.manifesto || ''
                    };
                });
            }
        }

        if (candidates.length === 0) {
            currentElectionId = currentElectionId || 1;
            candidates = [
                { id: 1, name: 'MARIAM PASCHAL ANTHONY', party: 'President', votes: 420 },
                { id: 2, name: 'DEBORA MICHAEL SAMWEL', party: 'Vice President', votes: 375 },
                { id: 3, name: 'REBECA FAUSTINE MPINZILE', party: 'Degree Representative', votes: 298 },
                { id: 4, name: 'MALIK MOHD ALI', party: 'Diploma Representative', votes: 210 },
                { id: 5, name: 'ANNA LUSAJO JOHN', party: 'Secretary General', votes: 180 },
                { id: 6, name: 'QUEEN JOAAS SAMSON', party: 'Treasurer', votes: 155 },
                { id: 7, name: 'GRACE GASTON FESTO', party: 'Publicity Officer', votes: 130 },
                { id: 8, name: 'WALLEN VICENTH SASI', party: 'Student Welfare Officer', votes: 105 }
            ];
        }

        renderCandidates();
    } catch (error) {
        console.error('Error loading candidates:', error);

        candidates = [
            { id: 1, name: 'MARIAM PASCHAL ANTHONY', party: 'President', votes: 420 },
            { id: 2, name: 'DEBORA MICHAEL SAMWEL', party: 'Vice President', votes: 375 },
            { id: 3, name: 'REBECA FAUSTINE MPINZILE', party: 'Degree Representative', votes: 298 },
            { id: 4, name: 'MALIK MOHD ALI', party: 'Diploma Representative', votes: 210 },
            { id: 5, name: 'ANNA LUSAJO JOHN', party: 'Secretary General', votes: 180 },
            { id: 6, name: 'QUEEN JOAAS SAMSON', party: 'Treasurer', votes: 155 },
            { id: 7, name: 'GRACE GASTON FESTO', party: 'Publicity Officer', votes: 130 },
            { id: 8, name: 'WALLEN VICENTH SASI', party: 'Student Welfare Officer', votes: 105 }
        ];
        renderCandidates();
        console.warn('Using fallback student representative data');
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

    candidates.forEach(function(candidate) {
        const candidateCard = document.createElement('div');
        candidateCard.className = 'candidate-card';
        candidateCard.id = `candidate-${candidate.id}`;
        
        candidateCard.innerHTML = `
            <div>
                <input type="radio" name="candidate" value="${candidate.id}" 
                    onchange="selectCandidate(${candidate.id})">
                <div class="candidate-name">${candidate.name}</div>
                <div class="candidate-party">${candidate.party}</div>
            </div>
        `;

        container.appendChild(candidateCard);
    });
}

// Select candidate
function selectCandidate(candidateId) {
    document.querySelectorAll('.candidate-card').forEach(function(card) {
        card.classList.remove('selected');
    });

    const selectedCard = document.getElementById(`candidate-${candidateId}`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }

    selectedCandidate = candidateId;
}

// Submit vote to API
async function submitVote() {
    if (!selectedCandidate) {
        alert('Please select a candidate before submitting your vote.');
        return;
    }

    if (!currentUser) {
        alert('Please login first.');
        showLogin();
        return;
    }

    if (!currentElectionId) {
        alert('Election information is not loaded yet. Please refresh the page.');
        return;
    }

    var candidate = null;
    for (var i = 0; i < candidates.length; i += 1) {
        if (candidates[i].id === selectedCandidate) {
            candidate = candidates[i];
            break;
        }
    }
    const payload = {
        candidate: selectedCandidate,
        election: currentElectionId
    };

    if (currentUser.id !== null && currentUser.id !== undefined) {
        payload.voter = currentUser.id;
    } else {
        payload.voter = currentUser.voterId;
    }

    try {
        const response = await fetch(API_ENDPOINTS.vote, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            result = responseText;
        }

        if (!response.ok) {
            // Backend error is: "You already voted for <position>".
            if (response.status === 400 && responseText && responseText.toLowerCase().includes('you already voted')) {
                throw new Error(responseText);
            }
            throw new Error(`HTTP ${response.status}: ${responseText}`);
        }



        document.getElementById('voteConfirmation').innerHTML = `
            <strong>Vote for: ${candidate.name}</strong><br>
            Party: ${candidate.party}
        `;

        selectedCandidate = null;
        currentUser = null;
        showSuccess();

        document.getElementById('loginForm').reset();
        document.querySelectorAll('.candidate-card').forEach(function(card) {
            card.classList.remove('selected');
        });
        document.querySelectorAll('input[name="candidate"]').forEach(function(radio) {
            radio.checked = false;
        });

        setTimeout(loadResults, 1000);
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
    if (!currentUser || !currentUser.is_staff) {
        throw new Error('Permission denied');
    }

    try {
        if (!currentElectionId) {
            await loadCandidates();
        }

        if (!currentElectionId) {
            throw new Error('No election is available to load results.');
        }

        // Admin-only endpoint; expect 403 for non-admin.
        var response = await fetch(API_ENDPOINTS.results(currentElectionId));
        if (response.status === 403) {
            throw new Error('Permission denied');
        }
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
