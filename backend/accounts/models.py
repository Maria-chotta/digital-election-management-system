from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('OFFICER', 'Election Officer'),
        ('VOTER', 'Voter'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='VOTER')

    def __str__(self):
        return f"{self.username} ({self.role})"
