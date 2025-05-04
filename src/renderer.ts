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
  private _directionalLightHelper: THREE.DirectionalLightHelper | null = null;
  private _hemisphereLightHelper: THREE.HemisphereLightHelper | null = null;

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

    this.printSceneLights();
  }
  printSceneLights() {
    console.log('Scene Lights:');
    this._scene.children.forEach(obj => {
      if (obj.type.includes('Light')) {
        console.log(obj);
      }
    });
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

    // Add a helper for the directional light
    this._directionalLightHelper = new THREE.DirectionalLightHelper(
      directionalLight,
      2,
      new THREE.Color(0x000000)
    );
    this._scene.add(this._directionalLightHelper);

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

    // Add a helper for the hemisphere light
    this._hemisphereLightHelper = new THREE.HemisphereLightHelper(
      hemisphereLight,
      2
    );
    this._hemisphereLightHelper.material.color.set(0x000000); // Black color for helper
    this._scene.add(this._hemisphereLightHelper);
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
   * Toggle the visibility of the directional light helper
   *
   * @param visible - Whether the helper should be visible
   */
  setDirectionalLightHelperVisibility(visible: boolean): void {
    if (this._directionalLightHelper) {
      this._directionalLightHelper.visible = visible;
      this.redraw();
    }
  }

  /**
   * Toggle the visibility of the hemisphere light helper
   *
   * @param visible - Whether the helper should be visible
   */
  setHemisphereLightHelperVisibility(visible: boolean): void {
    if (this._hemisphereLightHelper) {
      this._hemisphereLightHelper.visible = visible;
      this.redraw();
    }
  }

  /**
   * Updates the target of the directional light
   *
   * @param x - The x coordinate of the target
   * @param y - The y coordinate of the target
   * @param z - The z coordinate of the target
   */
  setDirectionalLightTarget(x: number, y: number, z: number): void {
    const directionalLight = this._scene.children.find(
      obj => obj.type === 'DirectionalLight'
    ) as THREE.DirectionalLight;

    if (directionalLight) {
      directionalLight.target.position.set(x, y, z);
      if (this._directionalLightHelper) {
        this._directionalLightHelper.update();
      }
      this.redraw();
    }
  }

  /**
   * Updates the position of the directional light using spherical coordinates
   *
   * @param distance - Distance from target
   * @param altitude - Angle in radians from the horizontal plane (elevation)
   * @param azimuth - Angle in radians around the vertical axis
   */
  setDirectionalLightPositionSpherical(
    distance: number,
    altitude: number,
    azimuth: number
  ): void {
    const directionalLight = this._scene.children.find(
      obj => obj.type === 'DirectionalLight'
    ) as THREE.DirectionalLight;

    if (directionalLight) {
      const x = distance * Math.cos(altitude) * Math.cos(azimuth);
      const z = distance * Math.cos(altitude) * Math.sin(azimuth);
      const y = distance * Math.sin(altitude);

      directionalLight.position.set(x, y, z);
      if (this._directionalLightHelper) {
        this._directionalLightHelper.update();
      }
      this.redraw();
    }
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
   * Updates the position of the directional light
   *
   * @param x - The new x position
   * @param y - The new y position
   * @param z - The new z position
   */
  setDirectionalLightPosition(x: number, y: number, z: number): void {
    const directionalLight = this._scene.children.find(
      obj => obj.type === 'DirectionalLight'
    ) as THREE.DirectionalLight;

    if (directionalLight) {
      directionalLight.position.set(x, y, z);
      if (this._directionalLightHelper) {
        this._directionalLightHelper.update();
      }
      this.redraw();
    }
  }

  /**
   * Updates the color of the directional light
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  setDirectionalLightColor(newColor: number[]): void {
    const directionalLight = this._scene.children.find(
      obj => obj.type === 'DirectionalLight'
    ) as THREE.DirectionalLight;

    if (directionalLight) {
      directionalLight.color = new THREE.Color(...newColor.map(x => x / 255));
      this.redraw();
    }
  }

  /**
   * Updates the intensity of the directional light
   *
   * @param intensity - The new intensity value
   */
  setDirectionalLightIntensity(intensity: number): void {
    const directionalLight = this._scene.children.find(
      obj => obj.type === 'DirectionalLight'
    ) as THREE.DirectionalLight;

    if (directionalLight) {
      directionalLight.intensity = intensity;
      this.redraw();
    }
  }

  /**
   * Updates the color of the ambient light
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  setAmbientLightColor(newColor: number[]): void {
    const ambientLight = this._scene.children.find(
      obj => obj.type === 'AmbientLight'
    ) as THREE.AmbientLight;

    if (ambientLight) {
      ambientLight.color = new THREE.Color(...newColor.map(x => x / 255));
      this.redraw();
    }
  }

  /**
   * Updates the intensity of the ambient light
   *
   * @param intensity - The new intensity value
   */
  setAmbientLightIntensity(intensity: number): void {
    const ambientLight = this._scene.children.find(
      obj => obj.type === 'AmbientLight'
    ) as THREE.AmbientLight;

    if (ambientLight) {
      ambientLight.intensity = intensity;
      this.redraw();
    }
  }

  /**
   * Updates the hemisphere light sky color
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  setHemisphereLightSkyColor(newColor: number[]): void {
    const hemisphereLight = this._scene.children.find(
      obj => obj.type === 'HemisphereLight'
    ) as THREE.HemisphereLight;

    if (hemisphereLight) {
      hemisphereLight.color = new THREE.Color(...newColor.map(x => x / 255));
      this.redraw();
    }
  }

  /**
   * Updates the hemisphere light ground color
   *
   * @param newColor - The new color as [R, G, B] array 0-255
   */
  setHemisphereLightGroundColor(newColor: number[]): void {
    const hemisphereLight = this._scene.children.find(
      obj => obj.type === 'HemisphereLight'
    ) as THREE.HemisphereLight;

    if (hemisphereLight) {
      hemisphereLight.groundColor = new THREE.Color(
        ...newColor.map(x => x / 255)
      );
      this.redraw();
    }
  }

  /**
   * Updates the hemisphere light intensity
   *
   * @param intensity - The new intensity value
   */
  setHemisphereLightIntensity(intensity: number): void {
    const hemisphereLight = this._scene.children.find(
      obj => obj.type === 'HemisphereLight'
    ) as THREE.HemisphereLight;

    if (hemisphereLight) {
      hemisphereLight.intensity = intensity;
      this.redraw();
    }
  }

  /**
   * Refreshes the viewer by re-rendering the scene and its elements
   */
  redraw(): void {
    const renderSize = this.getSize(new THREE.Vector2());
    this._camera.aspect = renderSize.width / renderSize.height;
    this._camera.updateProjectionMatrix();
    this.render(this._scene, this._camera);
  }
}
