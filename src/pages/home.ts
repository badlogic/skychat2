import { FeedViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import { TemplateResult, html } from "lit";
import { customElement } from "lit/decorators.js";
import { BlueSky, FeedViewPostStream } from "../apis/bluesky.js";
import { BaseElement, renderError, renderTopbar } from "../app.js";
import { StreamView } from "../utils/streamviews.js";
import { pageContainerStyle, pageContentStyle } from "../utils/styles.js";
import { i18n } from "../utils/i18n.js";
import { store } from "../appstate.js";
import { settingsIcon } from "../utils/icons.js";

@customElement("home-timeline")
export class HomeTimelineStreamView extends StreamView<FeedViewPost> {
    count = 0;
    constructor() {
        super();
        const provider = async (cursor?: string) => BlueSky.getHomeTimeline(cursor);
        this.stream = new FeedViewPostStream(provider, true, 5000);
    }

    renderItem(item: FeedViewPost, polledItems: boolean): TemplateResult {
        return html`<feed-view-post .post=${item}></feed-view-post>`;
    }
}

@customElement("home-page")
export class HomePage extends BaseElement {
    render() {
        document.title = "Skychat - Home";
        const user = store.get("user");
        if (!user)
            return html`<div class="${pageContainerStyle}">
                <div class="${pageContentStyle}">${renderError(i18n("Not signed in"))}</div>
            </div>`;

        const homeButtons = html`<div class="md:hidden ml-auto -mr-4">
            <a href="/settings" class="text-black dark:text-white flex items-center justify-center w-12 h-12">
                <i class="icon w-6 h-6">${settingsIcon}</i>
            </a>
        </div>`;

        return html`<div class="${pageContainerStyle}">
            <div class="${pageContentStyle}">
                ${renderTopbar(i18n("Home"), undefined, homeButtons)}
                <home-timeline></home-timeline>
            </div>
        </div>`;
    }
}
