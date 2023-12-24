import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { getScrollParent, dom, BaseElement } from "../app.js";
import { bellIcon, cloudIcon, hashIcon, homeIcon, listIcon, searchIcon, settingsIcon } from "../utils/icons.js";
import { Store } from "../utils/store.js";
import { store } from "../appstate.js";
import { defaultAvatar } from "./default-icons.js";

@customElement("bottom-nav-bar")
export class BottomNavBar extends BaseElement {
    protected createRenderRoot(): Element | ShadowRoot {
        return this;
    }

    @property()
    hide = false;

    lastScrollTop = 0;
    scrollHandler = () => this.handleScroll();
    handleScroll() {
        const dir = this.lastScrollTop - getScrollParent(this.parentElement)!.scrollTop;
        if (dir != 0) {
            this.hide = dir < 0;
        }
        this.lastScrollTop = getScrollParent(this.parentElement)!.scrollTop;
    }

    connectedCallback(): void {
        super.connectedCallback();
        const scrollParent = getScrollParent(this);
        if (scrollParent == document.documentElement) {
            window.addEventListener("scroll", this.scrollHandler);
        } else {
            getScrollParent(this)!.addEventListener("scroll", this.scrollHandler);
        }
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        getScrollParent(this)!.removeEventListener("scroll", this.scrollHandler);
    }

    render() {
        const animationStyle = `transition-transform  ${this.hide ? "translate-y-full md:translate-y-0" : "translate-y-0"}`;
        const baseStyle = `${animationStyle} fixed border-t border-divider backdrop-blur-[8px] z-20 bg-[#fff]/80 dark:bg-[#111]/80`;
        const mobileStyle = `w-full left-0 bottom-0 px-2`;
        const desktopStyle = `md:px-0 md:w-auto md:border-none md:top-0 md:left-[calc(50vw-320px-56px)]`;

        return html`<div class="${baseStyle} ${mobileStyle} ${desktopStyle}">
            <div class="flex justify-between md:flex-col md:justify-start md:align-center md:gap-2">
                <up-button class="absolute"></up-button>
                <a href="/home" class="text-black dark:text-white flex items-center justify-center w-12 h-12">
                    <i class="icon w-6 h-6">${homeIcon}</i>
                </a>
                <a href="/settings" class="text-black dark:text-white flex items-center justify-center w-12 h-12">
                    <i class="icon w-6 h-6">${settingsIcon}</i>
                </a>
                <a href="/hashtags" class="text-black dark:text-white flex items-center justify-center w-12 h-12">
                    <i class="icon w-6 h-6">${hashIcon}</i>
                </a>
                <a href="/lists" class="text-black dark:text-white flex items-center justify-center w-12 h-12">
                    <i class="icon w-6 h-6">${listIcon}</i>
                </a>
                <a href="/feeds" class="text-black dark:text-white flex items-center justify-center w-12 h-12">
                    <i class="icon w-6 h-6">${cloudIcon}</i>
                </a>
                <a href="/search" class="text-black dark:text-white flex items-center justify-center w-12 h-12">
                    <i class="icon w-6 h-6">${searchIcon}</i>
                </a>
                <a href="/notifications" class="text-black dark:text-white flex items-center justify-center w-12 h-12">
                    <i class="icon w-6 h-6">${bellIcon}</i>
                </a>
            </div>
        </div>`;
    }
}