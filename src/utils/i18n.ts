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
}

const english: Messages = {
    "Whoops, that page doesn't exist": "Whoops, that page doesn't exist",
    "Couldn't load mesage": "Couldn't load mesage",
    "Invalid stream": "Invalid stream",
    "Sorry, an unknown error occured": "Sorry, an unknown error occured",
    "End of list": "End of list",
    footer: `Skychat is lovingly made by
        <a href="https://skychat.social/#profile/badlogic.bsky.social" target="_blank">Mario Zechner</a><br />
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
