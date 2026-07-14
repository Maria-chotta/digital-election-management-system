import os
import sys
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from election_api.models import Election, Candidate


def create_sample_election():
    title = 'Student Representative Election'
    now = datetime.now()
    election, created = Election.objects.get_or_create(
        title=title,
        defaults={
            'description': 'Sample election generated for local development',
            'start_date': now - timedelta(days=1),
            'end_date': now + timedelta(days=7),
            'is_active': True,
        }
    )

    if not created:
        print('Sample election already exists — updating candidate names.')
        election.description = 'Sample election generated for local development'
        election.start_date = now - timedelta(days=1)
        election.end_date = now + timedelta(days=7)
        election.is_active = True
        election.save()
        election.candidates.all().delete()

    candidates = [
        {
            'name': 'MARIAM PASCHAL ANTHONY',
            'manifesto': 'President'
        },
        {
            'name': 'DEBORA MICHAEL SAMWEL',
            'manifesto': 'Vice President'
        },
        {
            'name': 'REBECA FAUSTINE MPINZILE',
            'manifesto': 'Degree Representative'
        },
        {
            'name': 'MALIK MOHD ALI',
            'manifesto': 'Diploma Representative'
        },
        {
            'name': 'ANNA LUSAJO JOHN',
            'manifesto': 'Secretary General'
        },
        {
            'name': 'QUEEN JOAAS SAMSON',
            'manifesto': 'Treasurer'
        },
        {
            'name': 'GRACE GASTON FESTO',
            'manifesto': 'Publicity Officer'
        },
        {
            'name': 'WALLEN VICENTH SASI',
            'manifesto': 'Student Welfare Officer'
        }
    ]

    for candidate_data in candidates:
        Candidate.objects.create(
            election=election,
            name=candidate_data['name'],
            manifesto=candidate_data['manifesto']
        )

    print(f'Created sample election "{election.title}" with {len(candidates)} candidates.')


if __name__ == '__main__':
    try:
        create_sample_election()
    except Exception as e:
        print('Error creating sample data:', e)
        print('Make sure you have applied migrations and the database is configured.')
