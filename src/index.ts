import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import {
  ICommandPalette,
  WidgetTracker,
  IWidgetTracker
} from '@jupyterlab/apputils';

import { ILauncher } from '@jupyterlab/launcher';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { Menu } from '@lumino/widgets';

import { Token } from '@lumino/coreutils';

import { UrdfWidget } from './widget';

import { UrdfWidgetFactory } from './factory';

import { urdf_icon } from './icons';

// Name of the factory that creates the URDF widgets
const FACTORY = 'URDF Widget Factory';

// Export token so other extensions can require it
export const IUrdfTracker = new Token<IWidgetTracker<UrdfWidget>>(
  'urdf-tracker'
);

/**
 * Initialization data for the jupyterlab_urdf document extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-urdf:extension',
  autoStart: true,
  requires: [
    ICommandPalette,
    ILayoutRestorer,
    IFileBrowserFactory,
    IMainMenu,
    ILauncher
  ],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    restorer: ILayoutRestorer,
    browserFactory: IFileBrowserFactory,
    menu: IMainMenu,
    launcher: ILauncher
  ) => {
    console.log('JupyterLab extension URDF is activated!');
    const { commands } = app;

    // Tracker
    const namespace = 'jupyterlab-urdf';
    const tracker = new WidgetTracker<UrdfWidget>({ namespace });

    // State restoration: reopen document if it was open previously
    if (restorer) {
      restorer.restore(tracker, {
        command: 'docmanager:open',
        args: widget => ({ path: widget.context.path, factory: FACTORY }),
        name: widget => widget.context.path
      });
    }

    // Create widget factory so that manager knows about widget
    const widgetFactory = new UrdfWidgetFactory({
      name: FACTORY,
      fileTypes: ['urdf'],
      defaultFor: ['urdf']
    });

    // Add widget to tracker when created
    widgetFactory.widgetCreated.connect((sender, widget) => {
      widget.title.icon = urdf_icon;
      widget.title.iconClass = 'jp-URDFIcon';

      // Notify instance tracker if restore data needs to be updated
      widget.context.pathChanged.connect(() => {
        tracker.save(widget);
      });
      tracker.add(widget);
    });

    // Register widget and model factories
    app.docRegistry.addWidgetFactory(widgetFactory);

    // Register file type
    app.docRegistry.addFileType({
      name: 'urdf',
      displayName: 'URDF',
      extensions: ['.urdf', '.xacro'],
      iconClass: 'jp-URDFIcon',
      fileFormat: 'text',
      contentType: 'file',
      icon: urdf_icon
    });

    // Add command for creating new urdf (file)
    commands.addCommand('urdf:create-new', {
      label: 'Create new URDF',
      icon: urdf_icon,
      iconClass: 'jp-URDFIcon',
      caption: 'Create a new URDF',
      execute: () => {
        const cwd = browserFactory.defaultBrowser.model.path;
        commands
          .execute('docmanager:new-untitled', {
            path: cwd,
            type: 'file',
            ext: '.urdf'
          })
          .then(model =>
            commands.execute('docmanager:open', {
              path: model.path,
              factory: FACTORY
            })
          );
      }
    });

    // Add launcher item if launcher is available
    if (launcher) {
      launcher.add({
        command: 'urdf:create-new',
        category: 'Other',
        rank: 20
      });
    }

    // Add menu item if menu is available
    if (menu) {
      const urdfMenu: Menu = new Menu({ commands });
      urdfMenu.title.label = 'URDF';
      urdfMenu.addItem({ command: 'urdf:create-new' });
      menu.addMenu(urdfMenu, { rank: 20 });
    }

    // Add palette item if palette is available
    if (palette) {
      palette.addItem({
        command: 'urdf:create-new',
        category: 'URDF'
      });
    }
  }
};

export default extension;
