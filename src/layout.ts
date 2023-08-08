import { Message } from '@lumino/messaging';
import { PanelLayout, Widget } from '@lumino/widgets';

import { 
  DocumentRegistry,
  DocumentModel
} from '@jupyterlab/docregistry';

import { PageConfig } from '@jupyterlab/coreutils';

import { 
  // DefaultLoadingManager,
  LoadingManager,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Vector2,
} from 'three';

import URDFLoader from 'urdf-loader';
import { XacroLoader } from 'xacro-parser';

import { URDFControls } from './controls';
import { URDFRenderer } from './renderer';


/**
 * A URDF layout to host the URDF viewer
 */
export class URDFLayout extends PanelLayout {
  private _host: HTMLElement;
  private _robotModel: any = null;
  private _controlsPanel: URDFControls;
  private _renderer: URDFRenderer;
  private _manager: LoadingManager;
  private _loader: URDFLoader;
  private _scene: Scene;
  private _camera: PerspectiveCamera;
  private _OLDRENDERER: WebGLRenderer;
  private _workingPath: string;
  private _urdfString: string;

  /**
   * Construct a `URDFLayout`
   */
  constructor() {
    super();

    // Creating container for URDF viewer and
    // output area to render execution replies
    this._host = document.createElement('div');

    this._controlsPanel = new URDFControls();

    this._renderer = new URDFRenderer();

    this._urdfString = '';
    this._workingPath = '';
    this._manager = new LoadingManager;
    this._loader = new URDFLoader(this._manager);
    this._scene = new Scene();
    this._camera = new PerspectiveCamera();
    this._OLDRENDERER = new WebGLRenderer({ antialias: true });
  }

  /**
   * Dispose of the resources held by the widget
   */
  dispose(): void {
    this._renderer.dispose();
    super.dispose();
  }

  /**
   * Init the URDF layout
   */
  init(): void {
    super.init();

    // Add the URDF container into the DOM
    this.addWidget(new Widget({ node: this._host }));
  }

  /**
   * Create an iterator over the widgets in the layout
   */
  iter(): Iterator<Widget> {
    return [][Symbol.iterator]();
  }

  /**
   * Remove a widget from the layout
   *
   * @param widget - The `widget` to remove
   */
  removeWidget(widget: Widget): void {
    return;
  }

  redraw(): void {
    this._OLDRENDERER.render(this._scene, this._camera);
  }

  updateURDF(urdfString: string): void {
    this._robotModel = this._loader.parse(urdfString);
    this._robotModel.rotation.x = -Math.PI / 2;

    this.addRobot();
    this.redraw();
  }

  setURDF(context: DocumentRegistry.IContext<DocumentModel>): void {
    // Default to parent directory of URDF file
    if (!this._workingPath) {
      const filePath = context.path;
      const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
      this.changeWorkingPath(parentDir);
    }

    this._urdfString = context.model.toString();
    
    let robotXML;


    if (context.path.endsWith('xacro')) {
      const xacroLoader: any = new XacroLoader();
      xacroLoader.workingPath = PageConfig.getBaseUrl() + 'files/';
     
      xacroLoader.parse(
        context.model.toString(),
        (xml: XMLDocument) => { 
          robotXML = xml; 
          console.log("XML", xml);
          this._robotModel = this._loader.parse(robotXML);
          this._robotModel.rotation.x = -Math.PI / 2;

          this.addRobot();
          this.redraw();
          this._setControls();

        },
        (error: Error) => console.log(error)
        );      
    } else {

      // Load robot model
      this._robotModel = this._loader.parse(context.model.toString());


      this._robotModel.rotation.x = -Math.PI / 2;

      // TODO: redundant but necessary for files without any meshes
      this.addRobot();

      this._manager.onLoad = () => {
        this.addRobot();
        this.redraw();
      };

      this._renderer.setSize(
        this._renderer.domElement.clientWidth,
        this._renderer.domElement.clientHeight
      );
      
      this.redraw();

      this._setControls();
    }
  }

  addRobot(): void {
    if (!this._robotModel || !this._scene) return; 

    // Check if scene already has robot
    const robotIndex = this._scene.children.map(i => i.name)
      .indexOf(this._robotModel.name);

    if (robotIndex < 0) {
      this._scene.add(this._robotModel);
    } else {
      this._scene.children[robotIndex] = this._robotModel;
    }
  }

  /**
   * Set the callback functions for each of item in the controls panel
   */
  private _setControls(): void {
    if (!this._robotModel) return;

    this._setPathControls();
    this._setSceneControls();
    this._setJointControls();
  }

  /**
   * Set callback for changing working directory to given user input and 
   * render again.
   */
  private _setPathControls(): void {
    const pathControl = this._controlsPanel.createWorkspaceControls(this._workingPath);
    pathControl.onChange(
      (newPath: string = pathControl.object['Path']) => {
        this.changeWorkingPath(newPath);
        this.updateURDF(this._urdfString);
        this.redraw();
      }
    );
  }

  /**
   * Call renderer when scene colors are changed in the controls panel.
   */
  private _setSceneControls(): void {
    const sceneControl = this._controlsPanel.createSceneControls();
    sceneControl.background.onChange(
      (newColor: number[]) => this._renderer.setSkyColor(newColor));
    sceneControl.grid.onChange(
      (newColor: number[]) => this._renderer.setGroundColor(newColor));
    sceneControl.height.onChange(
      (newHeight: number) => this._renderer.setGridHeight(newHeight));
  }

  /**
   * Set callback for each joint when the value changes in the controls panel.
   */
  private _setJointControls(): void {
    const jointControl = this._controlsPanel.createJointControls(this._robotModel.joints);
    Object.keys(jointControl).forEach(
      (jointName: string) => {
        jointControl[jointName].onChange(
          (newValue = 0) => { this._setJointValue(jointName, newValue); }
        );
      }
    );
  }

  /**
   * Set value for robot joint
   *
   * @param jointName - The name of the joint to be set
   */
  private _setJointValue(jointName: string, newValue: number): void {
    this._robotModel.setJointValue(jointName, newValue);
    this.redraw();
  }

  /**
   * Changes the path to find mesh files described in the URDF
   * 
   * @param workingPath Directory path containing robot description folders
   */
  changeWorkingPath(workingPath: string): void {
    if (!workingPath) return;

    // To match '/this/format/path'
    workingPath = (workingPath[0] !== '/') ? ('/' + workingPath) : workingPath;
    workingPath = (workingPath[workingPath.length - 1] === '/') ?
                   workingPath.slice(0, -1) : workingPath;

    console.debug('[Manager]: Modify URL with prefix ', workingPath);
    this._workingPath = workingPath;

    this._manager.setURLModifier((url: string) => {
      if (url.startsWith(workingPath)) {
        console.debug('[Loader]:', url);
        return '/files' + url;
      } else {
        const modifiedURL = '/files' + workingPath + url;
        console.debug('[Loader]:', modifiedURL);
        return modifiedURL;
      }
    });
  }

  /**
   * Handle `update-request` messages sent to the widget
   */
  protected onUpdateRequest(msg: Message): void {
    this._resizeWorkspace();
  }

  /**
   * Handle `resize-request` messages sent to the widget
   */
  protected onResize(msg: Message): void {
    this._resizeWorkspace();
  }

  /**
   * Handle `fit-request` messages sent to the widget
   */
  protected onFitRequest(msg: Message): void {
    this._resizeWorkspace();
  }

  /**
   * Handle `after-attach` messages sent to the widget
   */
  protected onAfterAttach(msg: Message): void {
    this.redraw();
    this._host.appendChild(this._renderer.domElement);
    this._host.appendChild(this._controlsPanel.domElement);
  }

  private _resizeWorkspace(): void {
    const rect = this.parent?.node.getBoundingClientRect();
    this._host.style.height = rect?.height + 'px';

    const currentSize = this._renderer.getSize(new Vector2);
    this._renderer.setSize(
      rect?.width || currentSize.width, 
      rect?.height || currentSize.height);
    
    this._renderer.redraw();
  }
}
