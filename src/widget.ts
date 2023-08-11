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
 * URDFWidget: widget that represents the view for a urdf (file).
 */
export class URDFWidget extends DocumentWidget<URDFPanel, DocumentModel> {
  constructor(options: DocumentWidget.IOptions<URDFPanel, DocumentModel>) {
    super(options);
  }

  // Dispose of resources held by the widget
  dispose(): void {
    this.content.dispose();
    super.dispose();
  }
}

/**
 * URDFPanel: widget that contains the main view of the URDFWidget.
 */
export class URDFPanel extends Panel {
  private _context: DocumentRegistry.IContext<DocumentModel>;

  /**
   * Construct a URDFPanel
   *
   * @param context - The documents context
   */
  constructor(context: DocumentRegistry.IContext<DocumentModel>) {
    super({ layout: new URDFLayout() });

    this.addClass('jp-urdf-canvas'); // for css styling
    this._context = context;

    // Add a basic robot template for new files
    if (!this._context.model.toString()) {
      this._context.model.fromString(
        '<?xml version="1.0"?> \n \
<robot name="robot"> \n \
    <link name="sphere"> \n \
        <visual> \n \
            <geometry> \n \
                <sphere radius="0.5"/> \n \
            </geometry> \n \
            <origin rpy="0 0 0" xyz="0 0 0.5"/> \n \
        </visual> \n \
    </link> \n \
</robot>'
      );
    }

    this._context.ready.then(value => {
      (this.layout as URDFLayout).setURDF(this._context);
      this._context.model.contentChanged.connect((sender, args) => {
        (this.layout as URDFLayout).updateURDF(this._context.model.toString());
      });
    });
  }

  /**
   * Dispose of resources held by widget
   */
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
