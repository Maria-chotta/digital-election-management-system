from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.contrib.auth import get_user_model
from .models import Election, Candidate, Vote
from datetime import datetime

User = get_user_model()


def login_view(request):
    """User login page."""
    if request.method == 'POST':
        # "ID" field in the UI maps to Django's username for fast compatibility.
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('elections_page')
        else:
            messages.error(request, 'Invalid credentials')
    return render(request, 'frontend/login.html')


def logout_view(request):
    """User logout."""
    logout(request)
    return redirect('login')


@login_required(login_url='login')
def elections_page(request):
    """Main elections page with voting interface."""
    return render(request, 'frontend/elections.html')


@login_required(login_url='login')
def admin_dashboard(request):
    """Admin dashboard for managing elections and candidates."""
    elections = Election.objects.all()
    context = {
        'elections': elections,
        'total_elections': elections.count(),
        'active_elections': elections.filter(is_active=True).count(),
    }
    return render(request, 'frontend/admin_dashboard.html', context)



@login_required(login_url='login')
def create_election(request):
    """Create a new election."""
    if not request.user.is_staff:
        messages.error(request, 'Permission denied')
        return redirect('elections_page')
    
    if request.method == 'POST':
        title = request.POST.get('title')
        description = request.POST.get('description')
        start_date = request.POST.get('start_date')
        end_date = request.POST.get('end_date')
        
        election = Election.objects.create(
            title=title,
            description=description,
            start_date=start_date,
            end_date=end_date,
            is_active=True
        )
        messages.success(request, f'Election "{title}" created successfully')
        return redirect('admin_dashboard')
    
    return render(request, 'frontend/create_election.html')


@login_required(login_url='login')
def manage_candidates(request, election_id):
    """Manage candidates for an election."""
    election = get_object_or_404(Election, id=election_id)
    
    if not request.user.is_staff:
        messages.error(request, 'Permission denied')
        return redirect('elections_page')
    
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'add':
            name = request.POST.get('name')
            manifesto = request.POST.get('manifesto')
            Candidate.objects.create(
                election=election,
                name=name,
                position=request.POST.get('position', 'General'),
                manifesto=manifesto,
            )
            messages.success(request, f'Candidate "{name}" added')
        
        elif action == 'delete':
            candidate_id = request.POST.get('candidate_id')
            Candidate.objects.get(id=candidate_id, election_id=election_id).delete()
            messages.success(request, 'Candidate deleted')
        
        return redirect('manage_candidates', election_id=election_id)
    
    candidates = election.candidates.all()
    context = {'election': election, 'candidates': candidates}
    return render(request, 'frontend/manage_candidates.html', context)


@login_required(login_url='login')
def results_page(request, election_id=None):
    """View election results with statistics."""
    if election_id:
        election = get_object_or_404(Election, id=election_id)
        elections = [election]
    else:
        elections = Election.objects.all()
    
    results_data = []
    for election in elections:
        candidates = election.candidates.all()
        total_votes = Vote.objects.filter(election=election).count()
        
        candidates_list = []
        for candidate in candidates:
            vote_count = Vote.objects.filter(candidate=candidate).count()
            percentage = (vote_count / total_votes * 100) if total_votes > 0 else 0
            candidates_list.append({
                'name': candidate.name,
                'vote_count': vote_count,
                'percentage': round(percentage, 2),
                'manifesto': candidate.manifesto
            })
        
        results_data.append({
            'election': election,
            'candidates': sorted(candidates_list, key=lambda x: x['vote_count'], reverse=True),
            'total_votes': total_votes
        })
    
    context = {
        'results_data': results_data,
        'election_id': election_id,
    }
    return render(request, 'frontend/results.html', context)
