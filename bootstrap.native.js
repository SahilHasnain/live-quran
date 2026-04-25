import TrackPlayer from "@weights-ai/react-native-track-player";
import { PlaybackService } from "./services/trackPlayerService";

TrackPlayer.registerPlaybackService(() => PlaybackService);
