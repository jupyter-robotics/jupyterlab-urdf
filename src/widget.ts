import {
  DocumentRegistry,
  DocumentWidget,
  DocumentModel
} from '@jupyterlab/docregistry';

import { Panel } from '@lumino/widgets';

import { Message } from '@lumino/messaging';

import { Signal } from '@lumino/signaling';

import { URDFLayout } from './layout';

/**
 * UrdfWidget: widget that represents the view for a urdf (file).
 */
export class UrdfWidget extends DocumentWidget<UrdfPanel, DocumentModel> {
  constructor(options: DocumentWidget.IOptions<UrdfPanel, DocumentModel>) {
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
export class UrdfPanel extends Panel {
  private _context: DocumentRegistry.IContext<DocumentModel>;

  /**
   * Construct a UrdfPanel
   *
   * @param context - The documents context
   */
  constructor(context: DocumentRegistry.IContext<DocumentModel>) {
    super({ layout: new URDFLayout() });

    this.addClass('jp-urdf-canvas'); // for css styling
    this._context = context;

    this._context.ready.then(value => {
      (this.layout as URDFLayout).setURDF(this._context.model.toString());
      this._context.model.contentChanged.connect((sender, args) => {
        console.log('Model changed.', args);
        (this.layout as URDFLayout).setURDF(this._context.model.toString());
      });
    });
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
  }

  /**
   * Handle before-detach messages sent to widget
   *
   * @param msg - Widget layout message
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
  }
}
