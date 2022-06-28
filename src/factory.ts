import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentModel
} from '@jupyterlab/docregistry';

import { UrdfWidget, UrdfPanel } from './widget';

/**
 * A widget factory to create new instances of UrdfWidgets
 */
export class UrdfWidgetFactory extends ABCWidgetFactory<
  UrdfWidget,
  DocumentModel
> {
  constructor(options: DocumentRegistry.IWidgetFactoryOptions) {
    super(options);
  }

  // Create new UrdfWidget given a context (file info)
  protected createNewWidget(
    context: DocumentRegistry.IContext<DocumentModel>
  ): UrdfWidget {
    return new UrdfWidget({
      context,
      content: new UrdfPanel(context)
    });
  }
}
