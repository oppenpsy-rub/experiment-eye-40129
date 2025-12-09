#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      // WebView2 Fixed Version side-by-side verwenden, wenn vorhanden
      if let Some(dir) = app
        .path_resolver()
        .resolve_resource("resources/webview2-fixed")
      {
        std::env::set_var("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER", dir);
      }
      if let Some(window) = app.get_window("main") {
        let _ = window.set_title("Forschungsdaten-Analyseplattform");
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}