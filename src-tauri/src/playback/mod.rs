pub mod websdk;

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RepeatMode {
    Off,
    Context,
    Track,
}

#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackState {
    pub uri: Option<String>,
    pub track_id: Option<String>,
    pub name: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub album_image: Option<String>,
    pub duration_ms: i32,
    pub position_ms: i32,
    pub is_playing: bool,
    pub volume: u8,
    pub shuffle: bool,
    pub repeat: RepeatMode,
    pub device_id: Option<String>,
}

pub trait PlaybackEngine: Send + Sync {
    fn play(&self, uri: Option<&str>) -> Result<(), String>;
    fn pause(&self) -> Result<(), String>;
    fn resume(&self) -> Result<(), String>;
    fn seek(&self, position_ms: u64) -> Result<(), String>;
    fn set_volume(&self, volume: u8) -> Result<(), String>;
    fn next_track(&self) -> Result<(), String>;
    fn previous_track(&self) -> Result<(), String>;
    fn toggle_shuffle(&self) -> Result<(), String>;
    fn cycle_repeat(&self) -> Result<(), String>;
    fn state(&self) -> Result<PlaybackState, String>;
    fn name(&self) -> &'static str;
}
