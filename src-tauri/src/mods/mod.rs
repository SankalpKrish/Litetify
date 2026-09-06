use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use typeshare::typeshare;

#[typeshare]
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ModManifest {
    pub name: String,
    pub version: String,
    #[serde(rename = "type")]
    pub mod_type: ModType,
    pub entry: String,
    pub description: Option<String>,
    pub author: Option<String>,
    #[serde(rename = "litetifyApiVersion")]
    pub litetify_api_version: String,
    pub permissions: Option<Vec<String>>,
    pub icon: Option<String>,
}

#[typeshare]
#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ModType {
    Theme,
    Extension,
    App,
}

#[typeshare]
#[derive(Debug, Serialize, Clone)]
pub struct ModEntry {
    pub path: String,
    pub name: String,
    pub version: String,
    pub mod_type: ModType,
    pub entry: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub litetify_api_version: String,
    pub permissions: Vec<String>,
    pub icon: String,
    pub error: Option<String>,
}

pub fn scan_mods() -> Vec<ModEntry> {
    let mods_dir = mods_path();
    if !mods_dir.exists() {
        let _ = fs::create_dir_all(&mods_dir);
        return vec![];
    }

    let entries = match fs::read_dir(&mods_dir) {
        Ok(e) => e,
        Err(_) => return vec![],
    };

    let mut mods = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let manifest_path = path.join("manifest.json");
        if !manifest_path.exists() {
            continue;
        }

        let content = match fs::read_to_string(&manifest_path) {
            Ok(c) => c,
            Err(e) => {
                mods.push(ModEntry {
                    path: path.to_string_lossy().to_string(),
                    name: path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    version: String::new(),
                    mod_type: ModType::Theme,
                    entry: String::new(),
                    description: None,
                    author: None,
                    litetify_api_version: String::new(),
                    permissions: vec![],
                    icon: String::new(),
                    error: Some(format!("Failed to read manifest.json: {}", e)),
                });
                continue;
            }
        };

        let manifest: ModManifest = match serde_json::from_str(&content) {
            Ok(m) => m,
            Err(e) => {
                mods.push(ModEntry {
                    path: path.to_string_lossy().to_string(),
                    name: path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    version: String::new(),
                    mod_type: ModType::Theme,
                    entry: String::new(),
                    description: None,
                    author: None,
                    litetify_api_version: String::new(),
                    permissions: vec![],
                    icon: String::new(),
                    error: Some(format!("Invalid manifest.json: {}", e)),
                });
                continue;
            }
        };

        let entry_path = path.join(&manifest.entry);
        if !entry_path.exists() {
            mods.push(ModEntry {
                path: path.to_string_lossy().to_string(),
                name: manifest.name.clone(),
                version: manifest.version.clone(),
                mod_type: manifest.mod_type,
                entry: manifest.entry.clone(),
                description: manifest.description.clone(),
                author: manifest.author.clone(),
                litetify_api_version: manifest.litetify_api_version.clone(),
                permissions: manifest.permissions.unwrap_or_default(),
                icon: manifest.icon.unwrap_or_default(),
                error: Some(format!("Entry file '{}' not found", manifest.entry)),
            });
            continue;
        }

        mods.push(ModEntry {
            path: path.to_string_lossy().to_string(),
            name: manifest.name,
            version: manifest.version,
            mod_type: manifest.mod_type,
            entry: manifest.entry,
            description: manifest.description,
            author: manifest.author,
            litetify_api_version: manifest.litetify_api_version,
            permissions: manifest.permissions.unwrap_or_default(),
            icon: manifest.icon.unwrap_or_default(),
            error: None,
        });
    }

    mods
}

pub fn read_mod_file(mod_path: &str, file_path: &str) -> Result<String, String> {
    let base = mods_path();
    log::debug!(
        "[mods] read_mod_file: base={:?}, mod_path={:?}, file_path={:?}",
        base,
        mod_path,
        file_path
    );

    // Normalize path separators for comparison
    let base_str = base.to_string_lossy().replace('\\', "/");
    let mod_str = mod_path.replace('\\', "/");

    if !mod_str.starts_with(&base_str) {
        return Err(format!(
            "Access denied: mod path '{}' is not inside mods directory '{}'",
            mod_path,
            base.display()
        ));
    }

    // The full path is just mod_path + file_path (both are real paths from the filesystem)
    let entry_file = PathBuf::from(mod_path).join(file_path);
    log::debug!(
        "[mods] read_mod_file: entry_file={:?}, exists={}",
        entry_file,
        entry_file.exists()
    );

    if !entry_file.exists() {
        return Err(format!(
            "Entry file '{}' not found in {}",
            file_path, mod_path
        ));
    }

    // Security: ensure the resolved path doesn't escape the mod directory
    let entry_str = entry_file.to_string_lossy().replace('\\', "/");
    if !entry_str.starts_with(&mod_str) {
        return Err("Path traversal denied".into());
    }

    fs::read_to_string(&entry_file)
        .map_err(|e| format!("Failed to read {}: {}", entry_file.display(), e))
}

const BUNDLE_ID: &str = "com.litetify.app";

pub fn mods_path() -> PathBuf {
    if let Ok(env_path) = std::env::var("LITETIFY_MODS_DIR") {
        if !env_path.is_empty() {
            return PathBuf::from(env_path);
        }
    }

    let cwd = std::env::current_dir().unwrap_or_default();
    if let Some(root) = find_project_root(&cwd) {
        return root.join("mods");
    }

    let exe = std::env::current_exe().unwrap_or_else(|_| PathBuf::new());
    if let Some(exe_dir) = exe.parent() {
        if let Some(root) = find_project_root(exe_dir) {
            return root.join("mods");
        }
    }

    let dest = user_mods_dir();
    if let Some(exe_dir) = exe.parent() {
        migrate_install_dir_mods(exe_dir, &dest);
    }
    dest
}

fn find_project_root(start: &std::path::Path) -> Option<PathBuf> {
    let mut search = start.to_path_buf();
    for _ in 0..15 {
        if is_project_root(&search) {
            return Some(search);
        }
        if !search.pop() {
            break;
        }
    }
    None
}

fn is_project_root(dir: &std::path::Path) -> bool {
    dir.join("package.json").exists() && dir.join("src-tauri").join("tauri.conf.json").exists()
}

fn user_mods_dir() -> PathBuf {
    #[cfg(windows)]
    {
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            return PathBuf::from(local).join(BUNDLE_ID).join("mods");
        }
    }
    #[cfg(not(windows))]
    {
        if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
            return PathBuf::from(xdg).join(BUNDLE_ID).join("mods");
        }
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home)
                .join(".local")
                .join("share")
                .join(BUNDLE_ID)
                .join("mods");
        }
    }
    PathBuf::from("mods")
}

fn migrate_install_dir_mods(exe_dir: &std::path::Path, dest: &std::path::Path) {
    let old = exe_dir.join("mods");
    if !old.exists() || !has_manifests(&old) || old == dest {
        return;
    }
    let _ = fs::create_dir_all(dest);
    let Ok(entries) = fs::read_dir(&old) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Some(name) = path.file_name() else {
            continue;
        };
        let target = dest.join(name);
        if !target.exists() {
            let _ = copy_dir_all(&path, &target);
        }
    }
}

fn copy_dir_all(src: &std::path::Path, dest: &std::path::Path) -> std::io::Result<()> {
    fs::create_dir_all(dest)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let from = entry.path();
        let to = dest.join(entry.file_name());
        if from.is_dir() {
            copy_dir_all(&from, &to)?;
        } else {
            fs::copy(&from, &to)?;
        }
    }
    Ok(())
}

fn has_manifests(dir: &PathBuf) -> bool {
    fs::read_dir(dir)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .any(|e| e.path().is_dir() && e.path().join("manifest.json").exists())
        })
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    fn temp_tree(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "litetify-{}-{}-{}",
            name,
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn project_root_requires_package_and_tauri_conf() {
        assert!(!is_project_root(Path::new("/")));
    }

    #[test]
    fn finds_project_root_from_nested_dir() {
        let root = temp_tree("project-root");
        fs::create_dir_all(root.join("src-tauri")).unwrap();
        fs::write(root.join("package.json"), "{}").unwrap();
        fs::write(root.join("src-tauri").join("tauri.conf.json"), "{}").unwrap();
        let nested = root.join("src").join("app");
        fs::create_dir_all(&nested).unwrap();
        assert_eq!(find_project_root(&nested).as_deref(), Some(root.as_path()));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn user_mods_dir_uses_bundle_id() {
        let path = user_mods_dir();
        let rendered = path.to_string_lossy().replace('\\', "/");
        assert!(
            rendered.contains(BUNDLE_ID) || rendered == "mods",
            "unexpected mods dir {rendered}"
        );
    }

    #[test]
    fn migrates_mods_out_of_install_dir() {
        let install = temp_tree("install-dir");
        let dest = temp_tree("appdata-mods");
        let old_mod = install.join("mods").join("dark-theme");
        fs::create_dir_all(&old_mod).unwrap();
        fs::write(old_mod.join("manifest.json"), r#"{"name":"dark"}"#).unwrap();
        migrate_install_dir_mods(&install, &dest);
        assert!(dest.join("dark-theme").join("manifest.json").exists());
        let _ = fs::remove_dir_all(&install);
        let _ = fs::remove_dir_all(&dest);
    }
}
