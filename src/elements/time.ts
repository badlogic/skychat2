import { LitElement, PropertyValueMap, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { state } from "../appstate.js";
import { getTimeDifference } from "../utils/utils.js";
import { BaseElement } from "../app.js";

@customElement("time-view")
export class TimeElement extends BaseElement {
    @property()
    timeUTC = new Date().getTime();

    unsubscribe = () => {};
    connectedCallback(): void {
        super.connectedCallback();
        this.unsubscribe = state.subscribe("tick", () => {
            this.requestUpdate();
        });
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.unsubscribe();
    }

    render() {
        return html`<span>${getTimeDifference(this.timeUTC)}</span>`;
    }
}
