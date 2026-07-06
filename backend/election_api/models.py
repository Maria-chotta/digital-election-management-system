from django.db import models
from django.conf import settings


class Election(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class Candidate(models.Model):
    election = models.ForeignKey(
        Election,
        on_delete=models.CASCADE,
        related_name="candidates"
    )
    name = models.CharField(max_length=255)
    manifesto = models.TextField()

    def __str__(self):
        return self.name


class Vote(models.Model):
    voter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE)
    election = models.ForeignKey(Election, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('voter', 'election')

    def __str__(self):
        return f"{self.voter} -> {self.candidate}"
