from django.urls import path
from .views import (
    election_list,
    cast_vote,
    election_results,
    login_api,
    register_api,
    publish_results,
    election_candidates,
)

from rest_framework_simplejwt.views import TokenRefreshView


urlpatterns = [

    path('auth/login/', login_api),
    path('auth/register/', register_api),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('elections/', election_list),
    path('vote/', cast_vote),
    path('results/<int:election_id>/', election_results),
    path('elections/<int:election_id>/candidates/', election_candidates),
    path('elections/<int:election_id>/publish-results/', publish_results),
]

