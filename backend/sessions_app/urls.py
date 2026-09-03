from rest_framework.routers import DefaultRouter

from .views import MySessionsViewSet, SessionViewSet

router = DefaultRouter()
router.register("my-sessions", MySessionsViewSet, basename="my-session")
router.register("", SessionViewSet, basename="session")

urlpatterns = router.urls
