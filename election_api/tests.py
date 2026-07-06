from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Candidate, Election, Vote


class CastVoteViewTests(TestCase):
    def test_cast_vote_accepts_voter_id_from_request_body(self):
        user = get_user_model().objects.create_user(username='voter1', password='pass1234')
        election = Election.objects.create(
            title='Test Election',
            description='Election for testing',
            start_date='2026-01-01T00:00:00Z',
            end_date='2026-12-31T23:59:59Z',
            is_active=True,
        )
        candidate = Candidate.objects.create(
            election=election,
            name='Alice',
            manifesto='A strong leader',
        )

        response = self.client.post(
            '/api/vote/',
            {'candidate': candidate.id, 'election': election.id, 'voter': user.id},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Vote.objects.filter(voter=user, election=election).exists())
