"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from election_api.views_web import (
    results_page,
    admin_dashboard,
    create_election,
    manage_candidates,
    login_view,
    logout_view,
)


urlpatterns = [
    path('', TemplateView.as_view(template_name='frontend/index.html'), name='elections_page'),
    path('admin/', admin.site.urls),
    # Authentication (web pages)
    path('accounts/login/', login_view, name='login'),
    path('accounts/logout/', logout_view, name='logout'),
    path('accounts/', include('accounts.urls')),
    path('api/', include('election_api.urls')),


    # Web pages
    path('admin/elections/', admin_dashboard, name='admin_dashboard'),
    path('admin/elections/create/', create_election, name='create_election'),
    path('admin/elections/<int:election_id>/candidates/', manage_candidates, name='manage_candidates'),

    # Web page to view results (renders frontend/templates/frontend/results.html)
    path('results/<int:election_id>/', results_page, name='results_page'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]



