import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { BaseElement } from "../app.js";
import { pageContainerStyle, pageContentStyle } from "../utils/styles.js";
import { router } from "../utils/routing.js";

@customElement("home-page")
export class HomePage extends BaseElement {
    render() {
        document.title = "Skychat - Home";

        return html`<div class="${pageContainerStyle}">
            <div class="${pageContentStyle} relative items-center min-h-screen h-[2000px]"></div>
        </div>`;
    }
}
