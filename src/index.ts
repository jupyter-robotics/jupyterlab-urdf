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
    console.log('JupyterLab extension URDF is activated!');
    const { commands, shell } = app;

    // Tracker
    const namespace = 'jupyterlab-urdf';
    const tracker = new WidgetTracker<URDFWidget>({ namespace });

    // Track split state
    let leftEditorRefId: string | null = null;
    let rightViewerRefId: string | null = null;

    let isRestoring = true;
    void app.restored.then(() => {
      isRestoring = false;
      discoverLeftEditorAnchor();
    });

    function isInMain(id: string | null): boolean {
      if (!id) {
        return false;
      }
      for (const w of shell.widgets('main')) {
        if (w.id === id) {
          return true;
        }
      }
      return false;
    }

    // Check if there is an existing editor on the left
    function discoverLeftEditorAnchor(): void {
      if (leftEditorRefId && isInMain(leftEditorRefId)) {
        return;
      }
      for (const w of shell.widgets('main')) {
        if (w instanceof URDFWidget) {
          continue;
        }
        const anyW = w as any;
        const path: string | undefined = anyW?.context?.path;
        if (
          typeof path === 'string' &&
          (path.endsWith('.urdf') || path.endsWith('.xacro'))
        ) {
          leftEditorRefId = w.id;
          break;
        }
      }
    }

    // State restoration
    if (restorer) {
      restorer.restore(tracker, {
        command: 'docmanager:open',
        args: widget => ({ path: widget.context.path, factory: FACTORY }),
        name: widget => {
          console.debug('[Restorer]: Re-opening', widget.context.path);
          return widget.context.path;
        }
      });
    }

    // Create widget factory so that manager knows about widget
    const widgetFactory = new URDFWidgetFactory({
      name: FACTORY,
      fileTypes: ['urdf'],
      defaultFor: ['urdf']
    });

    // Add widget to tracker when created
    widgetFactory.widgetCreated.connect(async (sender, widget) => {
      widget.title.icon = urdf_icon;
      widget.title.iconClass = 'jp-URDFIcon';

      // Notify instance tracker if restore data needs to be updated
      widget.context.pathChanged.connect(() => {
        tracker.save(widget);
      });
      tracker.add(widget);

      // Reset split state when all widgets are closed
      widget.disposed.connect(() => {
        if (widget.id === rightViewerRefId) {
          rightViewerRefId = null;
        }
        if (tracker.size === 0) {
          rightViewerRefId = null;
        }
      });

      if (!isInMain(rightViewerRefId)) {
        rightViewerRefId = widget.id;
      }

      if (isRestoring) {
        return;
      }

      if (!isInMain(leftEditorRefId)) {
        discoverLeftEditorAnchor();
      }

      if (!isInMain(leftEditorRefId)) {
        const anchorId = rightViewerRefId || widget.id;
        try {
          const editor = await commands.execute('docmanager:open', {
            path: widget.context.path,
            factory: 'Editor',
            options: { mode: 'split-left', ref: anchorId }
          });
          leftEditorRefId = editor.id;
        } catch (e) {
          console.warn('[urdf] Failed to open paired editor (split-left):', e);
        }
      } else {
        try {
          await commands.execute('docmanager:open', {
            path: widget.context.path,
            factory: 'Editor',
            options: { mode: 'tab-after', ref: leftEditorRefId }
          });
        } catch (e) {
          console.warn('[urdf] Failed to tab-after editor:', e);
        }
      }

      if (widget.id !== rightViewerRefId) {
        if (!isInMain(rightViewerRefId)) {
          rightViewerRefId = widget.id;
        } else {
          shell.add(widget, 'main', {
            mode: 'tab-after',
            ref: rightViewerRefId
          });
        }
      }
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
      mimeTypes: ['application/xml', 'text/xml'],
      icon: urdf_icon
    });

    // Add command for creating new urdf (file)
    commands.addCommand('urdf:create-new', {
      label: 'Create new URDF',
      icon: urdf_icon,
      iconClass: 'jp-URDFIcon',
      caption: 'Create a new URDF',
      execute: () => {
        const cwd = browserFactory.model.path;
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
