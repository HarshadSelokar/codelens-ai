
##
---
``
supabase.rpc(
  "match_code_chunks",
  {
    "query_embedding": query_embedding,
    "match_threshold": 0.75,
    "match_count": 5,
    "project_id": project_id
  }
)
---