from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Election, Candidate, Vote
from .serializers import ElectionSerializer, VoteSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def election_results(request, election_id):
    try:
        election = Election.objects.get(id=election_id)
    except Election.DoesNotExist:
        return Response({"error": "Election not found"}, status=status.HTTP_404_NOT_FOUND)

    candidates = Candidate.objects.filter(election=election)
    results = []

    for candidate in candidates:
        vote_count = Vote.objects.filter(candidate=candidate).count()
        results.append({
            "candidate_id": candidate.id,
            "candidate_name": candidate.name,
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
@permission_classes([AllowAny])
def cast_vote(request):

    candidate_id = request.data.get('candidate')
    election_id = request.data.get('election')

    if not candidate_id or not election_id:
        return Response({"error": "candidate and election are required"}, status=status.HTTP_400_BAD_REQUEST)

    if request.data.get('voter') is not None:
        try:
            voter = get_user_model().objects.get(id=request.data.get('voter'))
        except get_user_model().DoesNotExist:
            return Response({"error": "Voter not found"}, status=status.HTTP_404_NOT_FOUND)
    elif request.user.is_authenticated:
        voter = request.user
    else:
        return Response({
            "error": "Authentication required or provide a 'voter' ID in the request body"
        }, status=status.HTTP_400_BAD_REQUEST)

    # prevent double voting
    if Vote.objects.filter(voter=voter, election_id=election_id).exists():
        return Response({"error": "You already voted in this election"}, status=status.HTTP_400_BAD_REQUEST)

    # validate candidate
    try:
        candidate = Candidate.objects.get(id=candidate_id)
    except Candidate.DoesNotExist:
        return Response({"error": "Candidate not found"}, status=status.HTTP_404_NOT_FOUND)

    # create vote
    vote = Vote.objects.create(
        voter=voter,
        candidate=candidate,
        election_id=election_id
    )

    return Response({
        "message": "Vote submitted successfully",
        "vote_id": vote.id
    }, status=status.HTTP_201_CREATED)
