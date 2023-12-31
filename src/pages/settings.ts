import { PropertyValueMap, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { BlueSky } from "../apis/bluesky.js";
import { BaseElement, renderTopbar } from "../app.js";
import { store } from "../appstate.js";
import { i18n } from "../utils/i18n.js";
import { arrowRightIcon, bellIcon, brushIcon, shieldIcon } from "../utils/icons.js";
import { router } from "../utils/routing.js";
import { pageContainerStyle, pageContentStyle } from "../utils/styles.js";
import { error } from "../utils/utils.js";
import { Theme } from "../common.js";

type Version = { date: string; commit: string };

@customElement("settings-page")
export class SettingsPage extends BaseElement {
    @property()
    version?: Version;

    constructor() {
        super();
    }

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        super.firstUpdated(_changedProperties);
        (async () => {
            const response = await fetch("/version.json");
            if (!response) {
                error("Couldn't fetch version.json");
            }
            this.version = (await response.json()) as Version;
        })();
    }

    renderProfile(profile: any) {}

    render() {
        const user = store.get("user");
        const pushPrefs = store.get("pushPrefs")!;
        const devPrefs = store.get("devPrefs")!;

        return html`<div class="${pageContainerStyle}">
            ${renderTopbar(i18n("Settings"))}
            <div class="${pageContentStyle} mb-12">
                ${user
                    ? html`<div class="px-4 h-12 flex items-center font-semibold">${i18n("Signed in as")}</div>
                          <div class="px-4 flex gap-4">
                              <profile-avatar-name .profile=${user.profile}></profile-avatar-name>
                              <button class="btn ml-auto" @click=${this.logout}>${i18n("Sign out")}</button>
                          </div>`
                    : nothing}
                <div class="mt-8 mb-4 border-t border-divider"></div>
                <div class="px-4 h-12 flex items-center font-semibold gap-2"><i class="icon !w-5 !h-5">${brushIcon}</i>${i18n("User Interface")}</div>
                <button-group
                    @change=${(ev: CustomEvent) => this.setTheme(ev.detail.value)}
                    .values=${[
                        { label: i18n("Dark"), value: "dark" },
                        { label: i18n("Light"), value: "light" },
                    ]}
                    .selected=${store.get("theme")}
                    class="px-4 self-start"
                ></button-group>
                <div class="mt-8 mb-4 border-t border-divider"></div>
                <div class="px-4 h-12 flex items-center font-semibold gap-2"><i class="icon !w-5 !h-5">${shieldIcon}</i>${i18n("Moderation")}</div>
                <div class="px-4 flex flex-col gap-2">
                    <a href="/muted-words" class="border border-muted rounded-md pl-4 py-2 flex items-center fancy-shadow">
                        <span>${i18n("Muted words")}</span><i class="icon !w-8 !h-8 fill-primary ml-auto">${arrowRightIcon}</i>
                    </a>
                    <a href="/muted-users" class="border border-muted rounded-md pl-4 py-2 flex items-center fancy-shadow">
                        <span>${i18n("Muted users")}</span><i class="icon !w-8 !h-8 fill-primary ml-auto">${arrowRightIcon}</i>
                    </a>
                    <a href="/muted-threads" class="border border-muted rounded-md pl-4 py-2 flex items-center fancy-shadow">
                        <span>${i18n("Muted threads")}</span><i class="icon !w-8 !h-8 fill-primary ml-auto">${arrowRightIcon}</i>
                    </a>
                    <a ref="/blocked-users" class="border border-muted rounded-md pl-4 py-2 flex items-center fancy-shadow">
                        <span>${i18n("Blocked users")}</span><i class="icon !w-8 !h-8 fill-primary ml-auto">${arrowRightIcon}</i>
                    </a>
                    <a href="/moderation-lists" class="border border-muted rounded-md pl-4 py-2 flex items-center fancy-shadow">
                        <span>${i18n("Moderation lists")}</span><i class="icon !w-8 !h-8 fill-primary ml-auto">${arrowRightIcon}</i>
                    </a>
                    <a href="/content-filtering" class="border border-muted rounded-md pl-4 py-2 flex items-center fancy-shadow">
                        <span>${i18n("Content filtering")}</span><i class="icon !w-8 !h-8 fill-primary ml-auto">${arrowRightIcon}</i>
                    </a>
                </div>
                <div class="mt-8 mb-4 border-t border-divider"></div>
                <div class="px-4 h-12 flex items-center font-semibold gap-2">
                    <i class="icon !w-5 !h-5">${bellIcon}</i>${i18n("Push notifications")}
                </div>
                <slide-button
                    class="px-4 mt-2"
                    .checked=${pushPrefs.enabled}
                    .text=${i18n("Enabled")}
                    @changed=${(ev: CustomEvent) => {
                        pushPrefs.enabled = ev.detail.value;
                        store.set("pushPrefs", pushPrefs);
                        this.requestUpdate();
                    }}
                ></slide-button>
                ${pushPrefs.enabled
                    ? html` <slide-button
                              class="px-4 mt-4"
                              .checked=${pushPrefs.newFollowers}
                              .text=${i18n("New follower")}
                              @changed=${(ev: CustomEvent) => {
                                  pushPrefs.newFollowers = ev.detail.value;
                                  store.set("pushPrefs", pushPrefs);
                              }}
                          ></slide-button>
                          <slide-button
                              class="px-4 mt-4"
                              .checked=${pushPrefs.replies}
                              .text=${i18n("Replies")}
                              @changed=${(ev: CustomEvent) => {
                                  pushPrefs.replies = ev.detail.value;
                                  store.set("pushPrefs", pushPrefs);
                              }}
                          ></slide-button>
                          <slide-button
                              class="px-4 mt-4"
                              .checked=${pushPrefs.quotes}
                              .text=${i18n("Quotes")}
                              @changed=${(ev: CustomEvent) => {
                                  pushPrefs.quotes = ev.detail.value;
                                  store.set("pushPrefs", pushPrefs);
                              }}
                          ></slide-button>
                          <slide-button
                              class="px-4 mt-4"
                              .checked=${pushPrefs.reposts}
                              .text=${i18n("Reposts")}
                              @changed=${(ev: CustomEvent) => {
                                  pushPrefs.reposts = ev.detail.value;
                                  store.set("pushPrefs", pushPrefs);
                              }}
                          ></slide-button>
                          <slide-button
                              class="px-4 mt-4"
                              .checked=${pushPrefs.mentions}
                              .text=${i18n("Mentions")}
                              @changed=${(ev: CustomEvent) => {
                                  pushPrefs.mentions = ev.detail.value;
                                  store.set("pushPrefs", pushPrefs);
                              }}
                          ></slide-button>
                          <slide-button
                              class="px-4 mt-4"
                              .checked=${pushPrefs.likes}
                              .text=${i18n("Likes")}
                              @changed=${(ev: CustomEvent) => {
                                  pushPrefs.likes = ev.detail.value;
                                  store.set("pushPrefs", pushPrefs);
                              }}
                          ></slide-button>`
                    : nothing}
                <div class="mt-8 mb-4 border-t border-divider"></div>
                <div class="px-4 mt-4 text-xs">
                    Build: ${this.version?.date}<br />
                    <a href="https://github.com/badlogic/skychat/commit/">${this.version?.commit}</a>
                </div>
                <slide-button
                    class="px-4 mt-4"
                    .checked=${devPrefs.enabled}
                    .text=${"Dev mode"}
                    @changed=${(ev: CustomEvent) => {
                        devPrefs.enabled = ev.detail.value;
                        store.set("devPrefs", devPrefs);
                        this.requestUpdate();
                    }}
                ></slide-button>
            </div>
        </div>`;
    }

    logout() {
        BlueSky.logout();
        router.popAll("/");
        (document.body.querySelector("app-main") as any).requestUpdate();
    }

    setTheme(theme: Theme) {
        store.set("theme", theme);
        if (theme == "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
    }
}
