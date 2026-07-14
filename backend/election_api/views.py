from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import Election, Candidate, Vote
from .serializers import ElectionSerializer


def user_response(user):
    token, _ = Token.objects.get_or_create(user=user)
    return {
        'token': token.key,
        'id': user.pk,
        'name': user.get_full_name() or user.get_username(),
        'email': user.email,
    }


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

    return Response(user_response(user), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_api(request):
    """Authenticate a voter and return a token for the voting API."""
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
@permission_classes([IsAdminUser])
def election_results(request, election_id):
    # Only Django staff/admin users can access election results.
    # Non-admin users receive 403 Forbidden automatically.

    try:
        election = Election.objects.get(id=election_id)
    except Election.DoesNotExist:
        return Response({"error": "Election not found"}, status=status.HTTP_404_NOT_FOUND)

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

    try:
        with transaction.atomic():
            vote = Vote.objects.create(
                voter=voter,
                candidate=candidate,
                election_id=election_id,
                position=candidate.position,
            )
    except IntegrityError:
        return Response(
            {"error": f"You already voted for {candidate.position}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({
        "message": "Vote submitted successfully",
        "vote_id": vote.id
    }, status=status.HTTP_201_CREATED)
