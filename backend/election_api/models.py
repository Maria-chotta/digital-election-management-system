from django.db import models
from django.conf import settings


class Election(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    results_published = models.BooleanField(default=False)
    results_published_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title



class Candidate(models.Model):
    election = models.ForeignKey(
        Election,
        on_delete=models.CASCADE,
        related_name="candidates"
    )

    name = models.CharField(max_length=255)
    position = models.CharField(
        max_length=100,
        default='General'
    )

    manifesto = models.TextField()

    def __str__(self):
        return self.name




class Vote(models.Model):

    voter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE
    )

    # Store position denormalized from the related Candidate.
    # This avoids constraints referencing derived fields like `candidate__position`.
    position = models.CharField(max_length=100, default='General')

    election = models.ForeignKey(
        Election,
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            # One vote per voter per election position (e.g., President vs Representative)
            # This prevents voting for both positions in the same election.
            models.UniqueConstraint(
                fields=['voter', 'election', 'position'],
                name='one_vote_per_voter_per_election_position',
            ),
        ]

    def save(self, *args, **kwargs):
        if self.candidate_id:
            # Keep Vote.position consistent with the selected Candidate.
            self.position = self.candidate.position
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.voter} -> {self.candidate}"

