// Requer: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// e <script src="js/config.js"></script> carregados antes deste ficheiro.
(function () {
  if (!window.supabase || !window.SUPABASE_CONFIG) {
    console.error("Supabase ou config não carregados.");
    return;
  }
  window.sb = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );
})();
