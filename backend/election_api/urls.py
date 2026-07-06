from django.urls import path
from .views import election_list, cast_vote, election_results

urlpatterns = [
    path('elections/', election_list),
    path('vote/', cast_vote),
    path('results/<int:election_id>/', election_results),
]
