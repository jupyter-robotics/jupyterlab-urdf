import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentModel
} from '@jupyterlab/docregistry';

import { URDFWidget, URDFPanel } from './widget';

/**
 * URDFWidgetFactory: a widget factory to create new instances of URDFWidgets
 */
export class URDFWidgetFactory extends ABCWidgetFactory<
  URDFWidget,
  DocumentModel
> {
  constructor(options: DocumentRegistry.IWidgetFactoryOptions) {
    super(options);
  }

  /**
   * Create new URDFWidget given a context (file info)
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<DocumentModel>
  ): URDFWidget {
    return new URDFWidget({
      context,
      content: new URDFPanel(context)
    });
  }
}
