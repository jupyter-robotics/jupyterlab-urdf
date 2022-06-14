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

import { ILauncher } from '@jupyterlab/launcher';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { Menu } from '@lumino/widgets';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { Token } from '@lumino/coreutils';

import { UrdfWidget } from './widget';

import { UrdfWidgetFactory, UrdfModelFactory } from './factory';
// import { CommandRegistry } from '@lumino/commands';

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
    ILauncher,
  ],
  // optional: [ILauncher],
  provides: IUrdfTracker,
  activate: (
    app: JupyterFrontEnd, 
    palette: ICommandPalette, 
    restorer: ILayoutRestorer,
    browserFactory: IFileBrowserFactory,
    launcher: ILauncher,
    menu: IMainMenu,
    ) => {
    console.log('JupyterLab extension URDF is activated!');

    // const { commands, shell } = app;
    const { commands } = app;
    // const command = 'urdf:open-tab';

    // Tracker
    const namespace = 'jupyterlab-urdf';
    const tracker = new WidgetTracker<UrdfWidget>({ namespace });

    // State restoration: reopen document if it was open previously
    if (restorer) {
      restorer.restore(tracker, {
        command: 'docmanager:open',
        args: (widget) => ({ path: widget.context.path, factory: FACTORY }),
        name: (widget) => widget.context.path,
      });
    }

    // Create widget factory so that manager knows about widget
    const widgetFactory = new UrdfWidgetFactory({
      name: FACTORY,
      modelName: 'urdf-model',
      fileTypes: ['urdf'],
      defaultFor: ['urdf'],
    });

    // Add widget to tracker when created
    widgetFactory.widgetCreated.connect((sender, widget) => {
      widget.title.icon = 'jp-MaterialIcon jp-ImageIcon'; // TODO change
      // Notify instance tracker if restore data needs to be updated
      widget.context.pathChanged.connect(() => {
        tracker.save(widget);
      });
      tracker.add(widget);
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
      iconClass: 'jp-MaterialIcon jp-ImageIcon', // TODO change
      fileFormat: 'text',
      contentType: 'file',
    });

    // Add command for creating new urdf (file)
    commands.addCommand('urdf:create-new', {
      label: 'URDF',
      iconClass: 'jp-MaterialIcon jp-Image-Icon',
      caption: 'Create a new URDF',
      execute: () => {
        // Current Working Directory
        const cwd = browserFactory.defaultBrowser.model.path;
        commands.execute('docmanager:new-untitled', {
          path: cwd,
          type: 'file',
          ext: '.urdf'
        })
        .then(model =>
          commands.execute('docmanager:open', {
            path: model.path,
            factory: FACTORY,
          }));
      }
    });

    // Add launcher item if launcher is available
    if (launcher) {
      launcher.add({
        command: 'urdf:create-new',
        category: 'Other',
        rank: 20,
      });
    }

    // TODO: Add menu item if menu is available
    if (menu) {
      // addMenus(commands, menu, tracker);
      const urdfMenu: Menu = new Menu({ commands });
      urdfMenu.title.label = 'URDF';
      urdfMenu.addItem({ command: 'urdf:create-new' });
      menu.addMenu(urdfMenu, { rank: 20 });
    }

    // Add palette item if palette is available
    if (palette) {
      palette.addItem({
        command: 'urdf:create-new',
        category: 'URDF',
      });
    }
    
  }
};

export default extension;

// function addMenus(
//   commands: CommandRegistry,
//   mainMenu: IMainMenu,
//   tracker: IWidgetTracker<UrdfWidget>,
// ): void {
//   const urdfMenu = new Menu({ commands });
//   urdfMenu.title.label = 'URDF';

//   mainMenu.addMenu(urdfMenu, { rank: 50 });

//   urdfMenu.addItem({ command: 'urdf/create-new' });
//   urdfMenu.addItem({ type: 'separator' });
//   urdfMenu.addItem({ command: 'urdf/open-viewer' });
// }

