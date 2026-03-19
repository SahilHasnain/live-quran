/**
 * Track Player Service
 * Handles playback events for react-native-track-player
 */

import TrackPlayer, { Event } from "@weights-ai/react-native-track-player";

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    // Handle next track if needed
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    // Handle previous track if needed
  });

  // Keep these listeners observational only so playback never starts
  // unless a user explicitly presses play.
  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, () => {
    console.log("[TrackPlayer] Track changed in playlist");
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    console.log("[TrackPlayer] Queue ended");
  });

  TrackPlayer.addEventListener(Event.PlaybackError, (error) => {
    console.error("[TrackPlayer] Playback error:", error);
  });
}
