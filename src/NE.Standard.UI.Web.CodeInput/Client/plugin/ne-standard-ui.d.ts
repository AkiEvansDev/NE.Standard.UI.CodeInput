// The framework's client as a package sees it: `window.NEStandardUI` and what its registrations hand a package back. This file is
// the contract. It lives with the framework's client (Client/plugin/), a package keeps a byte-for-byte copy beside its own client
// and includes it in its tsconfig, and PluginApiSyncTests refuses a copy that differs. On the framework's side,
// src/runtime/plugin-api-check.ts holds the runtime's real types to these shapes, so the declaration cannot promise what the
// runtime does not do. Only what a package is meant to reach is declared; the rest of the runtime is not a contract.

declare module "ne-standard-ui" {
    /** One DOM operation of a bound property, as the compiled metadata carries it; a package's own kind arrives by its name. */
    export type DomOperation = {
        readonly kind: string | number;
        readonly target?: string | null;
        readonly name?: string | null;
        readonly converter?: string | null;
        readonly condition?: string | number | null;
        readonly value?: string | null;
        readonly optional?: boolean | null;
    };

    export type DomOperationContext = {
        readonly operation: DomOperation;
        /** The element the operation lands on. */
        readonly target: Element;
        readonly value: unknown;
        readonly convertedValue: unknown;
        /** True for a value the reader produced on this page; false for one the server pushed. */
        readonly local: boolean;
    };

    /** A DOM operation by kind — the name a renderer wrote through `WebDomOperation.Custom`, or a built-in kind to override. */
    export type DomOperationRegistration = {
        readonly kind: string;
        readonly handler: (context: DomOperationContext) => void;
    };

    export type ValueConverterContext = {
        readonly name: string;
        readonly value: unknown;
    };

    /** A converter by name, as a renderer names it in a `WebDomOperation`'s converter. */
    export type ValueConverterRegistration = {
        readonly name: string;
        canConvert?(context: ValueConverterContext): boolean;
        convert(context: ValueConverterContext): unknown;
    };

    /** How a written value is read off an element carrying `data-ui-value-kind` of this kind. */
    export type ValueReaderRegistration = {
        readonly kind: string;
        readonly read: (element: Element) => unknown;
    };

    /** One item of a collection change: its key, where it sits in the source order, and the value the server sent. */
    export type CollectionChangeItem = {
        readonly key: string | null;
        /** On a replace: the key the item had before, when it changed. */
        readonly oldKey: string | null;
        readonly index: number | null;
        readonly item: unknown;
    };

    export type CollectionChangeMove = {
        readonly key: string | null;
        readonly oldIndex: number | null;
        readonly newIndex: number | null;
    };

    /** A change to a bound collection, as a sink receives it — the initial reset and insert included. */
    export type CollectionChange = {
        readonly action: "Insert" | "Remove" | "Move" | "Replace" | "Reset" | "Unknown";
        /** The component the collection is bound on. */
        readonly component: Element;
        readonly componentId: number;
        readonly dynamicParameters: readonly unknown[];
        readonly items: readonly CollectionChangeItem[];
        readonly moves: readonly CollectionChangeMove[];
    };

    /**
     * A sink by the kind a renderer wrote in `data-ui-collection-sink` on a component's root: that component's bound collection
     * reaches the handler as values, and no items host draws it as rows.
     */
    export type CollectionSinkRegistration = {
        readonly kind: string;
        readonly handler: (change: CollectionChange) => void;
    };

    export type ClientEffect = {
        readonly kind: string;
        readonly [key: string]: unknown;
    };

    export type EffectContext = {
        readonly effect: ClientEffect;
        readonly dom: DomRegistry;
    };

    /** A `ClientEffect` kind — one a command or an interaction may run. */
    export type EffectRegistration = {
        readonly kind: string;
        readonly handler: (context: EffectContext) => void;
    };

    export type EventDispatchContext<TEvent extends Event = Event> = {
        readonly domEvent: TEvent;
        readonly component: Element;
        readonly componentId: number;
        readonly dynamicParameters: readonly unknown[];
    };

    export type EventAttachContext = {
        readonly root: ParentNode;
        /** Hands a DOM event to the pipeline as if a listener of the event's name had caught it. */
        readonly dispatch: (domEvent: Event) => void;
    };

    /** An event by the name a component's metadata declares: the native event it is, and/or a custom way of attaching it. */
    export type EventRegistration<TEvent extends Event = Event> = {
        readonly domEventName?: string;
        readonly options?: AddEventListenerOptions;
        readonly preventDefault?: boolean | ((context: EventDispatchContext<TEvent>) => boolean);
        readonly stopPropagation?: boolean | ((context: EventDispatchContext<TEvent>) => boolean);
        /** The command waits for the component's value to reach the server first, as an `.OnChange` command does. */
        readonly settlesValue?: boolean;
        /** The keys the command carries, named by the engine in place of the `data-ui-key` chain above the target; null keeps the chain. */
        dynamicParameters?(context: EventDispatchContext<TEvent>): readonly unknown[] | null;
        attach?(context: EventAttachContext): void;
    };

    /** The rendered components by id, as the page holds them. */
    export type DomRegistry = {
        findComponent(componentId: number, dynamicParameters: readonly unknown[]): Element | null;
        findAllComponents(componentId: number, dynamicParameters: readonly unknown[]): Element[];
        findComponentParts(componentId: number, dynamicParameters: readonly unknown[], selector: string): HTMLElement[];
    };

    export type PropertyValueChange = {
        readonly propertyName: string;
        readonly dynamicParameters: readonly unknown[];
        readonly value: unknown;
        /** True for a value the reader produced on this page; false for one the server pushed. */
        readonly local: boolean;
        /** The component roots the patch landed on; empty when the component only exists inside an item template. */
        readonly components: readonly Element[];
    };

    /** What applies a property's value to the page, and says so after. */
    export type PropertyPatchEngine = {
        addValueChangeHandler(handler: (change: PropertyValueChange) => void): () => void;
    };

    /** The page's words, resolved for its language on the server — a package's `IUIStringsSource` among them. */
    export type ClientStrings = {
        text(key: string): string;
        /** The word with its `{name}` placeholders filled. */
        format(key: string, values: Readonly<Record<string, string | number>>): string;
    };

    export type SubtreeObserverInit = {
        readonly childList?: boolean;
        readonly characterData?: boolean;
        readonly attributeFilter?: readonly string[];
    };

    /** The one observer shape: which components under `root` a batch of mutations touched, whole components at a time. */
    export type ObserveComponents = (
        root: ParentNode,
        selector: string,
        init: SubtreeObserverInit,
        handler: (components: Iterable<HTMLElement>) => void
    ) => MutationObserver | null;

    /** Calls back whenever an element's box changes, through whatever the page has for it; returns what stops it. The first size is the caller's to read. */
    export type ObserveSize = (element: Element, handler: (element: Element) => void) => () => void;

    /** The page's dialogs by key — a view's declared ones and the ones a component registered with `AddDialog`. */
    export type Dialogs = {
        /** Shows the dialog; false when no dialog of that key is on the page. */
        open(key: string): boolean;
        close(key: string): boolean;
    };

    /** Attributes and styles the boot script writes on a component before the first paint. */
    export type ClientBootPatch = {
        readonly selector?: string;
        readonly attributes?: Readonly<Record<string, string | null>>;
        readonly styles?: Readonly<Record<string, string>>;
    };

    /** The small preferences a component keeps in the browser, under the author's own name for it (`data-ui-name`) and a slot of the engine's choosing. */
    export type ClientStore = {
        /** The stored string, or null when there is nothing stored, no name to store it under, or no storage. */
        read(component: Element, slot: string): string | null;
        /** Stores a value, or removes it when null; `boot` given sets the slot's boot patch, null clears it, omitted leaves it. */
        write(component: Element, slot: string, value: string | null, boot?: ClientBootPatch | null): void;
        readJson<TValue>(component: Element, slot: string): TValue | null;
        writeJson(component: Element, slot: string, value: unknown): void;
    };

    /** What `WebNumberCulturePack` carries — .NET's `NumberFormatInfo`, the parts a formatted number reads — as `data-ui-number-culture` holds it. */
    export type NumberCulturePack = {
        readonly decimalSeparator: string;
        readonly groupSeparator: string;
        readonly groupSizes: readonly number[];
        readonly negativeSign: string;
        readonly negativePattern: number;
        readonly decimalDigits: number;
        readonly currencySymbol: string;
        readonly currencyDecimalSeparator: string;
        readonly currencyGroupSeparator: string;
        readonly currencyGroupSizes: readonly number[];
        readonly currencyDecimalDigits: number;
        readonly currencyPositivePattern: number;
        readonly currencyNegativePattern: number;
        readonly percentSymbol: string;
        readonly percentDecimalSeparator: string;
        readonly percentGroupSeparator: string;
        readonly percentGroupSizes: readonly number[];
        readonly percentDecimalDigits: number;
        readonly percentPositivePattern: number;
        readonly percentNegativePattern: number;
    };

    /** Numbers as the server formats them: the pack off the nearest element carrying one, and a value by a standard format (`N`, `F`, `C`, `P`, `D`, with an optional precision). */
    export type NumberFormatting = {
        readCulture(element: Element): NumberCulturePack;
        /** A format outside the subset throws; no format is the value as it is, in the culture's separator and sign. */
        format(value: number, format: string | null | undefined, culture: NumberCulturePack): string;
    };

    /** What a package's engine starts from: the page's root and the services a built-in engine gets. */
    export type PluginEngineContext = {
        readonly root: ParentNode;
        readonly dom: DomRegistry;
        readonly propertyPatchEngine: PropertyPatchEngine;
        readonly strings: ClientStrings;
        readonly observeComponents: ObserveComponents;
        readonly observeSize: ObserveSize;
        readonly dialogs: Dialogs;
        readonly store: ClientStore;
        readonly numbers: NumberFormatting;
    };

    export type PluginEngine = (context: PluginEngineContext) => unknown;

    /**
     * What `window.NEStandardUI` holds; read it off the window with this type, since the framework's own declaration of the
     * property carries more than the contract. Every method works before the runtime exists — a registration made then waits for
     * it — so a package module may load before or after the framework's.
     */
    export type GlobalApi = {
        registerEvent<TEvent extends Event = Event>(name: string, registration?: EventRegistration<TEvent>): void;
        registerConverter(name: string, converter: ValueConverterRegistration | ((value: unknown) => unknown)): void;
        registerDomOperation(registration: DomOperationRegistration): void;
        registerEffect(registration: EffectRegistration): void;
        registerValueReader(registration: ValueReaderRegistration): void;
        registerCollectionSink(registration: CollectionSinkRegistration): void;
        /** Words the client writes itself, by key — an override of a built-in one; a package's own come from the server. */
        registerStrings(words: Readonly<Record<string, string>>): void;
        /** Starts a package's engine after every built-in one. */
        registerEngine(start: PluginEngine): void;
    };
}
