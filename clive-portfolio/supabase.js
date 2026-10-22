/* =========================================================
   Supabase client + data helpers.
   Nothing here needs editing — configure Config.js instead.
   ========================================================= */

const isSupabaseConfigured =
  typeof SUPABASE_CONFIG !== "undefined" &&
  SUPABASE_CONFIG.url &&
  SUPABASE_CONFIG.anonKey &&
  !SUPABASE_CONFIG.url.includes("YOUR_SUPABASE") &&
  !SUPABASE_CONFIG.anonKey.includes("YOUR_SUPABASE");

let supabaseClient = null;
if (isSupabaseConfigured && window.supabase) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
  );
}

async function fetchProjects() {
  if (!supabaseClient) {
    return { data: SITE_CONTENT.fallbackProjects, error: null, usedFallback: true };
  }
  try {
    const { data, error } = await supabaseClient
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      return { data: SITE_CONTENT.fallbackProjects, error: null, usedFallback: true };
    }
    return { data, error: null, usedFallback: false };
  } catch (err) {
    console.warn("Supabase fetchProjects failed, showing fallback projects:", err.message);
    return { data: SITE_CONTENT.fallbackProjects, error: err, usedFallback: true };
  }
}

async function submitContactMessage({ name, email, message }) {
  if (!supabaseClient) {
    return { error: new Error("Supabase isn't connected yet. Check your Project URL and anon key in Config.js.") };
  }
  try {
    const { error } = await supabaseClient
      .from("messages")
      .insert([{ name, email, message }]);
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err };
  }
}

async function pingSupabase() {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient.from("projects").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch the top scores for the Playground leaderboard.
 * Returns { data, error }
 */
async function fetchLeaderboard(limit = 5) {
  if (!supabaseClient) {
    return { data: [], error: new Error("Supabase isn't connected yet.") };
  }
  try {
    const { data, error } = await supabaseClient
      .from("scores")
      .select("player_name, score")
      .order("score", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

/**
 * Save a Tetris score to the "scores" table.
 * If this player_name already has a row, it's updated in place
 * (only if the new score is higher) instead of creating a
 * duplicate leaderboard entry.
 * Returns { error, isNewBest, bestScore }
 */
async function saveScore({ player_name, score }) {
  if (!supabaseClient) {
    return { error: new Error("Supabase isn't connected yet.") };
  }
  try {
    const { data: existing, error: lookupError } = await supabaseClient
      .from("scores")
      .select("id, score")
      .eq("player_name", player_name)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (existing) {
      if (score > existing.score) {
        const { error } = await supabaseClient
          .from("scores")
          .update({ score })
          .eq("id", existing.id);
        if (error) throw error;
        return { error: null, isNewBest: true };
      }
      // not a new personal best — leave their existing row alone
      return { error: null, isNewBest: false, bestScore: existing.score };
    }

    const { error } = await supabaseClient
      .from("scores")
      .insert([{ player_name, score }]);
    if (error) throw error;
    return { error: null, isNewBest: true };
  } catch (err) {
    return { error: err };
  }
}
