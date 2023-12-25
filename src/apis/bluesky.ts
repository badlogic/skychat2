import { AppBskyFeedDefs, AppBskyFeedPost, AppBskyNotificationListNotifications, AtpSessionData, AtpSessionEvent, BskyAgent } from "@atproto/api";
import { FeedViewPost, GeneratorView, PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { store } from "../appstate.js";
import { Stream, StreamPage } from "../utils/streams.js";
import { error } from "../utils/utils.js";
import { ProfileView, ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs.js";
import { ListView } from "@atproto/api/dist/client/types/app/bsky/graph/defs.js";
import { Api } from "../api.js";
import { User, splitAtUri } from "../common.js";

export interface NumQuote {
    postUri: string;
    numQuotes: number;
}

export type LinkCard = {
    error: string;
    likely_type: string;
    url: string;
    title: string;
    description: string;
    image: string;
};

export async function extractLinkCard(url: string): Promise<LinkCard | Error> {
    try {
        const resp = await fetch("https://cardyb.bsky.app/v1/extract?url=" + encodeURIComponent(url));
        if (!resp.ok) throw new Error();
        return (await resp.json()) as LinkCard;
    } catch (e) {
        if (e instanceof Error) return e;
        return new Error("Couldn't get link card info from url " + url);
    }
}

export function author(post: FeedViewPost | PostView) {
    if (post.post) {
        const feedViewPost = post as FeedViewPost;
        return feedViewPost.post.author.displayName ?? feedViewPost.post.author.handle;
    } else {
        post = post as PostView;
        return post.author.displayName ?? post.author.handle;
    }
}

export function date(post: FeedViewPost | PostView | AppBskyNotificationListNotifications.Notification) {
    if (post.post) {
        const rec = record(post);
        if (post.reason && AppBskyFeedDefs.isReasonRepost(post.reason)) return new Date(post.reason.indexedAt);
        return rec?.createdAt ? new Date(rec.createdAt) : undefined;
    } else {
        const rec = record(post);
        return rec?.createdAt ? new Date(rec.createdAt) : undefined;
    }
}

export function record(post: FeedViewPost | PostView) {
    if (!post.post) {
        return AppBskyFeedPost.isRecord(post.record) ? post.record : undefined;
    } else {
        const feedViewPost = post as FeedViewPost;
        return AppBskyFeedPost.isRecord(feedViewPost.post.record) ? feedViewPost.post.record : undefined;
    }
}

export function text(post: FeedViewPost | PostView) {
    if (post.post) {
        const rec = record(post as FeedViewPost);
        return rec?.text;
    } else {
        const rec = record(post as PostView);
        return rec?.text;
    }
}

export function getBskyPostUrl(post: PostView) {
    const atUri = splitAtUri(post.uri);
    return `https://bsky.app/profile/${atUri.repo}/post/${atUri.rkey}`;
}

export function getBskyGeneratorUrl(generator: GeneratorView) {
    const atUri = splitAtUri(generator.uri);
    return `https://bsky.app/profile/${atUri.repo}/feed/${atUri.rkey}`;
}

export function getBskyListUrl(list: ListView) {
    const atUri = splitAtUri(list.uri);
    return `https://bsky.app/profile/${atUri.repo}/list/${atUri.rkey}`;
}

export function getSkychatPostUrl(post: PostView) {
    const atUri = splitAtUri(post.uri);
    return location.protocol + "//" + location.host + `/#thread/${atUri.repo}/${atUri.rkey}`;
}

export function getSkychatGeneratorUrl(generator: GeneratorView) {
    const atUri = splitAtUri(generator.uri);
    return location.protocol + "//" + location.host + `/#feed/${atUri.repo}/${atUri.rkey}`;
}

export function getSkychatListUrl(list: ListView) {
    const atUri = splitAtUri(list.uri);
    return location.protocol + "//" + location.host + `/#list/${atUri.repo}/${atUri.rkey}`;
}

export function getSkychatProfileUrl(profile: ProfileView) {
    return location.protocol + "//" + location.host + `/#profile/${profile.did}`;
}

export class BlueSky {
    static client?: BskyAgent;

    static async login(account?: string, password?: string): Promise<void | Error> {
        if (!account || !password) {
            BlueSky.client = new BskyAgent({ service: "https://api.bsky.app" });
            return;
        }

        let session: AtpSessionData | undefined;
        const persistSession = (evt: AtpSessionEvent, s?: AtpSessionData) => {
            if (evt == "create" || evt == "update") {
                session = s;
            }
        };

        BlueSky.client = new BskyAgent({ service: "https://bsky.social", persistSession });
        try {
            let user = store.get("user");
            let resumeSuccess = false;
            if (user && user.account == account && user.password == password && user.session) {
                try {
                    const resume = await BlueSky.client.resumeSession(user.session);
                    resumeSuccess = resume.success;
                } catch (e) {
                    // no-op in case resume didn't work.
                }
            }

            if (!resumeSuccess) {
                const response = await BlueSky.client.login({
                    identifier: account,
                    password,
                });
                if (!response.success) {
                    store.set("user", undefined);
                    BlueSky.client = undefined;
                    throw new Error();
                }
            }
            const profileResponse = await BlueSky.client.app.bsky.actor.getProfile({ actor: account });
            if (!profileResponse.success) {
                store.set("user", undefined);
                BlueSky.client = undefined;
                throw new Error();
            }
            const newUser: User = {
                account,
                password,
                session,
                profile: profileResponse.data,
            };
            store.set("user", newUser);
            const pushPrefs = store.get("pushPrefs");
            if (!pushPrefs) {
                store.set("pushPrefs", {
                    enabled: true,
                    likes: true,
                    mentions: true,
                    newFollowers: true,
                    quotes: true,
                    replies: true,
                    reposts: true,
                });
            }
        } catch (e) {
            store.set("user", undefined);
            BlueSky.client = undefined;
            return error("Couldn't log-in with your BlueSky credentials.", e);
        }
    }

    static logout() {
        const user = store.get("user");
        store.set("user", undefined);
        BlueSky.client = undefined;
    }

    static async getPosts(uris: string[], cacheProfilesAndQuotes = true, notify = true): Promise<Error | PostView[]> {
        if (!BlueSky.client) return new Error("Not connected");
        const urisToFetch = Array.from(new Set<string>(uris));
        const posts: PostView[] = [];
        const postsMap = new Map<string, PostView>();
        try {
            const promises: Promise<any>[] = [];
            while (urisToFetch.length > 0) {
                const batch = urisToFetch.splice(0, 25);
                const response = await BlueSky.client.app.bsky.feed.getPosts({ uris: batch });
                if (!response.success) throw new Error();
                posts.push(...response.data.posts);

                const profilesToFetch: string[] = [];
                for (const post of response.data.posts) {
                    profilesToFetch.push(post.author.did);
                    postsMap.set(post.uri, post);
                }
                if (cacheProfilesAndQuotes) promises.push(this.getNumQuotes(batch), this.getProfiles(profilesToFetch));
            }

            for (const promise of promises) {
                if (promise instanceof Error) throw promise;
            }
            // FIXME notify
            return uris.map((uri) => postsMap.get(uri)!);
        } catch (e) {
            return error("Couldn't load posts", e);
        }
    }

    static async loadFeedViewPostsDependencies(
        feedViewPosts: FeedViewPost[]
    ): Promise<Error | { profiles: ProfileViewDetailed[]; numQuotes?: NumQuote[] }> {
        try {
            const posts: PostView[] = [];
            const profilesToFetch: string[] = [];
            const postUrisToFetch: string[] = [];
            for (const feedViewPost of feedViewPosts) {
                posts.push(feedViewPost.post);
                postUrisToFetch.push(feedViewPost.post.uri);
                profilesToFetch.push(feedViewPost.post.author.did);

                if (feedViewPost.reply) {
                    if (AppBskyFeedDefs.isPostView(feedViewPost.reply.parent)) {
                        posts.push(feedViewPost.reply.parent);
                        postUrisToFetch.push(feedViewPost.reply.parent.uri);
                        const parentRecord = record(feedViewPost.reply.parent);
                        if (parentRecord && parentRecord.reply) {
                            profilesToFetch.push(splitAtUri(parentRecord.reply.parent.uri).repo);
                        }
                    }
                }
                if (AppBskyFeedDefs.isReasonRepost(feedViewPost.reason)) {
                    profilesToFetch.push(feedViewPost.reason.by.did);
                }
            }
            const promises = await Promise.all([BlueSky.getProfiles(profilesToFetch), BlueSky.getNumQuotes(postUrisToFetch)]);
            if (promises[0] instanceof Error) throw promises[0];
            return { profiles: promises[0], numQuotes: promises[1] instanceof Error ? undefined : promises[1] };
        } catch (e) {
            return error("Couldn't fetch feed view post dependencies");
        }
    }

    static async getNumQuotes(postUris: string[]): Promise<Error | NumQuote[]> {
        try {
            const postUrisToFetch = Array.from(new Set<string>(postUris));
            const quotesMap = new Map<string, number>();

            while (postUrisToFetch.length > 0) {
                const batch = postUrisToFetch.splice(0, 15);
                const quotes = await Api.numQuotes(batch);
                if (quotes instanceof Error) throw quotes;
                for (const uri of batch) {
                    quotesMap.set(uri, quotes[uri]);
                }
            }

            const quotesList: NumQuote[] = [];
            for (const postUri of Array.from(new Set<string>(postUris))) {
                quotesList.push({ postUri, numQuotes: quotesMap.get(postUri)! });
            }

            return postUris.map((postUri) => {
                return { postUri: postUri, numQuotes: quotesMap.get(postUri)! };
            });
        } catch (e) {
            return error("Couldn't load num quotes", e);
        }
    }

    static async getHomeTimeline(cursor?: string): Promise<StreamPage<FeedViewPost> | Error> {
        if (!BlueSky.client) return new Error("Not connected");
        try {
            const response = await BlueSky.client.getTimeline({ cursor });
            if (!response.success) throw new Error();
            await BlueSky.loadFeedViewPostsDependencies(response.data.feed);
            return { cursor: response.data.cursor, items: response.data.feed };
        } catch (e) {
            return error("Could not get home timeline", e);
        }
    }

    static async getProfiles(dids: string[]): Promise<Error | ProfileViewDetailed[]> {
        if (!BlueSky.client) return new Error("Not connected");
        try {
            const didsToFetch = Array.from(new Set<string>(dids));
            const promises = [];
            while (didsToFetch.length > 0) {
                const batch = didsToFetch.splice(0, 10);
                promises.push(BlueSky.client.app.bsky.actor.getProfiles({ actors: batch }));
            }
            const results = await Promise.all(promises);

            const profiles: ProfileViewDetailed[] = [];
            const profilesMap = new Map<string, ProfileViewDetailed>();
            for (const result of results) {
                if (!result.success) throw new Error();
                for (const profile of result.data.profiles) {
                    profiles.push(profile);
                    profilesMap.set(profile.did, profile);
                    profilesMap.set(profile.handle, profile);
                }
            }
            return dids.map((did) => profilesMap.get(did)!);
        } catch (e) {
            return error("Couldn't load profiles", e);
        }
    }

    static async countUnreadNotifications(): Promise<Error | number> {
        if (!BlueSky.client) return new Error("Not connected");
        try {
            const response = await BlueSky.client.countUnreadNotifications();
            if (!response.success) throw new Error();
            return response.data.count;
        } catch (e) {
            return error("Couldn't count unread notifications", e);
        }
    }

    static async getNotifications(cursor?: string): Promise<Error | StreamPage<AppBskyNotificationListNotifications.Notification>> {
        if (!BlueSky.client) return new Error("Not connected");

        try {
            const listResponse = await BlueSky.client.listNotifications({ cursor });
            if (!listResponse.success) throw new Error();

            const postsToLoad: string[] = [];
            const quotesToLoad: string[] = [];
            for (const notification of listResponse.data.notifications) {
                if (notification.reasonSubject && notification.reasonSubject.includes("app.bsky.feed.post")) {
                    postsToLoad.push(notification.reasonSubject);
                    quotesToLoad.push(notification.reasonSubject);
                }
                if (AppBskyFeedPost.isRecord(notification.record) && notification.record.reply) {
                    postsToLoad.push(notification.record.reply.parent.uri);
                    quotesToLoad.push(notification.uri);
                }
                if (notification.uri.includes("app.bsky.feed.post")) {
                    postsToLoad.push(notification.uri);
                }
            }
            const promises = await Promise.all([BlueSky.getPosts(postsToLoad, false), BlueSky.getNumQuotes(quotesToLoad)]);
            if (promises[0] instanceof Error) throw promises[0];

            BlueSky.client.updateSeenNotifications(); // Not important to wait for this one.
            return { cursor: listResponse.data.cursor, items: listResponse.data.notifications };
        } catch (e) {
            return error("Couldn't load notifications", e);
        }
    }
}

export class FeedViewPostStream extends Stream<FeedViewPost> {
    async loadDependencies(newItems: FeedViewPost[]): Promise<Error | void> {
        const response = await BlueSky.loadFeedViewPostsDependencies(newItems);
        if (response instanceof Error) return response;
    }

    getItemKey(item: FeedViewPost): string {
        return item.post.uri + (AppBskyFeedDefs.isReasonRepost(item.reason) ? item.reason.by.did : "");
    }

    getItemDate(item: FeedViewPost): Date {
        return date(item) ?? new Date();
    }
}
