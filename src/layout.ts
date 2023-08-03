import { Message } from '@lumino/messaging';
import { PanelLayout, Widget } from '@lumino/widgets';

import { 
  DocumentRegistry,
  DocumentModel
} from '@jupyterlab/docregistry';

import { 
  DefaultLoadingManager,
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

import dat from 'dat.gui';
import URDFLoader from 'urdf-loader';

// Modify URLs for the RobotModel:
// DefaultLoadingManager.setURLModifier((url: string) => {
//   console.debug('THREE MANAGER:', url);
//   return '/files/examples/src' + url;
// });

/**
 * A URDF layout to host the URDF viewer
 */
export class URDFLayout extends PanelLayout {
  private _host: HTMLElement;
  private _robotModel: any = null;
  private _gui: any;
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
    this._urdfString = '';
    this._workingPath = '';
    this._manager = DefaultLoadingManager;
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
      new ShadowMaterial({ opacity: 0.25 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.scale.setScalar(30);
    ground.receiveShadow = true;
    this._scene.add(ground);

    const gridColor = this._groundColor;
    const grid = new GridHelper(50, 50, gridColor, gridColor);
    grid.receiveShadow = true;
    this._scene.add(grid);

    const directionalLight = new DirectionalLight(0xffffff, 1.0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024);
    directionalLight.position.set(5, 20, 5);
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

    const robotIndex = this._scene.children.map(i => { return i.name })
      .indexOf(this._robotModel.name);
    this._scene.children[robotIndex] = this._robotModel;

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
    this._scene.add(this._robotModel);

    this._manager.onLoad = () => {
      this._scene.add(this._robotModel);
      this._renderer.render(this._scene, this._camera);
    };

    this._renderer.setSize(
      this._renderer.domElement.clientWidth,
      this._renderer.domElement.clientHeight
    );
    
    this.redraw();

    // Create controller  panel
    if (!this._gui) this.setGUI();
  }

  /**
   * Create a GUI to set the joint angles / positions
   */
  setGUI(): void {
    this._gui = new dat.GUI({
      width: 310,
      autoPlace: false
    });

    // Adjust position so that it's attached to viewer
    this._gui.domElement.style.position = 'absolute';
    this._gui.domElement.style.top = 0;
    this._gui.domElement.style.right = 0;
    this._host.appendChild(this._gui.domElement);

    let settings = {
      'Working Path': this._workingPath,
      'set path': this.changeWorkingPath
    }

    const settingsFolder = this._gui.addFolder('Settings');
    settingsFolder.domElement.setAttribute("id", "settingsFolder");
    settingsFolder.open();
    settingsFolder.add(settings, 'Working Path');
    settingsFolder.add(settings, 'set path')
      .onChange(() => {
        console.log("Settings ", settings);
        this.changeWorkingPath(settings['Working Path']);
        this.updateURDF(this._urdfString);
        this.redraw();
      });

    // Add option for configuring the scene background and grid
    this._gui.addFolder('Scene').open();
    this.createColorControl();

    // Create new folder for controlling the joints
    const jointFolder = this._gui.addFolder('Joints');
    jointFolder.domElement.setAttribute("id", "jointFolder");
    jointFolder.open();
    Object.keys(this._robotModel.joints).forEach(jointName => {
      this.createJointSlider(jointName);
    });
  }

  /**
   * Set angle for revolute joints
   *
   * @param jointName - The name of the joint to be set
   */
  setJointAngle(jointName: string, newAngle: number): void {
    this._robotModel.setJointValue(jointName, newAngle);
    this.redraw();
  }

  /**
   * Creates a slider for each movable joint
   *
   * @param jointName - Name of joint as string
   */
  createJointSlider(jointName: string): void {
    // Retrieve joint
    const joint = this._robotModel.joints[jointName];

    // Skip joints which should not be moved
    if (joint._jointType === 'fixed') {
      return;
    }

    // Obtain joint limits
    let limitMin = joint.limit.lower;
    let limitMax = joint.limit.upper;

    // If the limits are not defined, set defaults to +/- 180 degrees
    if (limitMin === 0 && limitMax === 0) {
      limitMin = -Math.PI;
      limitMax = +Math.PI;
      this._robotModel.joints[jointName].limit.lower = limitMin;
      this._robotModel.joints[jointName].limit.upper = limitMax;
    }

    // Step increments for slider
    const stepSize = (limitMax - limitMin) / 20;

    // Initialize to the position given in URDF file
    const initValue = joint.jointValue[0];
    
    // Add slider to GUI
    this._gui.__folders['Joints']
      .add({[jointName]: initValue}, jointName, limitMin, limitMax, stepSize)
      .onChange((newAngle: number) => this.setJointAngle(jointName, newAngle));
  }

  updateLighting(): void {
    const hemisphereLight = new HemisphereLight(this._skyColor, this._groundColor);
    hemisphereLight.intensity = 1;
    const hemisphereIndex = this._scene.children.map( i => {return i.type} )
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
    const gridIndex = this._scene.children.map(i => { return i.type })
      .indexOf("GridHelper");
    this._scene.children[gridIndex] = new GridHelper(50, 50, gridColor, gridColor);
    this.updateLighting();
    this.redraw();
  }

  /**
   * Create color controller
   */
  createColorControl(): void {
    const backgroundObject = { Background: [38, 50, 56] };
    const gridObject = { Grid: [54, 66, 72] };

    // Add controller to GUI
    this._gui.__folders['Scene']
      .addColor(backgroundObject, 'Background')
      .onChange((newColor: number[]) => this.setBackgroundColor(newColor));

    this._gui.__folders['Scene']
      .addColor(gridObject, 'Grid')
      .onChange((newColor: number[]) => this.setGridColor(newColor));
  }

  /**
   * Changes the path to find mesh files described in the URDF
   * 
   * @param workingPath Directory path containing robot description folders
   */
  changeWorkingPath(workingPath: string): void {
    if (!workingPath) return;

    workingPath = (workingPath[0] === '/') ? workingPath.substring(1) : workingPath;
    workingPath = (workingPath[workingPath.length - 1] === '/') ?
                   workingPath.slice(0, -1) : workingPath;
    console.debug('[Manager]: Modify URL with prefix ', workingPath);
    this._workingPath = workingPath;

    this._manager.setURLModifier((url: string) => {
      const modifiedURL = '/files/' + workingPath + url;
      console.debug('[Loader]: ', url);
      return modifiedURL;
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
