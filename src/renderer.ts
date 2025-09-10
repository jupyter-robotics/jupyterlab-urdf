import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { AxisIndicatorHelper } from './links/axisIndicator';
import { LinkManager } from './links/linkManager';
import { SceneManager } from './scene/sceneManager';

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
  private _sceneManager: SceneManager;
  private _camera: THREE.PerspectiveCamera;
  private _controls: OrbitControls;
  private _css2dRenderer: CSS2DRenderer;
  private _axisIndicator: AxisIndicatorHelper;
  private _linkManager: LinkManager;

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

    // This is needed to render the axis indicator correctly
    this.autoClear = false;

    this.setClearColor(0xffffff);
    this.setClearAlpha(0);
    this.outputColorSpace = THREE.SRGBColorSpace;
    this.shadowMap.enabled = true;
    this.shadowMap.type = THREE.PCFSoftShadowMap;

    this._sceneManager = new SceneManager(colorSky, colorGround, () =>
      this.redraw()
    );

    this._camera = new THREE.PerspectiveCamera();
    this._initCamera();

    this._controls = new OrbitControls(this._camera, this.domElement);
    this._initControls();

    // Initialize the 2D renderer for labels
    this._css2dRenderer = new CSS2DRenderer();
    this._css2dRenderer.domElement.style.position = 'absolute';
    this._css2dRenderer.domElement.style.top = '0px';
    this._css2dRenderer.domElement.style.pointerEvents = 'none';

    // Instantiate the other managers
    this._axisIndicator = new AxisIndicatorHelper(
      this._camera,
      this.domElement
    );
    this._linkManager = new LinkManager(this._sceneManager.scene, () =>
      this.redraw()
    );
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
   * Toggle the visibility of the directional light helper
   *
   * @param visible - Whether the helper should be visible
   */
  setDirectionalLightHelperVisibility(visible: boolean): void {
    this._sceneManager.setDirectionalLightHelperVisibility(visible);
  }

  /**
   * Toggle the visibility of the hemisphere light helper
   *
   * @param visible - Whether the helper should be visible
   */
  setHemisphereLightHelperVisibility(visible: boolean): void {
    this._sceneManager.setHemisphereLightHelperVisibility(visible);
  }

  /**
   * Updates the position of the directional light using spherical coordinates
   *
   * @param altitude - Angle in radians from the horizontal plane (elevation)
   * @param azimuth - Angle in radians around the vertical axis
   */
  setDirectionalLightPositionSpherical(
    altitude: number,
    azimuth: number
  ): void {
    this._sceneManager.setDirectionalLightPositionSpherical(altitude, azimuth);
  }

  /**
   * Change the background color of the scene
   *
   * @param newColor - The new background color as [R, G, B] array 0-255
   */
  setSkyColor(newColor: number[]): void {
    this._sceneManager.setSkyColor(newColor);
  }

  /**
   * Change the grid color of the ground
   *
   * @param newColor - The new background color as [R, G, B] array 0-255
   */
  setGroundColor(newColor: number[]): void {
    this._sceneManager.setGroundColor(newColor);
  }

  /**
   * Changes the height of the grid in the vertical axis (y-axis for three.js)
   *
   * @param height - The height to shift the grid to
   */
  setGridHeight(height = 0): void {
    this._sceneManager.setGridHeight(height);
  }

  /**
   * Adds a robot to the scene or updates the existing robot
   *
   * @param robot
   */
  setRobot(robot: URDFRobot): void {
    this._sceneManager.setRobot(robot);
    this._linkManager.setRobot(robot);
  }

  /**
   * Updates the position of the directional light
   *
   * @param x - The new x position
   * @param y - The new y position
   * @param z - The new z position
   */
  setDirectionalLightPosition(x: number, y: number, z: number): void {
    this._sceneManager.setDirectionalLightPosition(x, y, z);
  }

  /**
   * Updates the color of the directional light
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  setDirectionalLightColor(newColor: number[]): void {
    this._sceneManager.setDirectionalLightColor(newColor);
  }

  /**
   * Updates the intensity of the directional light
   *
   * @param intensity - The new intensity value
   */
  setDirectionalLightIntensity(intensity: number): void {
    this._sceneManager.setDirectionalLightIntensity(intensity);
  }

  /**
   * Updates the color of the ambient light
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  setAmbientLightColor(newColor: number[]): void {
    this._sceneManager.setAmbientLightColor(newColor);
  }

  /**
   * Updates the intensity of the ambient light
   *
   * @param intensity - The new intensity value
   */
  setAmbientLightIntensity(intensity: number): void {
    this._sceneManager.setAmbientLightIntensity(intensity);
  }

  /**
   * Updates the hemisphere light sky color
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  setHemisphereLightSkyColor(newColor: number[]): void {
    this._sceneManager.setHemisphereLightSkyColor(newColor);
  }

  /**
   * Updates the hemisphere light ground color
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  setHemisphereLightGroundColor(newColor: number[]): void {
    this._sceneManager.setHemisphereLightGroundColor(newColor);
  }

  /**
   * Updates the hemisphere light intensity
   *
   * @param intensity - The new intensity value
   */
  setHemisphereLightIntensity(intensity: number): void {
    this._sceneManager.setHemisphereLightIntensity(intensity);
  }

  /**
   * Toggle the axis indicator visibility
   */
  setAxisIndicatorVisibility(visible: boolean): void {
    this._axisIndicator.visible = visible;
    this.redraw();
  }

  /**
   * Shows or hides coordinate frame for a specific link
   */
  setIndividualFrameVisibility(
    linkName: string,
    visible: boolean,
    size = 0.3
  ): void {
    this._linkManager.setIndividualFrameVisibility(linkName, visible, size);
  }

  /**
   * Sets the opacity of a specific link
   *
   * @param linkName - The name of the link
   * @param opacity - Opacity value from 0 (invisible) to 1 (fully opaque)
   */
  setLinkOpacity(linkName: string, opacity: number): void {
    this._linkManager.setLinkOpacity(linkName, opacity);
  }

  /**
   * Retrieves the visual object for a given link name.
   * @param linkName - The name of the link.
   * @returns The THREE.Object3D associated with the link's visual, or null.
   */
  getLinkObject(linkName: string): THREE.Object3D | null {
    return this._linkManager.getLinkObject(linkName);
  }

  /**
   * Refreshes the viewer by re-rendering the scene and its elements
   */
  redraw(): void {
    const renderSize = this.getSize(new THREE.Vector2());
    this._camera.aspect = renderSize.width / renderSize.height;
    this._camera.updateProjectionMatrix();
    this.clear();

    this.render(this._sceneManager.scene, this._camera);

    if (this._css2dRenderer) {
      this._css2dRenderer.render(this._sceneManager.scene, this._camera);
    }

    this._axisIndicator.render(this, this._camera);
  }

  /**
   * Returns the CSS2D renderer's DOM element.
   */
  get css2dDomElement(): HTMLElement {
    return this._css2dRenderer.domElement;
  }

  /**
   * Sets the size of the CSS2D renderer.
   * @param width - The width of the renderer.
   * @param height - The height of the renderer.
   */
  setCss2dSize(width: number, height: number): void {
    this._css2dRenderer.setSize(width, height);
  }

  get camera(): THREE.PerspectiveCamera {
    return this._camera;
  }

  getRobot(): URDFRobot | null {
    return this._sceneManager.getRobot();
  }

  dispose(): void {
    this._axisIndicator.dispose();
  }
}
