import { html, nothing } from "lit";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { customElement, property } from "lit/decorators.js";
import { BaseElement, renderError } from "../app.js";
import { i18n } from "../utils/i18n.js";
import { logo, spinnerIcon } from "../utils/icons.js";
import { pageContainerStyle, pageContentStyle } from "../utils/styles.js";
import { router } from "../utils/routing.js";
import { error, sleep } from "../utils/utils.js";
import { BlueSky } from "../apis/bluesky.js";
import { store } from "../appstate.js";

@customElement("login-page")
export class LoginPage extends BaseElement {
    @property()
    isConnecting = false;

    @property()
    error?: string;

    constructor() {
        super();
        const user = store.get("user");
        if (user) this.login(user?.account, user?.password);
    }

    render() {
        if (this.isConnecting) return LoginPage.renderConnecting();
        return this.renderLogin();
    }

    renderLogin() {
        return html`<div class="${pageContainerStyle}">
            <div class="${pageContentStyle} items-center min-h-screen">
                <a class="text-2xl flex align-center justify-center text-primary font-semibold text-center my-8" href="/"
                    ><i class="w-8 h-8">${logo}</i><span class="ml-2">Skychat</span></a
                >
                <span class="text-xs -mt-4 mb-8 text-muted-fg">A pretty good BlueSky app</span>
                <div class="flex flex-col w-[300px] max-w-[300px] gap-2">
                    ${this.error ? renderError(this.error) : nothing}
                    <span class="text-muted-fg text-sm">${i18n("Username")}</span>
                    <input id="username" class="textfield" />
                    <span class="text-muted-fg text-sm">${i18n("App password")}</span>
                    <input id="password" class="textfield" type="password" />
                    <button
                        class="w-full button"
                        @click=${() =>
                            this.login(
                                this.querySelector<HTMLInputElement>("#username")?.value ?? "",
                                this.querySelector<HTMLInputElement>("#password")?.value ?? ""
                            )}
                    >
                        ${i18n("Sign in")}
                    </button>
                    <div class="flex items-center gap-2">
                        <div class="flex-grow border-b border-divider"></div>
                        <span class="text-center text-muted-fg text-xs">${i18n("or")}</span>
                        <div class="flex-grow border-b border-divider"></div>
                    </div>
                    <button class="w-full button-muted" @click=${() => router.push("/explore")}>${i18n("Explore BlueSky without account")}</button>
                </div>
                <div class="flex-grow"></div>
                <div class="text-center text-xs italic pt-8 pb-4">${unsafeHTML(i18n("footer"))}</div>
            </div>
        </div>`;
    }

    async login(user: string, password: string) {
        this.isConnecting = true;
        try {
            if (!user.includes(".")) user = user + ".bsky.social";
            const result = await BlueSky.login(user, password);
            if (result instanceof Error) throw result;
            router.replace("/home");
        } catch (e) {
            error("Could not sign in", e);
            this.error = i18n("Could not sign in");
        } finally {
            this.isConnecting = false;
            (document.body.querySelector("app-main") as any).requestUpdate();
        }
    }

    static renderConnecting() {
        return html`<div class="${pageContainerStyle}">
            <div class="${pageContentStyle} items-center min-h-screen">
                <a class="text-2xl flex align-center justify-center text-primary font-semibold text-center my-8" href="/"
                    ><i class="w-8 h-8">${logo}</i><span class="ml-2">Skychat</span></a
                >
                <span class="text-xs -mt-4 mb-8 text-muted-fg">A pretty good BlueSky app</span>
                <div class="flex items-center justify-center w-[300px] max-w-[300px] gap-2">
                    <i class="animate-spin w-8 h-8 text-primary">${spinnerIcon}</i><span>${i18n("Connecting ...")}
                </div>
                <div class="flex-grow"></div>
                <div class="text-center text-xs italic pt-8 pb-4">${unsafeHTML(i18n("footer"))}</div>
            </div>
        </div>`;
    }
}
