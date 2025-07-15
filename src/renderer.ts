import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  CSS2DRenderer,
  CSS2DObject
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { URDFRobot } from 'urdf-loader';

import { Signal } from '@lumino/signaling';

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
  private _css2dRenderer: CSS2DRenderer;
  private _colorSky = new THREE.Color();
  private _colorGround = new THREE.Color();
  private _gridHeight = 0;
  private _robotIndex = -1;
  private _directionalLightHelper: THREE.DirectionalLightHelper | null = null;
  private _hemisphereLightHelper: THREE.HemisphereLightHelper | null = null;
  private _raycaster: THREE.Raycaster;
  private _mouse: THREE.Vector2;
  // private _selectedLink: THREE.Object3D | null = null;
  private _editorMode = false;
  private _hoveredObj: {
    link: any | null;
    originalMaterial: THREE.Material | THREE.Material[] | null;
    tag: CSS2DObject | null;
  } = { link: null, originalMaterial: null, tag: null };
  private _selectedParentObj: {
    link: any | null;
    originalMaterial: THREE.Material | THREE.Material[] | null;
    tag: CSS2DObject | null;
  } = {
    link: null,
    originalMaterial: null,
    tag: null
  };
  private _selectedChildObj: {
    link: any | null;
    originalMaterial: THREE.Material | THREE.Material[] | null;
    tag: CSS2DObject | null;
  } = {
    link: null,
    originalMaterial: null,
    tag: null
  };
  private _highlightMaterial: THREE.Material;
  private _parentSelectMaterial: THREE.Material;
  private _childSelectMaterial: THREE.Material;

  public linkSelected = new Signal<this, THREE.Object3D>(this);

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

    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._setupPicking();
    this._setupHovering();

    // Initialize materials for highlighting
    this._highlightMaterial = new THREE.MeshPhongMaterial({
      emissive: '#ffff00',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.5
    });
    this._parentSelectMaterial = new THREE.MeshPhongMaterial({
      emissive: '#00ff00',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.5
    });
    this._childSelectMaterial = new THREE.MeshPhongMaterial({
      emissive: '#0000ff',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.5
    });

    // Initialize the 2D renderer for labels
    this._css2dRenderer = new CSS2DRenderer();
    this._css2dRenderer.domElement.style.position = 'absolute';
    this._css2dRenderer.domElement.style.top = '0px';
    this._css2dRenderer.domElement.style.pointerEvents = 'none';
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
   * Sets up picking functionality
   */
  private _setupPicking(): void {
    this.domElement.addEventListener('click', (event: MouseEvent) => {
      if (!this._editorMode) {
        return;
      }

      const rect = this.domElement.getBoundingClientRect();
      this._mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this._mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this._raycaster.setFromCamera(this._mouse, this._camera);

      const robot = this._scene.children[this._robotIndex];
      if (robot) {
        const intersects = this._raycaster.intersectObject(robot, true);

        if (intersects.length > 0) {
          const selectedObject = intersects[0].object;
          this.linkSelected.emit(selectedObject);
        }
      }
    });
  }

  /**
   * Sets up hovering functionality
   */
  private _setupHovering(): void {
    this.domElement.addEventListener('mousemove', (event: MouseEvent) => {
      if (!this._editorMode) {
        return;
      }

      const rect = this.domElement.getBoundingClientRect();
      this._mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this._mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this._raycaster.setFromCamera(this._mouse, this._camera);

      const robot = this._scene.children[this._robotIndex];
      if (robot) {
        const intersects = this._raycaster.intersectObject(robot, true);

        // Un-highlight the previously hovered object
        if (this._hoveredObj.link) {
          this._hoveredObj.link.material = this._hoveredObj.originalMaterial;
          if (this._hoveredObj.tag) {
            this._hoveredObj.link.remove(this._hoveredObj.tag);
          }
          this._hoveredObj = { link: null, originalMaterial: null, tag: null };
          this.redraw();
        }

        if (intersects.length > 0) {
          const hoveredObject = intersects[0].object as any;

          // Don't highlight already selected links
          if (
            hoveredObject === this._selectedParentObj.link ||
            hoveredObject === this._selectedChildObj.link
          ) {
            return;
          }

          this._hoveredObj.link = hoveredObject;
          this._hoveredObj.originalMaterial = hoveredObject.material;
          hoveredObject.material = this._highlightMaterial;

          // Find the link name by traversing up the hierarchy
          let visual: any = hoveredObject;
          while (visual && !visual.isURDFVisual) {
            visual = visual.parent;
          }

          // Add a tag with the link's name
          if (visual && visual.urdfNode?.parentElement) {
            const linkName = visual.urdfNode.parentElement.getAttribute('name');
            const tagDiv = document.createElement('div');
            tagDiv.className = 'jp-urdf-label';
            tagDiv.textContent = linkName;
            tagDiv.style.backgroundColor = 'yellow';
            tagDiv.style.color = 'black';

            const tag = new CSS2DObject(tagDiv);
            this._hoveredObj.tag = tag;
            hoveredObject.add(tag);
          }

          this.redraw();
        }
      }
    });
  }

  /**
   * Enables or disables editor mode
   *
   * @param enabled - Whether editor mode is enabled
   */
  setEditorMode(enabled: boolean): void {
    this._editorMode = enabled;

    if (!enabled) {
      this.clearHighlights();
    }
  }

  /**
   * Highlights a selected link and adds a tag.
   * @param link - The link object to highlight.
   * @param type - The type of selection ('parent' or 'child').
   */
  highlightLink(link: any, type: 'parent' | 'child'): void {
    const material =
      type === 'parent'
        ? this._parentSelectMaterial
        : this._childSelectMaterial;
    const selectedObj =
      type === 'parent' ? this._selectedParentObj : this._selectedChildObj;

    // Clear previous selection of the same type
    if (selectedObj.link) {
      selectedObj.link.material = selectedObj.originalMaterial;
      if (selectedObj.tag) {
        selectedObj.link.remove(selectedObj.tag);
      }
    }

    // Apply new highlight
    // The true original material is the one stored on hover.
    selectedObj.originalMaterial = this._hoveredObj.originalMaterial;
    link.material = material;
    selectedObj.link = link;

    // Add tag
    const tagDiv = document.createElement('div');
    tagDiv.className = 'jp-urdf-label';
    tagDiv.textContent = type;
    tagDiv.style.backgroundColor = type === 'parent' ? 'green' : 'blue';

    const tag = new CSS2DObject(tagDiv);
    link.add(tag);
    selectedObj.tag = tag;

    this.redraw();
  }

  /**
   * Clears all highlights and tags from selected links.
   */
  clearHighlights(): void {
    if (this._selectedParentObj.link) {
      this._selectedParentObj.link.material =
        this._selectedParentObj.originalMaterial;
      if (this._selectedParentObj.tag) {
        this._selectedParentObj.link.remove(this._selectedParentObj.tag);
      }
      this._selectedParentObj = {
        link: null,
        originalMaterial: null,
        tag: null
      };
    }
    if (this._selectedChildObj.link) {
      this._selectedChildObj.link.material =
        this._selectedChildObj.originalMaterial;
      if (this._selectedChildObj.tag) {
        this._selectedChildObj.link.remove(this._selectedChildObj.tag);
      }
      this._selectedChildObj = {
        link: null,
        originalMaterial: null,
        tag: null
      };
    }
    this.redraw();
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
    this._scene.add(directionalLight);

    // Directional light helper
    this._directionalLightHelper = new THREE.DirectionalLightHelper(
      directionalLight,
      2,
      new THREE.Color(0x000000)
    );
    this._directionalLightHelper.visible = false;
    this._scene.add(this._directionalLightHelper);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    ambientLight.intensity = 0.1;
    ambientLight.position.set(0, 5, 0);
    this._scene.add(ambientLight);

    // Hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(
      0x8888ff, // cool sky
      0x442200, // warm ground
      0.4
    );
    this._scene.add(hemisphereLight);

    // Hemisphere light helper
    this._hemisphereLightHelper = new THREE.HemisphereLightHelper(
      hemisphereLight,
      2
    );
    this._hemisphereLightHelper.material.color.set(0x000000);
    this._hemisphereLightHelper.visible = false; // Set to hidden by default
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
   * Updates the position of the directional light using spherical coordinates
   *
   * @param altitude - Angle in radians from the horizontal plane (elevation)
   * @param azimuth - Angle in radians around the vertical axis
   */
  setDirectionalLightPositionSpherical(
    altitude: number,
    azimuth: number
  ): void {
    const directionalLight = this._scene.children.find(
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
    if (this._robotIndex !== -1) {
      this._scene.children[this._robotIndex].traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
      this._scene.children.splice(this._robotIndex, 1);
    }

    this._robotIndex = this._scene.children.length;
    this._scene.add(robot);
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
   * Un-highlights a single selected link.
   * @param type - The type of selection to clear ('parent' or 'child').
   */
  unHighlightLink(type: 'parent' | 'child'): void {
    const selectedObj =
      type === 'parent' ? this._selectedParentObj : this._selectedChildObj;

    if (selectedObj.link) {
      selectedObj.link.material = selectedObj.originalMaterial;
      if (selectedObj.tag) {
        selectedObj.link.remove(selectedObj.tag);
      }
      selectedObj.link = null;
      selectedObj.originalMaterial = null;
      selectedObj.tag = null;
    }
    this.redraw();
  }

  /**
   * Refreshes the viewer by re-rendering the scene and its elements
   */
  redraw(): void {
    const renderSize = this.getSize(new THREE.Vector2());
    this._camera.aspect = renderSize.width / renderSize.height;
    this._camera.updateProjectionMatrix();
    this.render(this._scene, this._camera);
    if (this._css2dRenderer) {
      this._css2dRenderer.render(this._scene, this._camera);
    }
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
}
