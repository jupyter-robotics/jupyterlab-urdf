import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyterlab_urdf extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_urdf:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab_urdf is activated!');
  }
};

export default plugin;
