import { AtpSessionData, AtpSessionEvent, BskyAgent } from "@atproto/api";
import { User, store } from "../appstate.js";
import { error } from "../utils/utils.js";
import { Api } from "../api.js";

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
}
