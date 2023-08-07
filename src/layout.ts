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
  Color,
  Mesh,
  DirectionalLight,
  AmbientLight,
  PerspectiveCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  ShadowMaterial,
  Vector3,
  Object3D,
  GridHelper,
  SRGBColorSpace,
  Vector2,
  HemisphereLight
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import URDFLoader from 'urdf-loader';
import { XacroLoader } from 'xacro-parser';

import { URDFControls } from './controls';


/**
 * A URDF layout to host the URDF viewer
 */
export class URDFLayout extends PanelLayout {
  private _host: HTMLElement;
  private _robotModel: any = null;
  private _controlsPanel: URDFControls;
  private _manager: LoadingManager;
  private _loader: URDFLoader;
  private _scene: Scene;
  private _camera: PerspectiveCamera;
  private _renderer: WebGLRenderer;
  private _controls: OrbitControls;
  private _skyColor: Color;
  private _groundColor: Color;
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

    this._host.appendChild(this._controlsPanel.domElement);

    this._urdfString = '';
    this._workingPath = '';
    this._manager = new LoadingManager;
    this._loader = new URDFLoader(this._manager);
    this._scene = new Scene();
    this._skyColor = new Color(0x263238);
    this._groundColor = new Color(0x364248);
    this._camera = new PerspectiveCamera();
    this._renderer = new WebGLRenderer({ antialias: true });
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
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

    this._renderer.setClearColor(0xffffff);
    this._renderer.setClearAlpha(0);
    this._renderer.outputColorSpace = SRGBColorSpace;
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = PCFSoftShadowMap;

    this._scene.background = this._skyColor;
    this._scene.up = new Vector3(0, 0, 1); // Z is up

    this._camera.position.set(4, 4, 4);
    this._camera.lookAt(0, 0, 0);

    this._controls.rotateSpeed = 2.0;
    this._controls.zoomSpeed = 5;
    this._controls.panSpeed = 2;
    this._controls.enableZoom = true;
    this._controls.enableDamping = false;
    this._controls.maxDistance = 50;
    this._controls.minDistance = 0.25;
    this._controls.addEventListener('change', () => this.redraw());

    const world = new Object3D();
    this._scene.add(world);

    const ground = new Mesh(
      new PlaneGeometry(40, 40), 
      new ShadowMaterial({ opacity: 0.5 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.scale.setScalar(30);
    ground.receiveShadow = true;
    this._scene.add(ground);

    const gridColor = this._groundColor;
    const grid = new GridHelper(50, 50, gridColor, gridColor);
    grid.receiveShadow = true;
    this._scene.add(grid);

    const directionalLight = new DirectionalLight(0xffffff, 2.0);
    directionalLight.castShadow = true;
    // directionalLight.shadow.mapSize.setScalar(1024);
    directionalLight.position.set(3, 10, 3);
    directionalLight.shadow.camera.top = 2;
    directionalLight.shadow.camera.bottom = -2;
    directionalLight.shadow.camera.left = -2;
    directionalLight.shadow.camera.right = 2;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 40;
    this._scene.add(directionalLight);

    const ambientLight = new AmbientLight('#fff');
    ambientLight.intensity = 0.5;
    ambientLight.position.set(0, 5, 0);
    this._scene.add(ambientLight);

    const hemisphereLight = new HemisphereLight(this._skyColor, this._groundColor);
    hemisphereLight.intensity = 1;
    this._scene.add(hemisphereLight);

    this.redraw();

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
    this._renderer.render(this._scene, this._camera);
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

      // THREE.js          ROS URDF
      //    Y                Z
      //    |                |   Y
      //    |                | ／
      //    .-----X          .-----X
      //  ／
      // Z
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
      (newColor: number[]) => this.setBackgroundColor(newColor));
    sceneControl.grid.onChange(
      (newColor: number[]) => this.setGridColor(newColor));
    sceneControl.height.onChange(
      (newHeight: number) => this.setGridHeight(newHeight));
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


  updateLighting(): void {
    const hemisphereLight = new HemisphereLight(this._skyColor, this._groundColor);
    hemisphereLight.intensity = 1;
    const hemisphereIndex = this._scene.children.map( i => i.type )
      .indexOf("HemisphereLight");
    this._scene.children[hemisphereIndex] = hemisphereLight;
  }

  /**
   * Change the background color of the scene
   *
   * @param newColor - The new background color as RGB array [0,255]
   */
  setBackgroundColor(newColor: number[]): void {
    const bgColor = new Color(...newColor.map( x => x / 255 )); // Range: [0,1]
    this._skyColor = bgColor;
    this._scene.background = this._skyColor;
    this.updateLighting();
    this.redraw();
  }

  /**
   * Change the grid color of the ground
   *
   * @param newColor - The new grid color as RGB array [0,255]
   */
  setGridColor(newColor: number[]): void {
    const gridColor = new Color(...newColor.map( x => x / 255 )); // Range: [0,1]
    this._groundColor = gridColor;
    const gridIndex = this._scene.children.map( i => i.type )
      .indexOf("GridHelper");
    this._scene.children[gridIndex] = new GridHelper(50, 50, gridColor, gridColor);
    this.updateLighting();
    this.redraw();
  }

  setGridHeight(height: number = 0): void {
    const gridIndex = this._scene.children.map(i => i.type).indexOf("GridHelper");
    this._scene.children[gridIndex].position.y = height;
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
  }

  private _resizeWorkspace(): void {
    const rect = this.parent?.node.getBoundingClientRect();
    this._host.style.height = rect?.height + 'px';

    const currentSize = this._renderer.getSize(new Vector2);
    this._renderer.setSize(
      rect?.width || currentSize.width, 
      rect?.height || currentSize.height);
    
    this.redraw();
  }
}
