import { Process } from "./classes/Process";

// Room Type
export type Room = "devices" | "processes";
export type WorkerSessions = {
  username: string;
  session: ConfigRowsSkeleton;
};
// Event Server Types
export type EventTypes =
  | "get-logs"
  | "get-devices-battery"
  | "get-sessions"
  | "get-processes"
  | "get-config"
  | "start-process-again"
  | "create-processes"
  | "create-devices"
  | "terminate-process"
  | "send-status-to-telegram"
  | "preview-device"
  | "get-process"
  | "create-process"
  | "update-process"
  | "update-processes"
  | "stop-process"
  | "create-device"
  | "get-device"
  | "update-device"
  | "get-devices"
  | "remove-device"
  | "delete-older-logs"
  | "read-config"
  | "get-pid"
  | "start-bot"
  | "remove-schedule"
  | "start-bot-checks"
  | "remove-process";
export type EmitTypes = `${EventTypes}-message`;

export type ServerActionSessionData = {
  following_now: number;
  followers_now: number;
  username: string;
};

export type ProcessSkeleton = {
  _device: {
    id: string;
    name: string;
    process: { username: string; configFile: string } | null;
    battery: string;
  };
  _scheduled: string | false;
  _result: string;
  _config: SessionConfig;
  _total_crashes: number;
  _user: {
    username: string;
    membership: "PREMIUM" | "FREE";
  };
  _status: "RUNNING" | "WAITING" | "STOPPED" | "FINISHED";
  _total: number;
  _following: number;
  _followers: number;
  _session: ConfigRowsSkeleton;
  _profile: SessionProfile;
  _jobs: Jobs;
  _configFile: ConfigNames;
  _startTime: number;
};

export type Response = {
  time: string;
  date: string;
  type: string;
  username: string;
  processId: string;
};

export type Jobs =
  | ["follow"]
  | ["unfollow"]
  | ["hashtags", "follow"]
  | ["hashtags", "unfollow"];

export type ApiDevices = {
  id: string;
  name: string;
  process: null | Process;
  battery: string;
}[];

export type DeviceSkeleton = {
  _id: string;
  _name: string;
  _battery: string;
};

export type BotFormData = {
  username: string;
  device: DeviceSkeleton;
  password?: string;
  jobs: Jobs;
  config_name?: ConfigNames;
  "speed-multiplier"?: number;
  "truncate-sources"?: string;
  "blogger-followers"?: string[];
  "hashtag-likers-top"?: string[];
  "unfollow-non-followers"?: string;
  "unfollow-skip-limit"?: string;
  "working-hours"?: string[];
};

export type SessionConfig = {
  args: {
    config: string;
    unfollow: number | string;
    unfollow_non_followers: number | string;
    unfollow_any_non_followers: string;
    unfollow_any_followers: string;
    unfollow_any: number | string;
    min_following: number;
    sort_followers_newest_to_oldest: boolean;
    unfollow_delay: number;
    unfollow_skip_limit: number | string;
    app_id: string;
    cloned_app_mode: number | string;
    device: string;
    username: string;
    password: string;
    relog_after_block: boolean;
    relog_delay: string;
    likes_count: string;
    likes_percentage: string;
    total_likes_limit: string;
    total_follows_limit: string;
    total_unfollows_limit: string;
    total_watches_limit: string;
    total_successful_interactions_limit: string;
    total_interactions_limit: string;
    stories_count: string;
    stories_percentage: string;
    carousel_count: string;
    carousel_percentage: string;
    watch_video_time: string;
    watch_photo_time: string;
    interactions_count: string;
    interact_percentage: string;
    can_reinteract_after: string;
    can_recheck_after: string;
    repeat: string;
    follow_percentage: string;
    follow_limit: number;
    skipped_list_limit: string;
    fling_when_skipped: string;
    speed_multiplier: number | string;
    screen_sleep: boolean;
    debug: boolean;
    screen_record: boolean;
    close_apps: boolean;
    interact: string | string[];
    hashtag_likers: string | string[];
    delete_interacted_users: boolean;
    scrape_to_file: string | string[];
    total_scraped_limit: string;
    comment_percentage: string;
    total_comments_limit: string;
    pm_percentage: string;
    total_pm_limit: string;
    max_comments_pro_user: string;
    end_if_likes_limit_reached: boolean;
    end_if_follows_limit_reached: boolean;
    end_if_watches_limit_reached: boolean;
    end_if_comments_limit_reached: boolean;
    end_if_pm_limit_reached: boolean;
    truncate_sources: string;
    shuffle_jobs: boolean;
    working_hours: string[];
    time_delta: string;
    disable_filters: boolean;
    total_crashes_limit: string | number;
    change_source_if_crash: boolean;
    timeout_startup: string;
    count_app_crashes: boolean;
    skipped_posts_limit: string | number;
    uia_version: number;
    total_sessions: string | number;
    disable_block_detection: boolean;
    pre_script: string | string[];
    post_script: string | string[];
    move_folders_in_accounts: boolean;
    dont_type: boolean;
    mute_posts_after_follow: boolean;
    mute_stories_after_follow: boolean;
    analytics: boolean;
    blogger: string | string[];
    interact_from_file: string | string[];
    unfollow_from_file: string | string[];
    blogger_followers: string[];
    blogger_following: string | string[];
    blogger_post_likers: string | string[];
    blogger_post_limits: 0;
    feed: string;
    hashtag_likers_top: string[];
    hashtag_likers_recent: string | string[];
    hashtag_posts_recent: string | string[];
    hashtag_posts_top: string | string[];
    place_likers_top: string | string[];
    place_likers_recent: string | string[];
    place_posts_recent: string | string[];
    place_posts_top: string | string[];
    posts_from_file: string[];
    remove_followers_from_file: string | string[];
    delete_removed_followers: boolean;
    rotate_ip: boolean;
    telegram_reports: boolean;
    welcoming: string;
    max_welcoming_skips: number;
    check_chat_before_welcoming: boolean;
    time_delta_session: number;
    current_likes_limit: number;
    current_follow_limit: number;
    current_unfollow_limit: number;
    current_comments_limit: number;
    current_pm_limit: number;
    current_watch_limit: number;
    current_success_limit: number;
    current_total_limit: number;
    current_scraped_limit: number;
    current_crashes_limit: number;
  };
};

// infeer the type of the keys of the object
export type GetKeysOfObject<T> = keyof T;

export type ConfigRowsKeys = GetKeysOfObject<ConfigRowsSkeleton>;

export const ConfigRows = {
  "last-session-activity-bottling": "",
  "last-session-activity-likes": "",
  "last-session-activity-follows": "",
  "last-session-activity-unfollows": "",
  "last-session-activity-stories-watched": "",
  "last-session-activity-comments-done": "",
  "last-session-activity-pm-sent": "",
  "today-session-activity-bottling": "",
  "today-session-activity-likes": "",
  "today-session-activity-follows": "",
  "today-session-activity-unfollows": "",
  "today-session-activity-stories-watched": "",
  "today-session-activity-comments-done": "",
  "today-session-activity-pm-sent": "",
  "trends-new-followers-today": "",
  "trends-new-followers-past-3-days": "",
  "trends-new-followers-past-week": "",
  "trends-milestone": "",
  "weekly-average-bottling": "",
  "weekly-average-followers-per-day": "",
  "weekly-average-likes": "",
  "weekly-average-follows": "",
  "weekly-average-unfollows": "",
  "weekly-average-stories-watched": "",
  "weekly-average-comments-done": "",
  "weekly-average-pm-sent": "",
};

export type ConfigRowsSkeleton = {
  id?: number | string;
  "overview-username"?: string;
  "overview-status"?: "RUNNING" | "WAITING" | "STOPPED" | "FINISHED";
  "overview-followers"?: string;
  "overview-following"?: string;
  "last-session-activity-bottling": string;
  "last-session-activity-likes": string;
  "last-session-activity-follows": string;
  "last-session-activity-unfollows": string;
  "last-session-activity-stories-watched": string;
  "today-session-activity-bottling": string;
  "today-session-activity-likes": string;
  "today-session-activity-follows": string;
  "today-session-activity-unfollows": string;
  "today-session-activity-stories-watched": string;
  "trends-new-followers-today": string;
  "trends-new-followers-past-3-days": string;
  "trends-new-followers-past-week": string;
  "weekly-average-bottling": string;
  "weekly-average-followers-per-day": string;
  "weekly-average-likes": string;
  "weekly-average-follows": string;
  "weekly-average-unfollows": string;
  "weekly-average-stories-watched": string;
};

export const SessionConfigSkeleton: SessionConfig = {
  args: {
    config: "",
    unfollow: "",
    unfollow_non_followers: "",
    unfollow_any_non_followers: "",
    unfollow_any_followers: "",
    unfollow_any: "",
    min_following: 0,
    sort_followers_newest_to_oldest: false,
    unfollow_delay: 0,
    unfollow_skip_limit: "",
    app_id: "",
    cloned_app_mode: "",
    device: "",
    username: "",
    password: "",
    relog_after_block: false,
    relog_delay: "",
    likes_count: "",
    likes_percentage: "",
    total_likes_limit: "",
    total_follows_limit: "",
    total_unfollows_limit: "",
    total_watches_limit: "",
    total_successful_interactions_limit: "",
    total_interactions_limit: "",
    stories_count: "",
    stories_percentage: "",
    carousel_count: "",
    carousel_percentage: "",
    watch_video_time: "",
    watch_photo_time: "",
    interactions_count: "",
    interact_percentage: "",
    can_reinteract_after: "",
    can_recheck_after: "",
    repeat: "",
    follow_percentage: "",
    follow_limit: 0,
    skipped_list_limit: "",
    fling_when_skipped: "",
    speed_multiplier: "",
    screen_sleep: false,
    debug: false,
    screen_record: false,
    close_apps: false,
    interact: "",
    hashtag_likers: "",
    delete_interacted_users: false,
    scrape_to_file: "",
    total_scraped_limit: "",
    comment_percentage: "",
    total_comments_limit: "",
    pm_percentage: "",
    total_pm_limit: "",
    max_comments_pro_user: "",
    end_if_likes_limit_reached: false,
    end_if_follows_limit_reached: false,
    end_if_watches_limit_reached: false,
    end_if_comments_limit_reached: false,
    end_if_pm_limit_reached: false,
    truncate_sources: "",
    shuffle_jobs: false,
    working_hours: [""],
    time_delta: "",
    disable_filters: false,
    total_crashes_limit: "",
    change_source_if_crash: false,
    timeout_startup: "",
    count_app_crashes: false,
    skipped_posts_limit: "",
    uia_version: 0,
    total_sessions: "",
    disable_block_detection: false,
    pre_script: "",
    post_script: "",
    move_folders_in_accounts: false,
    dont_type: false,
    mute_posts_after_follow: false,
    mute_stories_after_follow: false,
    analytics: false,
    blogger: "",
    interact_from_file: "",
    unfollow_from_file: "",
    blogger_followers: [""],
    blogger_following: "",
    blogger_post_likers: "",
    blogger_post_limits: 0,
    feed: "",
    hashtag_likers_top: [""],
    hashtag_likers_recent: "",
    hashtag_posts_recent: "",
    hashtag_posts_top: "",
    place_likers_top: "",
    place_likers_recent: "",
    place_posts_recent: "",
    place_posts_top: "",
    posts_from_file: [""],
    remove_followers_from_file: "",
    delete_removed_followers: false,
    rotate_ip: false,
    telegram_reports: false,
    welcoming: "",
    max_welcoming_skips: 0,
    check_chat_before_welcoming: false,
    time_delta_session: 0,
    current_likes_limit: 0,
    current_follow_limit: 0,
    current_unfollow_limit: 0,
    current_comments_limit: 0,
    current_pm_limit: 0,
    current_watch_limit: 0,
    current_success_limit: 0,
    current_total_limit: 0,
    current_scraped_limit: 0,
    current_crashes_limit: 0,
  },
};

export type SessionProfile = {
  posts: number;
  followers: number;
  following: number;
};

export type ConfigNames = "config.yml" | "config2.yml" | "unfollow.yml";

export const SessionProfileSkeleton: SessionProfile = {
  posts: 0,
  followers: 0,
  following: 0,
};

export type Session = {
  id: string;
  total_interactions: number;
  successful_interactions: number;
  total_followed: number;
  total_likes: number;
  total_comments: number;
  total_pm: number;
  total_watched: number;
  total_unfollowed: number;
  total_scraped: object;
  start_time: string;
  finish_time: string;
} & SessionConfig &
  SessionProfile;

export type Sessions = {
  sessions: Session[];
};

export interface NotScheduledType {
  scheduled: false;
  startsAt: undefined;
  formData: BotFormData;
  startTime: undefined;
  status: "RUNNING" | "WAITING" | "STOPPED" | "FINISHED";
  membership: "FREE" | "PREMIUM";
  jobs: Jobs;
}

export interface ScheduledType {
  scheduled: string;
  startsAt: number;
  startTime: number;
  status: "RUNNING" | "WAITING" | "STOPPED" | "FINISHED";
  formData: BotFormData;
  membership: "FREE" | "PREMIUM";
  jobs: Jobs;
}

export type CreateProcessData = NotScheduledType | ScheduledType;

export type BulkFormData = {
  usernames: string[];
  devices: DeviceSkeleton[];
  jobs: Jobs;
  config_name?: ConfigNames;
  "speed-multiplier"?: number;
  "truncate-sources"?: string;
  "blogger-followers"?: string[];
  "hashtag-likers-top"?: string[];
  "unfollow-non-followers"?: string;
  "unfollow-skip-limit"?: string;
  "working-hours"?: string[];
};

export type BulkWriteData = {
  formData: BulkFormData;
  membership: Array<"FREE" | "PREMIUM">;
  scheduled: string | false;
  startTime: number;
  status: "RUNNING" | "WAITING" | "FINISHED" | "STOPPED";
};

export type GetSessionFromPython = {
  following_now: number;
  followers_now: number;
  username: string;
};
