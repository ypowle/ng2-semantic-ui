import {
    ComponentRef, ElementRef, ViewContainerRef, ComponentFactoryResolver,
    HostListener, EventEmitter
} from "@angular/core";
import { PopupConfig, PopupTrigger } from "./popup-config";
import { SuiPopup } from "./popup";
import { SuiPopupConfig } from "./popup.service";
import { SuiComponentFactory } from "../util/component-factory.service";

export interface IPopup {
    open():void;
    close():void;
    toggle():void;
}

export abstract class SuiPopupBaseDirective implements IPopup {
    // Stores reference to generated popup component.
    protected _componentRef:ComponentRef<SuiPopup>;

    // Returns generated popup instance.
    protected get _popup():SuiPopup {
        // Use non-null assertion as we only access this when a popup exists.
        return this._componentRef.instance;
    }

    // `setTimeout` timer pointer for delayed popup open.
    private _openingTimeout:number;

    public get onOpen():EventEmitter<void> {
        return this._popup.onOpen;
    }

    public get onClose():EventEmitter<void> {
        return this._popup.onClose;
    }

    constructor(private _element:ElementRef,
                private _componentFactory:SuiComponentFactory,
                protected _popupConfig:PopupConfig) {

        // Generate a new SuiPopup component and attach it to the application view.
        this._componentRef = this._componentFactory.createComponent(SuiPopup);
        this._componentFactory.attachToApplication(this._componentRef);
        this._componentFactory.detachFromDocument(this._componentRef);

        // Configure popup with provided config, and attach a reference to the anchor element.
        this._popup.config = _popupConfig;
        this._popup.anchor = this._element;

        // When the popup is closed (onClose fires on animation complete),
        this.onClose.subscribe(() => {
            this._componentFactory.detachFromDocument(this._componentRef);
        });
    }

    public open():void {
        // Cancel the opening timer.
        clearTimeout(this._openingTimeout);

        // Start the popup opening after the specified delay interval.
        this._openingTimeout = window.setTimeout(
            () => {
                // If there is a template, inject it into the view.
                this._popup.templateSibling.clear();
                if (this._popupConfig.template) {
                    this._componentFactory.createView(this._popup.templateSibling, this._popupConfig.template, {
                        $implicit: this._popup
                    });
                } else if (this._popupConfig.component) {
                    this._componentFactory.attachToView(this._popupConfig.component, this._popup.templateSibling);
                }

                // Move the generated element to the body to avoid any positioning issues.
                this._componentFactory.moveToDocumentBody(this._componentRef);

                // Start popup open transition.
                this._popup.open();

            },
            this._popupConfig.delay);
    }

    public close():void {
        // Cancel the opening timer to stop the popup opening after close has been called.
        clearTimeout(this._openingTimeout);

        if (this._componentRef) {
            // Start popup close transition.
            this._popup.close();
        }
    }

    public toggle():void {
        // If the popup hasn't been created, or it has but it isn't currently open, open the popup.
        if (!this._componentRef || (this._componentRef && !this._popup.isOpen)) {
            return this.open();
        }

        // O'wise, close it.
        return this.close();
    }

    @HostListener("mouseenter")
    private onMouseEnter():void {
        if (this._popupConfig.trigger === PopupTrigger.Hover) {
            this.open();
        }
    }

    @HostListener("mouseleave")
    private onMouseLeave():void {
        if (this._popupConfig.trigger === PopupTrigger.Hover) {
            this.close();
        }
    }

    @HostListener("click")
    private onClick():void {
        if (this._popupConfig.trigger === PopupTrigger.Click || this._popupConfig.trigger === PopupTrigger.OutsideClick) {
            // Repeated clicks require a toggle, rather than just opening the popup each time.
            this.toggle();
        }
    }

    @HostListener("document:click", ["$event"])
    public onDocumentClick(e:MouseEvent):void {
        // If the popup trigger is outside click,
        if (this._componentRef && this._popupConfig.trigger === PopupTrigger.OutsideClick) {
            const target = e.target as Element;
            // Close the popup if the click is outside of the popup element.
            if (!(this._element.nativeElement as Element).contains(target)) {
                this.close();
            }
        }
    }

    @HostListener("focus")
    private onFocus():void {
        if (this._popupConfig.trigger === PopupTrigger.Focus) {
            this.open();
        }
    }

    @HostListener("focusout")
    private onFocusOut():void {
        if (this._popupConfig.trigger === PopupTrigger.Focus) {
            this.close();
        }
    }
}
