from django.contrib import admin
from django.db.models import Count
from django.http import Http404
from django.shortcuts import render
from django.urls import path, reverse
from django.utils.html import format_html
from .models import Election, Candidate, Vote


@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'start_date', 'end_date', 'is_active', 'results_link')
    list_filter = ('is_active',)
    search_fields = ('title',)

    @admin.display(description='Results')
    def results_link(self, election):
        url = reverse('admin:election_api_election_results', args=(election.pk,))
        return format_html('<a href="{}">View results</a>', url)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:election_id>/results/',
                self.admin_site.admin_view(self.results_view),
                name='election_api_election_results',
            ),
        ]
        return custom_urls + urls

    def results_view(self, request, election_id):
        try:
            election = Election.objects.get(pk=election_id)
        except Election.DoesNotExist as error:
            raise Http404('Election not found') from error

        candidates = Candidate.objects.filter(election=election).annotate(vote_count=Count('vote'))
        positions = {}
        for candidate in candidates:
            positions.setdefault(candidate.position, []).append(candidate)

        result_groups = []
        for position, position_candidates in positions.items():
            ranked_candidates = sorted(position_candidates, key=lambda candidate: candidate.vote_count, reverse=True)
            total_votes = sum(candidate.vote_count for candidate in ranked_candidates)
            result_groups.append({
                'position': position,
                'candidates': ranked_candidates,
                'total_votes': total_votes,
            })

        context = {
            **self.admin_site.each_context(request),
            'title': f'Results: {election.title}',
            'election': election,
            'result_groups': result_groups,
            'opts': self.model._meta,
        }
        return render(request, 'admin/election_api/election/results.html', context)


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('name', 'position', 'election')
    list_filter = ('position', 'election')
    search_fields = ('name', 'position')


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    # Note: Vote model currently does NOT have a `position` field.
    # Position is derived from the related Candidate.
    list_display = ('voter_name', 'voter_email', 'candidate', 'position', 'election', 'created_at')
    list_filter = ('election', 'created_at')
    search_fields = ('voter__username', 'voter__email', 'voter__first_name', 'voter__last_name', 'candidate__name')
    ordering = ('-created_at',)
    readonly_fields = ('voter', 'candidate', 'election', 'created_at')

    @admin.display(description='Position')
    def position(self, obj):
        return obj.candidate.position


    @admin.display(description='Voter')
    def voter_name(self, vote):
        return vote.voter.get_full_name() or vote.voter.get_username()

    @admin.display(description='Email')
    def voter_email(self, vote):
        return vote.voter.email
