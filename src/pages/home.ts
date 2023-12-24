import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { BaseElement } from "../app.js";
import { pageContainerStyle, pageContentStyle } from "../utils/styles.js";

@customElement("home-page")
export class HomePage extends BaseElement {
    render() {
        return html`<div class="${pageContainerStyle} h-[2000px]">
            <div class="${pageContentStyle} relative items-center min-h-screen"></div>
        </div>`;
    }
}
