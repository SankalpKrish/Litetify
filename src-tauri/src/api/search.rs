use super::req::{get_json, query_params, to_refs, Recommendations, SearchResult};

#[tauri::command]
pub async fn api_search(
    client_id: String,
    query: String,
    types: String,
    limit: Option<i32>,
    offset: Option<i32>,
    market: Option<String>,
) -> Result<SearchResult, String> {
    let mut params = query_params(limit, offset);
    if let Some(ref m) = market {
        params.insert(0, ("market", m.clone()));
    }
    params.insert(0, ("type", types));
    params.insert(0, ("q", query));
    let refs = to_refs(&params);
    get_json(&client_id, "/search", &refs).await
}

#[tauri::command]
pub async fn api_get_recommendations(
    client_id: String,
    seed_artists: Option<String>,
    seed_tracks: Option<String>,
    seed_genres: Option<String>,
    limit: Option<i32>,
) -> Result<Recommendations, String> {
    let mut params: Vec<(&str, String)> = Vec::new();
    if let Some(a) = seed_artists {
        params.push(("seed_artists", a));
    }
    if let Some(t) = seed_tracks {
        params.push(("seed_tracks", t));
    }
    if let Some(g) = seed_genres {
        params.push(("seed_genres", g));
    }
    params.push(("limit", limit.unwrap_or(10).to_string()));
    let refs = to_refs(&params);
    get_json(&client_id, "/recommendations", &refs).await
}
