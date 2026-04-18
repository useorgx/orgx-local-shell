//! OrgX Local Shell — Tauri 2 entrypoint.
//!
//! Wires:
//!   - system tray with "Open OrgX", "Quit"
//!   - a Tauri command that spawns the plugin peer sidecars so the
//!     user doesn't have to run `orgx-claude-code-peer` / `orgx-codex-peer`
//!     / `orgx-opencode-plugin` manually
//!   - the WebView that loads the bundled Vite build, which renders
//!     surfaces from @useorgx/orgx-ui-kit against @useorgx/orgx-data

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::Serialize;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_shell::{process::Command, ShellExt};

#[derive(Serialize)]
struct PeerStatus {
    plugin_id: String,
    running: bool,
    last_stderr_line: Option<String>,
}

#[tauri::command]
async fn start_peer(
    app: tauri::AppHandle,
    plugin_id: String,
    api_key: String,
    workspace_id: String,
) -> Result<PeerStatus, String> {
    let binary = match plugin_id.as_str() {
        "@useorgx/claude-code-plugin" => "orgx-claude-code-peer",
        "@useorgx/codex-plugin" => "orgx-codex-peer",
        "@useorgx/orgx-opencode-plugin" => "orgx-opencode-plugin",
        other => return Err(format!("Unknown plugin_id: {other}")),
    };

    let cmd: Command = app
        .shell()
        .command(binary)
        .env("ORGX_API_KEY", api_key)
        .env("ORGX_WORKSPACE_ID", workspace_id);

    let (_rx, _child) = cmd.spawn().map_err(|e| format!("spawn failed: {e}"))?;

    Ok(PeerStatus {
        plugin_id,
        running: true,
        last_stderr_line: None,
    })
}

#[tauri::command]
fn shell_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![start_peer, shell_version])
        .setup(|app| {
            let open = MenuItemBuilder::with_id("open", "Open OrgX").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&open, &quit]).build()?;

            TrayIconBuilder::with_id("orgx-tray")
                .tooltip("OrgX")
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running orgx-local-shell");
}
