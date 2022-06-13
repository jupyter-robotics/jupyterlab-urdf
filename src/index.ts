import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer,
} from '@jupyterlab/application';

import { 
  ICommandPalette,
  WidgetTracker,
  IWidgetTracker,
} from '@jupyterlab/apputils';

// import { Widget } from '@lumino/widgets';

import { Token } from '@lumino/coreutils';

import { UrdfWidget } from './widget';

import { UrdfWidgetFactory, UrdfModelFactory } from './factory';


// Export token so other extensions can require it
export const IUrdfTracker = new Token<IWidgetTracker<UrdfWidget>>(
  'URDFTracker'
);

 
/**
 * Initialization data for the jupyterlab_urdf document extension.
 */
const urdf_extension: JupyterFrontEndPlugin<void> = {
  id: 'urdf_documents',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer],
  provides: IUrdfTracker,
  activate: (app: JupyterFrontEnd, palette: ICommandPalette, restorer: ILayoutRestorer) => {
    console.log('JupyterLab extension URDF is activated!');

    // Tracker
    const namespace = 'urdf-documents';
    const tracker = new WidgetTracker<UrdfWidget>({ namespace });

    // State restoration: reopen document if it was open previously
    if (restorer) {
      restorer.restore(tracker, {
        command: 'docmanager:open',
        args: (widget) => ({ path: widget.context.path, factory: 'URDF Widget Factory' }),
        name: (widget) => widget.context.path,
      });
    }

    // Create widget factory so that manager knows about widget
    const widgetFactory = new UrdfWidgetFactory({
      name: 'URDF Widget Factory',
      modelName: 'urdf-model',
      fileTypes: ['urdf'],
      defaultFor: ['urdf'],
    });

    // Add widget to tracker when created
    widgetFactory.widgetCreated.connect((sender, widget) => {
      // Notify instance tracker if restore data needs to be updated
      WidgetTracker.context.pathChanged.connect(() => {
        IUrdfTracker.save(widget);
      });
      IUrdfTracker.add(widget);
    });

    // Create model factory
    const modelFactory = new UrdfModelFactory();

    // Register widget and model factories
    app.docRegistry.addWidgetFactory(widgetFactory);
    app.docRegistry.addModelFactory(modelFactory);

    // Register file type
    app.docRegistry.addFileType({
      name: 'urdf',
      displayName: 'URDF',
      extensions: ['.urdf', '.xacro'],
      fileFormat: 'text',
      contentType: 'file',
    });

    const { commands, shell } = app;
    const command = 'urdf:open-tab';

    commands.addCommand(command, {
      label: 'Open URDF Viewer',
      caption: 'Open URDF Viewer',
      execute: () => {
        const widget = new UrdfViewer();
        shell.add(widget, 'main');
      },
    });
    palette.addItem({ command, category: 'URDF' });
  }
};

export default urdf_extension;

