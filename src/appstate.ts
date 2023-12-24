import { AtpSessionData } from "@atproto/api";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { Store } from "./utils/store.js";

export type User = {
    account: string;
    password: string;
    session?: AtpSessionData;
    profile: ProfileViewDetailed;
    pushToken?: string;
};

export type PushPreferences = {
    enabled: boolean;
    newFollowers: boolean;
    replies: boolean;
    quotes: boolean;
    reposts: boolean;
    mentions: boolean;
    likes: boolean;
};

export type DevPreferences = {
    enabled: boolean;
    logPostViewRenders: boolean;
    logFeedViewPostRenders: boolean;
    logEmbedRenders: boolean;
    logThreadViewPostRenders: boolean;
    logStreamViewAppended: boolean;
    logStreamViewPrepended: boolean;
};

export type Theme = "dark" | "light";

export type StoreConfig = {
    user: User;
    theme: Theme;
    pushPrefs: PushPreferences;
    devPrefs: DevPreferences;
};

export const store = new Store<StoreConfig>();
store.set("theme", store.get("theme") ?? "dark");

const defaultPushPrefs: PushPreferences = {
    enabled: true,
    newFollowers: true,
    replies: true,
    quotes: true,
    reposts: true,
    mentions: true,
    likes: true,
};
store.set("pushPrefs", store.get("pushPrefs") ?? defaultPushPrefs);

const defaultDevPrefs: DevPreferences = {
    enabled: false,
    logPostViewRenders: false,
    logFeedViewPostRenders: false,
    logEmbedRenders: false,
    logThreadViewPostRenders: false,
    logStreamViewAppended: false,
    logStreamViewPrepended: false,
};
store.set("devPrefs", store.get("devPrefs") ?? defaultDevPrefs);

const theme = store.get("theme");
if (theme == "dark") document.documentElement.classList.add("dark");
else document.documentElement.classList.remove("dark");
