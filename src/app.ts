import { LitElement, PropertyValueMap, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { i18n } from "./utils/i18n.js";
import { setupLiveReload } from "./utils/live-reload.js";
import { renderError } from "./utils/ui-components.js";
import { router } from "./utils/routing.js";
export * from "./pages/index.js";
export * from "./utils/ui-components.js";

import "./appstate.js";
import { BlueSky } from "./apis/bluesky.js";
import { store } from "./appstate.js";
import { LoginPage } from "./pages/login.js";
import { pageContainerStyle, pageContentStyle } from "./utils/styles.js";

setupLiveReload();

@customElement("app-main")
export class App extends LitElement {
    @property()
    loaded = false;

    protected createRenderRoot(): Element | ShadowRoot {
        return this;
    }

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        document.title = "Skychat";

        super.firstUpdated(_changedProperties);
        router.addRoute("/", () => html`<login-page></login-page>`);
        router.addRoute(
            "/404",
            () =>
                html`<div class="${pageContainerStyle}">
                    <div class="${pageContentStyle}">${renderError(i18n("Whoops, that page doesn't exist"))}</div>
                </div>`
        );

        router.addRoute("/settings", () => html`<settings-page></settings-page>`, true);
        router.addRoute("/home", () => html`<home-page></home-page>`, true);

        router.setRootRoute("/");
        router.setNotFoundRoot("/404");

        router.setAuthProvider(() => store.get("user") != undefined);
        this.tryLogin();
    }

    async tryLogin() {
        const user = store.get("user");
        try {
            if (!user) {
                await BlueSky.login();
                router.replace(location.pathname + location.search + location.hash);
                return;
            }

            const result = await BlueSky.login(user.account, user.password);
            if (result instanceof Error) {
                router.popAll("/login");
            } else {
                router.replace(location.pathname + location.search + location.hash);
            }
        } finally {
            this.loaded = true;
            this.requestUpdate();
        }
    }

    render() {
        if (store.get("user")) {
            if (!this.loaded) {
                return LoginPage.renderConnecting();
            } else {
                return html`<bottom-nav-bar></bottom-nav-bar>`;
            }
        }
        return html`${nothing}`;
    }
}
