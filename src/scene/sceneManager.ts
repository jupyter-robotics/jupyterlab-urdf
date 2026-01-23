import * as THREE from 'three';
import { URDFRobot } from 'urdf-loader';

/**
 * Manages the THREE.js scene, including lights, ground, grid, and robot model.
 */
export class SceneManager {
  public readonly scene: THREE.Scene;
  private _colorSky: THREE.Color;
  private _colorGround: THREE.Color;
  private _gridHeight = 0;
  private _robotIndex = -1;
  private _directionalLightHelper: THREE.DirectionalLightHelper | null = null;
  private _hemisphereLightHelper: THREE.HemisphereLightHelper | null = null;
  private _redrawCallback: () => void;

  constructor(
    colorSky: THREE.Color,
    colorGround: THREE.Color,
    redrawCallback: () => void
  ) {
    this.scene = new THREE.Scene();
    this._colorSky = colorSky;
    this._colorGround = colorGround;
    this._redrawCallback = redrawCallback;

    this._initScene();
  }

  /**
   * Initializes the scene
   */
  private _initScene(): void {
    this.scene.background = this._colorSky;
    this.scene.up = new THREE.Vector3(0, 0, 1); // Z is up
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
    this.scene.add(ground);
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
    this.scene.add(grid);
  }

  /**
   * Adds three lights to the scene
   */
  private _addLights(): void {
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xfff2cc, 1.8);
    directionalLight.castShadow = true;
    directionalLight.position.set(3, 3, 3);
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    this.scene.add(directionalLight);

    // Directional light helper
    this._directionalLightHelper = new THREE.DirectionalLightHelper(
      directionalLight,
      2,
      new THREE.Color(0x000000)
    );
    this._directionalLightHelper.visible = false;
    this.scene.add(this._directionalLightHelper);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    ambientLight.intensity = 0.1;
    ambientLight.position.set(0, 5, 0);
    this.scene.add(ambientLight);

    // Hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(0x8888ff, 0x442200, 0.4);
    this.scene.add(hemisphereLight);

    // Hemisphere light helper
    this._hemisphereLightHelper = new THREE.HemisphereLightHelper(
      hemisphereLight,
      2
    );
    this._hemisphereLightHelper.material.color.set(0x000000);
    this._hemisphereLightHelper.visible = false;
    this.scene.add(this._hemisphereLightHelper);
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
    const hemisphereIndex = this.scene.children
      .map(i => i.type)
      .indexOf('HemisphereLight');
    this.scene.children[hemisphereIndex] = hemisphereLight;
  }

  /**
   * Toggle the visibility of the directional light helper
   *
   * @param visible - Whether the helper should be visible
   */
  public setDirectionalLightHelperVisibility(visible: boolean): void {
    if (this._directionalLightHelper) {
      this._directionalLightHelper.visible = visible;
      this._redrawCallback();
    }
  }

  /**
   * Toggle the visibility of the hemisphere light helper
   *
   * @param visible - Whether the helper should be visible
   */
  public setHemisphereLightHelperVisibility(visible: boolean): void {
    if (this._hemisphereLightHelper) {
      this._hemisphereLightHelper.visible = visible;
      this._redrawCallback();
    }
  }

  /**
   * Updates the position of the directional light using spherical coordinates
   *
   * @param altitude - Angle in radians from the horizontal plane (elevation)
   * @param azimuth - Angle in radians around the vertical axis
   */
  public setDirectionalLightPositionSpherical(
    altitude: number,
    azimuth: number
  ): void {
    const directionalLight = this.scene.children.find(
      obj => obj.type === 'DirectionalLight'
    ) as THREE.DirectionalLight;
    if (directionalLight) {
      const distance = 3;
      const x = distance * Math.cos(altitude) * Math.cos(azimuth);
      const z = distance * Math.cos(altitude) * Math.sin(azimuth);
      const y = distance * Math.sin(altitude);
      directionalLight.position.set(x, y, z);
      if (this._directionalLightHelper) {
        this._directionalLightHelper.update();
      }
      this._redrawCallback();
    }
  }

  /**
   * Change the background color of the scene
   *
   * @param newColor - The new background color as [R, G, B] array 0-255
   */
  public setSkyColor(newColor: number[]): void {
    this._colorSky = new THREE.Color(...newColor.map(x => x / 255));
    this.scene.background = this._colorSky;
    this._updateLights();
    this._redrawCallback();
  }

  /**
   * Change the grid color of the ground
   *
   * @param newColor - The new background color as [R, G, B] array 0-255
   */
  public setGroundColor(newColor: number[]): void {
    this._colorGround = new THREE.Color(...newColor.map(x => x / 255));
    const gridIndex = this.scene.children
      .map(i => i.type)
      .indexOf('GridHelper');
    this.scene.children[gridIndex] = new THREE.GridHelper(
      50,
      50,
      this._colorGround,
      this._colorGround
    );
    this._updateLights();
    this.setGridHeight(this._gridHeight);
    this._redrawCallback();
  }

  /**
   * Changes the height of the grid in the vertical axis (y-axis for three.js)
   *
   * @param height - The height to shift the grid to
   */
  public setGridHeight(height = 0): void {
    const gridIndex = this.scene.children
      .map(i => i.type)
      .indexOf('GridHelper');
    this.scene.children[gridIndex].position.y = height;
    this._gridHeight = height;
    this._redrawCallback();
  }

  /**
   * Adds a robot to the scene or updates the existing robot
   *
   * @param robot
   */
  public setRobot(robot: URDFRobot): void {
    if (this._robotIndex !== -1) {
      this.scene.children[this._robotIndex].traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
      this.scene.children.splice(this._robotIndex, 1);
    }
    this._robotIndex = this.scene.children.length;
    this.scene.add(robot);
    this._redrawCallback();
  }

  public getRobot(): URDFRobot | null {
    return this._robotIndex !== -1
      ? (this.scene.children[this._robotIndex] as URDFRobot)
      : null;
  }

  public setDirectionalLightPosition(x: number, y: number, z: number): void {
    const directionalLight = this.scene.children.find(
      obj => obj.type === 'DirectionalLight'
    ) as THREE.DirectionalLight;
    if (directionalLight) {
      directionalLight.position.set(x, y, z);
      if (this._directionalLightHelper) {
        this._directionalLightHelper.update();
      }
      this._redrawCallback();
    }
  }

  /**
   * Updates the color of the directional light
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  public setDirectionalLightColor(newColor: number[]): void {
    const directionalLight = this.scene.children.find(
      obj => obj.type === 'DirectionalLight'
    ) as THREE.DirectionalLight;
    if (directionalLight) {
      directionalLight.color = new THREE.Color(...newColor.map(x => x / 255));
      this._redrawCallback();
    }
  }

  /**
   * Updates the intensity of the directional light
   *
   * @param intensity - The new intensity value
   */
  public setDirectionalLightIntensity(intensity: number): void {
    const directionalLight = this.scene.children.find(
      obj => obj.type === 'DirectionalLight'
    ) as THREE.DirectionalLight;
    if (directionalLight) {
      directionalLight.intensity = intensity;
      this._redrawCallback();
    }
  }

  /**
   * Updates the color of the ambient light
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  public setAmbientLightColor(newColor: number[]): void {
    const ambientLight = this.scene.children.find(
      obj => obj.type === 'AmbientLight'
    ) as THREE.AmbientLight;
    if (ambientLight) {
      ambientLight.color = new THREE.Color(...newColor.map(x => x / 255));
      this._redrawCallback();
    }
  }

  /**
   * Updates the intensity of the ambient light
   *
   * @param intensity - The new intensity value
   */
  public setAmbientLightIntensity(intensity: number): void {
    const ambientLight = this.scene.children.find(
      obj => obj.type === 'AmbientLight'
    ) as THREE.AmbientLight;
    if (ambientLight) {
      ambientLight.intensity = intensity;
      this._redrawCallback();
    }
  }

  /**
   * Updates the hemisphere light sky color
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  public setHemisphereLightSkyColor(newColor: number[]): void {
    const hemisphereLight = this.scene.children.find(
      obj => obj.type === 'HemisphereLight'
    ) as THREE.HemisphereLight;
    if (hemisphereLight) {
      hemisphereLight.color = new THREE.Color(...newColor.map(x => x / 255));
      this._redrawCallback();
    }
  }

  /**
   * Updates the hemisphere light ground color
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  public setHemisphereLightGroundColor(newColor: number[]): void {
    const hemisphereLight = this.scene.children.find(
      obj => obj.type === 'HemisphereLight'
    ) as THREE.HemisphereLight;
    if (hemisphereLight) {
      hemisphereLight.groundColor = new THREE.Color(
        ...newColor.map(x => x / 255)
      );
      this._redrawCallback();
    }
  }

  /**
   * Updates the hemisphere light intensity
   *
   * @param intensity - The new intensity value
   */
  public setHemisphereLightIntensity(intensity: number): void {
    const hemisphereLight = this.scene.children.find(
      obj => obj.type === 'HemisphereLight'
    ) as THREE.HemisphereLight;
    if (hemisphereLight) {
      hemisphereLight.intensity = intensity;
      this._redrawCallback();
    }
  }
}
