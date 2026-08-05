import { Camera, Clapperboard, Music2, Podcast } from "lucide-react";

export const CONTENT_PLATFORM_META = {
  PODCAST_SPOTIFY: {
    label: "Podcast",
    icon: Podcast,
    followersLabel: "フォロワー数",
    viewsLabel: "直近再生数",
  },
  YOUTUBE: {
    label: "YouTube",
    icon: Clapperboard,
    followersLabel: "登録者数",
    viewsLabel: "直近再生回数",
  },
  INSTAGRAM: {
    label: "Instagram",
    icon: Camera,
    followersLabel: "フォロワー数",
    viewsLabel: "直近リーチ数",
  },
  TIKTOK: {
    label: "TikTok",
    icon: Music2,
    followersLabel: "フォロワー数",
    viewsLabel: "直近再生数",
  },
} as const;

export type ContentPlatformKey = keyof typeof CONTENT_PLATFORM_META;
