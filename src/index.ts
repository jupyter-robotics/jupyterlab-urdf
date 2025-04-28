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

import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';

import { Menu } from '@lumino/widgets';

import { Token } from '@lumino/coreutils';

import { URDFWidget } from './widget';

import { URDFWidgetFactory } from './factory';

import { urdf_icon } from './icons';

// For syntax highlighting
import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';

// Name of the factory that creates the URDF widgets
const FACTORY = 'URDF Widget Factory';

/**
 * Export token so other extensions can require it
 */
export const IURDFTracker = new Token<IWidgetTracker<URDFWidget>>(
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
    IDefaultFileBrowser,
    IMainMenu,
    ILauncher,
    IEditorLanguageRegistry
  ],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    restorer: ILayoutRestorer,
    browserFactory: IDefaultFileBrowser,
    menu: IMainMenu,
    launcher: ILauncher,
    languageRegistry: IEditorLanguageRegistry
  ) => {
    const { commands, shell } = app;

    // --- track whether we've already done the split, and the two anchor IDs ---
    let splitDone = false;
    let leftEditorRefId: string | null = null;
    let rightViewerRefId: string | null = null;

    const tracker = new WidgetTracker<URDFWidget>({
      namespace: 'jupyterlab-urdf'
    });
    if (restorer) {
      restorer.restore(tracker, {
        command: 'docmanager:open',
        args: w => ({ path: w.context.path, factory: FACTORY }),
        name: w => w.context.path
      });
    }

    // Function to check if any URDF widgets are currently open
    const checkAndResetSplitState = () => {
      if (tracker.size === 0) {
        // No URDF widgets left, reset split state
        splitDone = false;
        leftEditorRefId = null;
        rightViewerRefId = null;
      }
    };

    const widgetFactory = new URDFWidgetFactory({
      name: FACTORY,
      fileTypes: ['urdf'],
      defaultFor: ['urdf']
    });

    widgetFactory.widgetCreated.connect(async (sender, widget) => {
      widget.title.icon = urdf_icon;
      widget.title.iconClass = 'jp-URDFIcon';
      widget.context.pathChanged.connect(() => tracker.save(widget));
      tracker.add(widget);

      // Add dispose listener to reset split state when all widgets are closed
      widget.disposed.connect(() => {
        checkAndResetSplitState();
      });

      if (!splitDone) {
        // First file: split out the editor to the left of this viewer
        const editor = await commands.execute('docmanager:open', {
          path: widget.context.path,
          factory: 'Editor',
          options: { mode: 'split-left', ref: widget.id }
        });
        splitDone = true;
        leftEditorRefId = editor.id;
        rightViewerRefId = widget.id;
      } else {
        // Subsequent viewers → tab them into the _right_ panel
        if (rightViewerRefId) {
          shell.add(widget, 'main', {
            mode: 'tab-after',
            ref: rightViewerRefId
          });
        }
        // And open each new editor as a tab in the _left_ panel
        if (leftEditorRefId) {
          await commands.execute('docmanager:open', {
            path: widget.context.path,
            factory: 'Editor',
            options: { mode: 'tab-after', ref: leftEditorRefId }
          });
        }
      }
    });

    app.docRegistry.addWidgetFactory(widgetFactory);
    app.docRegistry.addFileType({
      name: 'urdf',
      displayName: 'URDF',
      extensions: ['.urdf', '.xacro'],
      iconClass: 'jp-URDFIcon',
      fileFormat: 'text',
      contentType: 'file',
      mimeTypes: ['application/xml', 'text/xml'],
      icon: urdf_icon
    });

    // new‐file command now just fires the viewer; widgetCreated handles the rest
    commands.addCommand('urdf:create-new', {
      label: 'Create new URDF',
      icon: urdf_icon,
      caption: 'Create a new URDF',
      execute: async () => {
        const cwd = browserFactory.model.path;
        const { path } = await commands.execute('docmanager:new-untitled', {
          path: cwd,
          type: 'file',
          ext: '.urdf'
        });
        await commands.execute('docmanager:open', {
          path,
          factory: FACTORY
        });
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
      menu.addMenu(urdfMenu);
    }

    // Add palette item if palette is available
    if (palette) {
      palette.addItem({
        command: 'urdf:create-new',
        category: 'URDF'
      });
    }

    if (languageRegistry) {
      // FIXME: Property 'push' does not exist on type 'readonly string[]'.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      languageRegistry.findByMIME('text/xml')?.extensions?.push('urdf');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      languageRegistry.findByMIME('text/xml')?.extensions?.push('xacro');
    }
  }
};

export default extension;
