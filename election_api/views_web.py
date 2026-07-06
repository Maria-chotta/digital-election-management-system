from django.shortcuts import render

def elections_page(request):
    return render(request, 'frontend/elections.html')