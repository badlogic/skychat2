export interface Messages {
    "Whoops, that page doesn't exist": string;
    "Couldn't load mesage": string;
    "Invalid stream": string;
    "Sorry, an unknown error occured": string;
    "End of list": string;
    footer: string;
    Username: string;
    "App password": string;
    "Sign in": string;
    "Explore BlueSky without account": string;
    or: string;
    "Could not sign in": string;
    "Connecting ...": string;
    Settings: string;
    "Signed in as": string;
    "Sign out": string;
    "Allow pinch-zoom": string;
    Moderation: string;
    Dark: string;
    Light: string;
    "Muted words": string;
    "Muted users": string;
    "Muted threads": string;
    "Blocked users": string;
    "Moderation lists": string;
    "Content filtering": string;
    "Push notifications": string;
    Enabled: string;
    "New follower": string;
    Replies: string;
    Quotes: string;
    Reposts: string;
    Mentions: string;
    Likes: string;
    "User Interface": string;
    Home: string;
    "is following you": (handle: string) => string;
    "liked your post": (handle: string) => string;
    "quoted your post": (handle: string) => string;
    "replied to your post": (handle: string) => string;
    "reposted your post": (handle: string) => string;
    "mentioned you": (handle: string) => string;
    "You have a new notification": string;
    "New notification": string;
    "Not signed in": string;
    Thread: string;
    Profile: string;
    "Profile does not exist": string;
    "Copied link to clipboard": string;
    "Follows you": string;
    Joined: string;
    followers: string;
    following: string;
    posts: string;
    "You are muting the user": string;
    "User muted by moderation list ": (list: string) => string;
    "You are blocked by the user": string;
    "You are blocking the user": string;
    "User blocked by moderation list ": (list: string) => string;
    Posts: string;
    "Posts & Replies": string;
    Media: string;
    Feeds: string;
    Lists: string;
    "Nothing to show": string;
    "Replying to": string;
    "Deleted post": string;
    "Content not available": string;
    ALT: string;
    "Not connected": string;
    "Post does not exist": string;
    "Post author has blocked you": string;
    "Click to view": string;
    "You have blocked the post author": string;
    "You have blocked the author or the author has blocked you": string;
    "Show replies": string;
}

const english: Messages = {
    "Whoops, that page doesn't exist": "Whoops, that page doesn't exist",
    "Couldn't load mesage": "Couldn't load mesage",
    "Invalid stream": "Invalid stream",
    "Sorry, an unknown error occured": "Sorry, an unknown error occured",
    "End of list": "End of list",
    footer: `Skychat is lovingly made by
        <a href="https://skychat.social/profile/badlogic.bsky.social" target="_blank">Mario Zechner</a><br />
        <a href="https://github.com/badlogic/skychat2" target="_blank">Source code</a>`,
    Username: "Username",
    "App password": "App password",
    "Sign in": "Sign in",
    "Explore BlueSky without account": "Explore BlueSky without account",
    or: "or",
    "Could not sign in": "Could not sign in",
    "Connecting ...": "Connecting ...",
    Settings: "Settings",
    "Signed in as": "Signed in as",
    "Sign out": "Sign out",
    "Allow pinch-zoom": "Allow pinch-zoom",
    Moderation: "Moderation",
    Dark: "Dark",
    Light: "Light",
    "Muted words": "Muted words",
    "Muted users": "Muted users",
    "Muted threads": "Muted threads",
    "Blocked users": "Blocked users",
    "Moderation lists": "Moderation lists",
    "Content filtering": "Content filtering",
    "Push notifications": "Push notifications",
    Enabled: "Enabled",
    "New follower": "New follower",
    Replies: "Replies",
    Quotes: "Quotes",
    Reposts: "Reposts",
    Mentions: "Mentions",
    Likes: "Likes",
    "User Interface": "User Interface",
    Home: "Home",
    "is following you": (handle: string) => handle + " is following you",
    "liked your post": (handle: string) => handle + " liked your post",
    "quoted your post": (handle: string) => handle + " quoted your post",
    "replied to your post": (handle: string) => handle + " replied to your post",
    "reposted your post": (handle: string) => handle + " reposted your post",
    "mentioned you": (handle: string) => handle + " mentioned you",
    "You have a new notification": "You have a new notification",
    "New notification": "New notification",
    "Not signed in": "Not signed in",
    Thread: "Thread",
    Profile: "Profile",
    "Profile does not exist": "Profile does not exist",
    "Copied link to clipboard": "Copied link to clipboard",
    "Follows you": "Follows you",
    Joined: "Joined",
    followers: "followers",
    following: "following",
    posts: "posts",
    "You are muting the user": "You are muting the user",
    "User muted by moderation list ": (list: string) => "User muted by moderation list " + list,
    "You are blocked by the user": "You are blocked by the user",
    "You are blocking the user": "You are blocking the user",
    "User blocked by moderation list ": (list: string) => "User blocked by moderation list " + list,
    Posts: "Posts",
    "Posts & Replies": "Posts & Replies",
    Media: "Media",
    Feeds: "Feeds",
    Lists: "Lists",
    "Nothing to show": "Nothing to show",
    "Replying to": "Replying to",
    "Deleted post": "Deleted post",
    "Content not available": "Content not available",
    ALT: "ALT",
    "Not connected": "Not connected",
    "Post does not exist": "Post does not exist",
    "Post author has blocked you": "Post author has blocked you",
    "Click to view": "Click to view",
    "You have blocked the post author": "You have blocked the post author",
    "You have blocked the author or the author has blocked you": "You have blocked the author or the author has blocked you",
    "Show replies": "Show replies",
};

export type LanguageCode = "en";

const translations: Record<LanguageCode, Messages> = {
    en: english,
};

export function i18n<T extends keyof Messages>(key: T): Messages[T] {
    const userLocale = navigator.language || (navigator as any).userLanguage;
    const languageCode = userLocale ? (userLocale.split("-")[0] as LanguageCode) : "en";
    const implementation = translations[languageCode];
    const message = implementation ? implementation[key] : translations["en"][key];
    if (!message) {
        console.error("Unknown i18n string " + key);
        return key as any as Messages[T];
    }
    return message;
}
