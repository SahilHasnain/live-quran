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

  // Handle track changes in the live stream playlist
  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async () => {
    console.log("[TrackPlayer] Track changed in playlist, continuing playback");
    // Ensure playback continues when server switches tracks
    const state = await TrackPlayer.getState();
    if (state !== "playing") {
      await TrackPlayer.play();
    }
  });

  // Handle queue ended (when playlist track finishes)
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    console.log("[TrackPlayer] Queue ended, restarting playback");
    // Restart playback when a track ends
    await TrackPlayer.play();
  });

  // Handle playback errors
  TrackPlayer.addEventListener(Event.PlaybackError, async (error) => {
    console.error("[TrackPlayer] Playback error:", error);
    // Try to recover by restarting playback
    await TrackPlayer.play();
  });
}
