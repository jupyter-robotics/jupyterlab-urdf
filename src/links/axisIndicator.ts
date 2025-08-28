import * as THREE from 'three';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';

/**
 * A helper class to manage and render an axis indicator using THREE.ViewHelper.
 */
export class AxisIndicatorHelper {
  private _viewHelper: ViewHelper;
  private _proxyCamera: THREE.Camera;
  public visible = false;

  /**
   * @param camera The main scene camera to derive orientation from.
   * @param domElement The renderer's DOM element for ViewHelper instantiation.
   */
  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    // Create a dedicated camera for the ViewHelper.
    // It will be synchronized with the main camera before rendering.
    this._proxyCamera = camera.clone();
    this._viewHelper = new ViewHelper(this._proxyCamera, domElement);
  }

  /**
   * Renders the axis indicator.
   * This should be called in the main render loop, after the main scene has been rendered.
   * @param renderer The main WebGLRenderer instance.
   * @param mainCamera The main scene camera to sync with.
   */
  public render(renderer: THREE.WebGLRenderer, mainCamera: THREE.Camera): void {
    if (!this.visible) {
      return;
    }

    this._proxyCamera.quaternion.copy(mainCamera.quaternion);
    const rotationX = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2
    );
    this._proxyCamera.quaternion.premultiply(rotationX);
    this._viewHelper.render(renderer);
  }

  /**
   * Disposes of the internal ViewHelper.
   */
  public dispose(): void {
    this._viewHelper.dispose();
  }
}
