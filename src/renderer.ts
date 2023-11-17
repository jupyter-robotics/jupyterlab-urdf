import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { URDFRobot } from 'urdf-loader';

/**
 *   THREE.js          ROS URDF
 *      Y                Z
 *      |                |   Y
 *      |                | ／
 *      .-----X          .-----X
 *    ／
 *   Z
 */

/**
 * URDFRenderer: a renderer to manage the view of a scene with a robot
 */
export class URDFRenderer extends THREE.WebGLRenderer {
  private _scene: THREE.Scene;
  private _camera: THREE.PerspectiveCamera;
  private _controls: OrbitControls;
  private _colorSky = new THREE.Color();
  private _colorGround = new THREE.Color();
  private _gridHeight = 0;
  private _robotIndex = -1;

  /**
   * Creates a renderer to manage the scene elements
   *
   * @param colorSky - The color of the scene background
   * @param colorGround - The color of the ground (grid)
   */
  constructor(
    colorSky = new THREE.Color(0x263238),
    colorGround = new THREE.Color(0x263238)
  ) {
    super({ antialias: true });

    this._colorSky = colorSky;
    this._colorGround = colorGround;

    this.setClearColor(0xffffff);
    this.setClearAlpha(0);
    this.outputColorSpace = THREE.SRGBColorSpace;
    this.shadowMap.enabled = true;
    this.shadowMap.type = THREE.PCFSoftShadowMap;

    this._scene = new THREE.Scene();
    this._initScene();

    this._camera = new THREE.PerspectiveCamera();
    this._initCamera();

    this._controls = new OrbitControls(this._camera, this.domElement);
    this._initControls();
  }

  /**
   * Initializes the camera
   */
  private _initCamera(): void {
    this._camera.position.set(4, 4, 4);
    this._camera.lookAt(0, 0, 0);
  }

  /**
   * Initializes the orbital controls
   */
  private _initControls(): void {
    this._controls.rotateSpeed = 2.0;
    this._controls.zoomSpeed = 5;
    this._controls.panSpeed = 2;
    this._controls.enableZoom = true;
    this._controls.enableDamping = false;
    this._controls.maxDistance = 50;
    this._controls.minDistance = 0.25;
    this._controls.addEventListener('change', () => this.redraw());
  }

  /**
   * Initializes the scene
   */
  private _initScene(): void {
    this._scene.background = this._colorSky;
    this._scene.up = new THREE.Vector3(0, 0, 1); // Z is up
    this._addGround();
    this._addGrid();
    this._addLights();
  }

  /**
   * Adds a plane representing the ground to the scene
   */
  private _addGround(): void {
    // TODO: fix shadows
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.5 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.scale.setScalar(30);
    ground.receiveShadow = true;
    this._scene.add(ground);
  }

  /**
   * Adds a grid to the scene with ground color given to the constructor()
   */
  private _addGrid(): void {
    const grid = new THREE.GridHelper(
      50,
      50,
      this._colorGround,
      this._colorGround
    );
    grid.receiveShadow = true;
    this._scene.add(grid);
  }

  /**
   * Adds three lights to the scene
   */
  private _addLights(): void {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.castShadow = true;
    directionalLight.position.set(3, 10, 3);
    directionalLight.shadow.camera.top = 2;
    directionalLight.shadow.camera.bottom = -2;
    directionalLight.shadow.camera.left = -2;
    directionalLight.shadow.camera.right = 2;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 40;
    this._scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight('#fff');
    ambientLight.intensity = 0.5;
    ambientLight.position.set(0, 5, 0);
    this._scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(
      this._colorSky,
      this._colorGround
    );
    hemisphereLight.intensity = 1;
    this._scene.add(hemisphereLight);
  }

  /**
   * Updates the hemisphere light to reflect the sky and ground colors
   */
  private _updateLights(): void {
    const hemisphereLight = new THREE.HemisphereLight(
      this._colorSky,
      this._colorGround
    );
    hemisphereLight.intensity = 1;
    const hemisphereIndex = this._scene.children
      .map(i => i.type)
      .indexOf('HemisphereLight');
    this._scene.children[hemisphereIndex] = hemisphereLight;
  }

  /**
   * Change the background color of the scene
   *
   * @param newColor - The new background color as [R, G, B] array 0-255
   */
  setSkyColor(newColor: number[]): void {
    this._colorSky = new THREE.Color(...newColor.map(x => x / 255));
    this._scene.background = this._colorSky;
    this._updateLights();
    this.redraw();
  }

  /**
   * Change the grid color of the ground
   *
   * @param newColor - The new background color as [R, G, B] array 0-255
   */
  setGroundColor(newColor: number[]): void {
    this._colorGround = new THREE.Color(...newColor.map(x => x / 255));
    const gridIndex = this._scene.children
      .map(i => i.type)
      .indexOf('GridHelper');
    this._scene.children[gridIndex] = new THREE.GridHelper(
      50,
      50,
      this._colorGround,
      this._colorGround
    );
    this._updateLights();
    this.setGridHeight(this._gridHeight);
    this.redraw();
  }

  /**
   * Changes the height of the grid in the vertical axis (y-axis for three.js)
   *
   * @param height - The height to shift the grid to
   */
  setGridHeight(height = 0): void {
    const gridIndex = this._scene.children
      .map(i => i.type)
      .indexOf('GridHelper');
    this._scene.children[gridIndex].position.y = height;
    this._gridHeight = height;
    this.redraw();
  }

  /**
   * Adds a robot to the scene or updates the existing robot
   *
   * @param robot
   */
  setRobot(robot: URDFRobot): void {
    if (this._robotIndex < 0) {
      this._scene.add(robot);
      this._robotIndex = this._scene.children
        .map(i => i.name)
        .indexOf(robot.name);
    } else {
      this._scene.children[this._robotIndex] = robot;
    }
    this.redraw();
  }

  /**
   * Refreshes the viewer by re-rendering the scene and its elements
   */
  redraw(): void {
    this.render(this._scene, this._camera);
  }
}
