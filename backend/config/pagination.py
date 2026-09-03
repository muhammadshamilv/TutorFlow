from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """
    Page-based pagination applied to every list endpoint by default.

    Without this, listing all of a tutor's students/sessions returns
    every row from the database in one response — fine with 5 records,
    but slow to query, slow to serialize, and slow to render once a
    tutor has hundreds of students or sessions. Paginating keeps each
    request's DB query (via LIMIT/OFFSET) and JSON payload small and
    constant-size regardless of how much data exists overall.
    """

    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "current_page": self.page.number,
                "page_size": self.get_page_size(self.request),
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )
