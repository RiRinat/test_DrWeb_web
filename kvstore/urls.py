# urls.py
from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static



app_name = "kvstore"

urlpatterns = [
    path('command/', views.CommandView.as_view(), name='command'),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
