from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated

from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken


from .models import Election, Candidate, Vote
from .serializers import ElectionSerializer



@api_view(['POST'])
@permission_classes([IsAdminUser])
def publish_results(request, election_id: int):
    """Admin endpoint to mark results as published for an election."""
    try:
        election = Election.objects.get(id=election_id)
    except Election.DoesNotExist:
        return Response({"error": "Election not found"}, status=status.HTTP_404_NOT_FOUND)

    election.results_published = True
    election.results_published_at = timezone.now()
    election.save(update_fields=["results_published", "results_published_at"])

    return Response({"message": "Results published successfully"}, status=status.HTTP_200_OK)



def user_response(user, message='Login successful!'):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'id': user.pk,
        'name': user.get_full_name() or user.get_username(),
        'email': user.email,
        'message': message,
    }



def _voting_is_open(election: Election) -> bool:
    now = timezone.now()
    return election.is_active and (election.start_date <= now) and (now <= election.end_date)


def _voting_has_ended(election: Election) -> bool:
    now = timezone.now()
    return now > election.end_date


@api_view(['POST'])
@permission_classes([AllowAny])
def register_api(request):

    """Create a voter account without requiring staff access."""
    full_name = str(request.data.get('name', '')).strip()
    email = str(request.data.get('email', '')).strip().lower()
    password = request.data.get('password', '')

    if not full_name or not email or not password:
        return Response(
            {'error': 'name, email and password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_email(email)
        validate_password(password)
    except ValidationError as error:
        return Response({'error': ' '.join(error.messages)}, status=status.HTTP_400_BAD_REQUEST)

    User = get_user_model()
    if User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).exists():
        return Response(
            {'error': 'An account with this email already exists. Please use Login instead.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    first_name, *last_name = full_name.split(maxsplit=1)
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name[0] if last_name else '',
                role='VOTER',
            )
    except IntegrityError:
        return Response(
            {'error': 'An account with this email already exists. Please use Login instead.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        user_response(user, message='Registration successful!'),
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login_api(request):
    """Authenticate a voter and return JWT tokens for the voting API."""
    email = str(request.data.get('email', '')).strip()
    password = request.data.get('password', '')

    if not email or not password:
        return Response(
            {'error': 'email and password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = get_user_model().objects.get(Q(email__iexact=email) | Q(username__iexact=email))
    except get_user_model().DoesNotExist:
        user = None
    except get_user_model().MultipleObjectsReturned:
        return Response(
            {'error': 'More than one account uses this email. Contact an administrator.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user is not None and not user.check_password(password):
        user = None

    if user is not None and not user.is_active:
        user = None
    if user is None:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    return Response(user_response(user))


@api_view(['GET'])
@permission_classes([AllowAny])
def election_candidates(request, election_id: int):
    """Return candidates for an election."""
    try:
        election = Election.objects.get(id=election_id)
    except Election.DoesNotExist:
        return Response({"error": "Election not found"}, status=status.HTTP_404_NOT_FOUND)

    candidates = Candidate.objects.filter(election=election)
    results = [
        {
            "id": c.id,
            "name": c.name,
            "position": c.position,
            "manifesto": c.manifesto,
        }
        for c in candidates
    ]

    voted_positions = []
    if request.user.is_authenticated:
        voted_positions = list(
            Vote.objects.filter(voter=request.user, election=election)
            .values_list('position', flat=True)
            .distinct()
        )

    return Response({
        "election_id": election.id,
        "election_title": election.title,
        "candidates": results,
        "voted_positions": voted_positions,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def election_results(request, election_id):
    """Return election results only after the voting period ends AND admin publishes them."""


    try:
        election = Election.objects.get(id=election_id)
    except Election.DoesNotExist:
        return Response({"error": "Election not found"}, status=status.HTTP_404_NOT_FOUND)

    if not _voting_has_ended(election):
        return Response({"error": "Results are not available yet. Voting is still ongoing."}, status=status.HTTP_403_FORBIDDEN)

    if not election.results_published:
        return Response({"error": "Results are not published by admin yet."}, status=status.HTTP_403_FORBIDDEN)

    candidates = Candidate.objects.filter(election=election)
    results = []

    for candidate in candidates:
        vote_count = Vote.objects.filter(candidate=candidate, election=election).count()
        results.append({
            "candidate_id": candidate.id,
            "candidate_name": candidate.name,
            "position": candidate.position,
            "vote_count": vote_count,
        })

    return Response({
        "election_id": election.id,
        "election_title": election.title,
        "results": results,
    })



# GET elections
@api_view(['GET'])
@permission_classes([AllowAny])
def election_list(request):
    elections = Election.objects.all()
    serializer = ElectionSerializer(elections, many=True)
    return Response(serializer.data)


# VOTE API
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cast_vote(request):

    candidate_id = request.data.get('candidate')
    election_id = request.data.get('election')

    try:
        election = Election.objects.get(id=election_id)
    except Election.DoesNotExist:
        return Response({"error": "Election not found"}, status=status.HTTP_404_NOT_FOUND)

    if not _voting_is_open(election):
        return Response({"error": "Voting is not open for this election."}, status=status.HTTP_403_FORBIDDEN)


    if not candidate_id or not election_id:
        return Response({"error": "candidate and election are required"}, status=status.HTTP_400_BAD_REQUEST)

    voter = request.user

    # The candidate must belong to the supplied election.
    try:
        candidate = Candidate.objects.get(id=candidate_id, election_id=election_id)
    except Candidate.DoesNotExist:
        return Response(
            {"error": "Candidate not found for this election"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Strong server-side prevention: check existing vote before creating.
    already_voted = Vote.objects.filter(
        voter=voter,
        election=election,
        position=candidate.position,
    ).exists()


    if already_voted:
        return Response(
            {
                "error": (
                    f"You have already voted for {candidate.position} in this election. "
                    "You can only vote once per position."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            vote = Vote.objects.create(
                voter=voter,
                candidate=candidate,
                election=election,
                position=candidate.position,
            )
    except IntegrityError:
        # Fallback in case of race-condition; DB constraint remains the final guard.
        return Response(
            {
                "error": (
                    f"You have already voted for {candidate.position} in this election. "
                    "You can only vote once per position."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "message": f"Vote successful! You voted for {candidate.name} ({candidate.position}).",
            "candidate_name": candidate.name,
            "candidate_position": candidate.position,
            "vote_id": vote.id,
        },
        status=status.HTTP_201_CREATED,
    )

