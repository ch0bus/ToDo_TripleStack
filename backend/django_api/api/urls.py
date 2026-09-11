from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView

from .views import RegisterView, MeView, TodoViewSet, TagViewSet, SubtaskViewSet

router = DefaultRouter()
router.register(r"todos", TodoViewSet, basename="todo")
router.register(r"tags", TagViewSet, basename="tag")

subtask_list = SubtaskViewSet.as_view({"get": "list", "post": "create"})
subtask_detail = SubtaskViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)

urlpatterns = [
    # auth
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("auth/me/", MeView.as_view(), name="auth-me"),

    path(
        "todos/<int:todo_pk>/subtasks/",
        subtask_list,
        name="todo-subtask-list",
    ),
    path(
        "todos/<int:todo_pk>/subtasks/<int:pk>/",
        subtask_detail,
        name="todo-subtask-detail",
    ),

    # api
    path("", include(router.urls)),
]
