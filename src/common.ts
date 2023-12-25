import { AtpSessionData } from "@atproto/api";
import { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";

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

export type AtUri = { repo: string; type: string; rkey: string };

export function splitAtUri(uri: string): AtUri {
    const tokens = uri.replace("at://", "").split("/");
    return { repo: tokens[0], type: tokens[1], rkey: tokens[2] };
}

export function combineAtUri(repo: string, rkey: string, type: string = "app.bsky.feed.post") {
    return "at://" + repo + "/" + type + "/" + rkey;
}
