from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    RegisterView,
    MeView,
    TodoViewSet,
    TagViewSet,
    SubtaskViewSet,
    ShiftKindViewSet,
    ShiftLayerViewSet,
    ShiftPatternView,
    ShiftDaysView,
    ShiftDayDetailView,
    DayNotesView,
    DayNoteDetailView,
)

router = DefaultRouter()
router.register(r"todos", TodoViewSet, basename="todo")
router.register(r"tags", TagViewSet, basename="tag")
router.register(r"shift-layers", ShiftLayerViewSet, basename="shift-layer")
router.register(r"shift-kinds", ShiftKindViewSet, basename="shift-kind")

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
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
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

    path("shift-pattern/", ShiftPatternView.as_view(), name="shift-pattern"),
    path("shift-days/", ShiftDaysView.as_view(), name="shift-days"),
    path(
        "shift-days/<str:day>/",
        ShiftDayDetailView.as_view(),
        name="shift-day-detail",
    ),
    path("day-notes/", DayNotesView.as_view(), name="day-notes"),
    path(
        "day-notes/<str:day>/",
        DayNoteDetailView.as_view(),
        name="day-note-detail",
    ),
    # api
    path("", include(router.urls)),
]
