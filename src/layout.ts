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
  sRGBEncoding,
  PCFSoftShadowMap,
  PlaneGeometry,
  ShadowMaterial
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import dat from 'dat.gui';
import URDFLoader from 'urdf-loader';

// Modify URLs for the RobotModel:
DefaultLoadingManager.setURLModifier((url: string) => {
  console.debug('THREE MANAGER:', url);
  return '/lab/tree' + url;
});

/**
 * A URDF layout to host the URDF viewer
 */
export class URDFLayout extends PanelLayout {
  private _host: HTMLElement;
  private _viewer: any;
  private _robotModel: any = null;
  private _gui: any;
  private _manager: LoadingManager;
  private _loader: URDFLoader;
  private _scene: Scene;
  private _camera: PerspectiveCamera;
  private _renderer: WebGLRenderer;
  private _controls: OrbitControls;

  /**
   * Construct a `URDFLayout`
   */
  constructor() {
    super();

    // Creating container for URDF viewer and
    // output area to render execution replies
    this._host = document.createElement('div');

    this._manager = DefaultLoadingManager;
    this._loader = new URDFLoader(this._manager);
    this._scene = new Scene();
    this._camera = new PerspectiveCamera();
    this._renderer = new WebGLRenderer({ antialias: true });
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
  }

  /**
   * Dispose of the resources held by the widget
   */
  dispose(): void {
    this._viewer.destroy();
    super.dispose();
  }

  /**
   * Init the URDF layout
   */
  init(): void {
    super.init();

    this._renderer.outputEncoding = sRGBEncoding;
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = PCFSoftShadowMap;

    this._scene.background = new Color(0x263238);

    this._camera.position.set(4, 4, 4);
    this._camera.lookAt(0, 0, 0);

    const directionalLight = new DirectionalLight(0xffffff, 1.0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024);
    directionalLight.position.set(5, 30, 5);

    const ground = new Mesh(
      new PlaneGeometry(), 
      new ShadowMaterial({ opacity: 0.25 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.scale.setScalar(30);
    ground.receiveShadow = true;
    this._scene.add(ground);

    const ambientLight = new AmbientLight(0xffffff, 0.2);
    this._scene.add(ambientLight);
    this._scene.add(directionalLight);

    this._controls.minDistance = 4;
    this._controls.target.y = 1;
    this._controls.update();


    this._renderer.render(this._scene, this._camera);

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

  setURDF(context: DocumentRegistry.IContext<DocumentModel>): void {
    // Load robot model
    if (this._robotModel !== null && this._robotModel.object.parent !== null) {
      // Remove old robot model from visualization
      // Viewer -> Scene -> Group -> Robot Model
      this._robotModel.object.parent.remove(this._robotModel.object);
    }

    console.log("[WIP] Loader: ", this._loader);

    this._robotModel = this._loader.parse(context.model.toString());
    // THREE.js
    //   Y
    //   |
    //   |
    //   .-----X
    // ／
    // Z

    // ROS URDf
    //       Z
    //       |   X
    //       | ／
    // Y-----.
    this._robotModel.rotation.x = -Math.PI / 2;

    console.log("REMOVE Got something ", this._robotModel);
    // @ts-ignore
    window['roob'] = this._robotModel; // REMOVE

    this._scene.add(this._robotModel);
    // @ts-ignore
    window['scee'] = this._scene; // REMOVE

    // this._manager.onLoad = () => {
    //   console.log("REMOVE adding to scene");
    //   this._scene.add(this._robotModel);
    // };

    // https://github.com/RoboStack/amphion/blob/879045327e879d0bb6fe2c8eac54664de46ef675/src/core/urdf.ts#L46
    // const ros = new ROSLIB.Ros();
    // this._robotModel = new Amphion.RobotModel(ros, 'robot_description');
    // this._robotModel.loadURDF(data, this._robotModel.onComplete, {});
    // this._viewer.addVisualization(this._robotModel);

    // Create controller  panel
    this.setGUI();

    this._renderer.setSize(
      this._renderer.domElement.clientWidth,
      this._renderer.domElement.clientHeight
    );
    this._renderer.render(this._scene, this._camera);

    this._renderer.render(this._scene, this._camera);
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

    // Add option for configuring the scene background
    this._gui.addFolder('Scene').open();
    this.createColorControl();

    // Create new folder for the joints
    this._gui.addFolder('Robot Joints').open();
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
    this._robotModel.joints[jointName].setAngle(newAngle);
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
    const initValue = joint.jointValue;

    // Object to be manipulated
    const jointObject = { [jointName]: initValue };
    
    // Add slider to GUI
    // FIXME: controller is null
    console.log("FIXME: ", stepSize, jointObject);
    // this._gui.__folders['Robot Joints']
    //   .add(jointObject, jointName, limitMin, limitMax, stepSize)
    //   .onChange((newAngle: any) => this.setJointAngle(jointName, newAngle));
  }

  /**
   * Change the background color of the scene
   *
   * @param bgColor - The new background color as RGB array
   */
  setBGColor(bgColor: number[]): void {
    bgColor = bgColor.map( x => x / 255 );
    this._scene.background = new Color( ...bgColor );
    this._renderer.render(this._scene, this._camera);
  }

  /**
   * Create color controller
   */
  createColorControl(): void {
    const defaultColor = [240, 240, 240];

    // Object to be manipulated
    const colorObject = { Background: defaultColor };

    // Add controller to GUI
    this._gui.__folders['Scene']
      .addColor(colorObject, 'Background')
      .onChange((newColor: any) => this.setBGColor(newColor));
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
    // Inject Amphion
    // this._viewer = new Amphion.Viewer3d();
    // this._viewer.setContainer(this._host);
    // const renderer = new WebGLRenderer({ antialias: true });
    this._renderer.render(this._scene, this._camera);
    // @ts-ignore
    window['renen'] = this._renderer;
    // @ts-ignore
    window['camcam'] = this._camera;

    this._host.appendChild(this._renderer.domElement);
  }

  private _resizeWorkspace(): void {
    const rect = this.parent?.node.getBoundingClientRect();
    this._host.style.height = rect?.height + 'px';
  }
}
