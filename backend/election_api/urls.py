from django.urls import path
from .views import election_list, cast_vote, election_results, login_api, register_api

urlpatterns = [
    path('auth/login/', login_api),
    path('auth/register/', register_api),
    path('elections/', election_list),
    path('vote/', cast_vote),
    path('results/<int:election_id>/', election_results),
]
