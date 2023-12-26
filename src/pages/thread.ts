import { customElement } from "lit/decorators.js";
import { BaseElement, renderTopbar } from "../app.js";
import { html } from "lit";
import { pageContainerStyle, pageContentStyle } from "../utils/styles.js";
import { i18n } from "../utils/i18n.js";

@customElement("thread-page")
export class ThreadPage extends BaseElement {
    render() {
        const buttons = html`<div class="md:hidden ml-auto -mr-4"></div>`;

        return html`<div class="${pageContainerStyle}">
            <div class="${pageContentStyle}">${renderTopbar(i18n("Thread"), undefined, buttons)}</div>
        </div>`;
    }
}
