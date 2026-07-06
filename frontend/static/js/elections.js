function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

async function fetchJSON(url, opts = {}){
    const res = await fetch(url, opts);
    if (!res.ok) {
        const text = await res.text().catch(()=>"");
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
}

function createCandidateNode(candidate, electionId, voterIdInput){
    const wrap = document.createElement('div');
    wrap.className = 'candidate';

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${candidate.candidate_name || candidate.name} — ${candidate.vote_count != null ? candidate.vote_count + ' votes' : ''}`;

    const btn = document.createElement('button');
    btn.textContent = 'Vote';
    btn.onclick = async () => {
        btn.disabled = true;
        const payload = {candidate: candidate.candidate_id || candidate.id, election: electionId};
        const voterVal = parseInt(voterIdInput.value || '') || null;
        if (voterVal) payload.voter = voterVal;

        try{
            const csrftoken = getCookie('csrftoken');
            await fetchJSON('/api/vote/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrftoken ? {'X-CSRFToken': csrftoken} : {})
                },
                body: JSON.stringify(payload),
                credentials: 'same-origin'
            });
            btn.textContent = 'Voted';
            btn.disabled = true;
            // update results for this election
            const resultsBtn = wrap.closest('.election').querySelector('.show-results');
            if (resultsBtn) resultsBtn.click();
        }catch(err){
            btn.disabled = false;
            alert('Vote failed: '+err.message);
        }
    };

    wrap.appendChild(meta);
    wrap.appendChild(btn);
    return wrap;
}

async function renderElection(election, container, template, voterIdInput){
    const node = template.content.cloneNode(true);
    const article = node.querySelector('.election');
    article.querySelector('.title').textContent = election.title;
    article.querySelector('.desc').textContent = election.description || '';

    const candidatesDiv = article.querySelector('.candidates');
    candidatesDiv.innerHTML = '<p class="c-loading">Loading candidates…</p>';

    const resultsBtn = article.querySelector('.show-results');
    resultsBtn.addEventListener('click', async (e)=>{
        e.target.disabled = true;
        try{
            const data = await fetchJSON(`/api/results/${election.id}/`);
            candidatesDiv.innerHTML = '';
            if (!data.results || !data.results.length){
                candidatesDiv.innerHTML = '<p class="c-loading">No candidates available.</p>';
            }
            data.results.forEach(c => {
                const cnode = createCandidateNode(c, election.id, voterIdInput);
                candidatesDiv.appendChild(cnode);
            });
        }catch(err){
            candidatesDiv.innerHTML = `<div class="notice error">Failed to load candidates: ${err.message}</div>`;
        }finally{
            e.target.disabled = false;
        }
    });

    container.appendChild(node);
}

document.addEventListener('DOMContentLoaded', async ()=>{
    const list = document.getElementById('elections');
    const template = document.getElementById('election-template');
    const voterIdInput = document.getElementById('voterId');

    try{
        const elections = await fetchJSON('/api/elections/');
        list.innerHTML = '';
        if (!elections || !elections.length){
            list.innerHTML = '<p class="loading">No elections found.</p>';
            return;
        }
        elections.forEach(e => renderElection(e, list, template, voterIdInput));
    }catch(err){
        list.innerHTML = `<div class="notice error">Unable to load elections: ${err.message}</div>`;
    }
});
