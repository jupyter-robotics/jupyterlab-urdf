import { DocumentRegistry, DocumentWidget } from '@jupyterlab/docregistry';

import { Widget } from '@lumino/widgets';

import { Message } from '@lumino/messaging';

import { Signal } from '@lumino/signaling';

import { UrdfModel, UrdfChange, Position } from './model';

/**
 * UrdfWidget: widget that represents the view for a urdf (file).
 */
export class UrdfWidget extends DocumentWidget<UrdfPanel, UrdfModel> {
    constructor(options: DocumentWidget.IOptions<UrdfPanel, UrdfModel>) {
        super(options);        
    }

    // Dispose of resources held by the widget
    dispose(): void {
        this.content.dispose();
        super.dispose();
    }
}

/**
 * UrdfPanel: widget that contains the main view of the UrdfWidget.
 */
export class UrdfPanel extends Widget {
    /**
     * Construct a UrdfPanel
     * 
     * @param context - The documents context
     */
    constructor(context: DocumentRegistry.IContext<UrdfModel>) {
        super();
        this.addClass('jp-urdf-canvas');  // for css styling
        this._context = context;
        this._isDown = false;
        this._offset = { x: 0, y: 0};

        this._context.ready.then((value) => {
            // TODO

            this.update();
        });
    
        // TODO
        const obj = this._context.model.getSharedObject();
    }

    // Dispose of resources held by widget
    dispose(): void {
        if (this.isDisposed) {
            return;
        }
        Signal.clearData(this);
        super.dispose();
    }

    /**
     * Handle after-attach messages sent to widget
     * 
     * @param msg - Widget layout message
     */
    protected onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
        this._cube.addEventListener('mousedown', this, true);
        // TODO
    }

    /**
     * Handle before-detach messages sent to widget
     * 
     * @param msg - Widget layout message
     */
    protected onBeforeDetach(msg: Message): void {
        super.onBeforeDetach(msg);
        this._cube.removeEventListener('mousedown', this, true);
        // TODO
    }

    /**
     * Handle event messages sent to widget
     * 
     * @param event - Event on the widget
     */
    public handleEvent(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();

        // TODO
    }


    private _context: DocumentRegistry.IContext<UrdfModel>;
    private _isDown: boolean;
    private _offset: Position;
    private _cube: HTMLElement;
}