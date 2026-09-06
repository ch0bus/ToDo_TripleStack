from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView

from .views import RegisterView, MeView, TodoViewSet, TagViewSet, ProjectViewSet

router = DefaultRouter()
router.register(r"todos", TodoViewSet, basename="todo")
router.register(r"tags", TagViewSet, basename="tag")
router.register(r"projects", ProjectViewSet, basename="project")

urlpatterns = [
    # auth
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("auth/me/", MeView.as_view(), name="auth-me"),

    # api
    path("", include(router.urls)),
]
