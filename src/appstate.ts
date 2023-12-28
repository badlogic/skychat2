import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { DevPreferences, PushPreferences, Theme, User } from "./common.js";
import { State } from "./utils/state.js";
import { Store } from "./utils/store.js";
import { ProfileView } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { NumQuote } from "./apis/bluesky.js";

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
};
store.set("devPrefs", store.get("devPrefs") ?? defaultDevPrefs);

const theme = store.get("theme");
if (theme == "dark") document.documentElement.classList.add("dark");
else document.documentElement.classList.remove("dark");

export type StateConfig = {
    post: PostView;
    profile: ProfileView;
    numQuotes: NumQuote;
    tick: number;
};

export const state = new State<StateConfig>();
state.poll(async () => {
    state.update("tick", performance.now());
    return true;
}, 1000 * 60);
