import { TemplateResult, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { BaseElement } from "../app.js";

@customElement("icon-toggle")
export class IconToggle extends BaseElement {
    @property()
    value = false;

    @property()
    text = "";

    @property()
    icon?: TemplateResult;

    @property()
    iconTrue?: TemplateResult;

    animateIcon = false;

    render() {
        const animateIcon = this.animateIcon;
        return html` <div class="h-full w-full flex items-center justify-center cursor-pointer" @click=${(ev: MouseEvent) => this.toggle(ev)}>
            ${this.value
                ? html`<div class="text-primary ${animateIcon ? "animate-jump" : ""}">${this.iconTrue ?? this.icon}</div>`
                : html`<div class="text-muted-fg">${this.icon}</div>`}
            ${this.text.length > 0 ? html`<span class="ml-1 ${this.value ? "text-primary" : "text-muted-fg"}">${this.text}</span>` : nothing}
        </div>`;
    }

    toggle(ev: MouseEvent) {
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        this.value = !this.value;
        this.animateIcon = true;
        this.dispatchEvent(
            new CustomEvent("change", {
                detail: {
                    value: this.value,
                },
            })
        );
    }
}
