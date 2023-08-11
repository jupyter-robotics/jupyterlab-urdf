import { GUI } from 'dat.gui';

import { Color } from 'three';

import { URDFJoint } from 'urdf-loader';

interface IJoints {
  [name: string]: URDFJoint;
}

/**
 * URDFControls: a GUI panel for controlling the viewer settings and
 * the robot joints
 */
export class URDFControls extends GUI {
  private _workspaceFolder: any;
  private _sceneFolder: any;
  private _jointsFolder: any;
  private _workingPath = '';

  controls: any = {
    path: {},
    scene: {
      background: {},
      grid: {},
      height: {}
    },
    joints: {}
  };

  /**
   * Creates a controls panel with the default folders
   */
  constructor() {
    super({ autoPlace: false });

    this.width = 310;
    this.domElement.style.position = 'absolute';
    this.domElement.style.top = '0';
    this.domElement.style.right = '5px';
    this.domElement.setAttribute('class', 'dg main urdf-gui');

    this._workspaceFolder = this.addFolder('Workspace');
    this._workspaceFolder.domElement.setAttribute(
      'class',
      'dg workspace-folder'
    );

    this._sceneFolder = this.addFolder('Scene');
    this._sceneFolder.domElement.setAttribute('class', 'dg scene-folder');

    this._jointsFolder = this.addFolder('Joints');
    this._jointsFolder.domElement.setAttribute('class', 'dg joints-folder');
  }

  /**
   * Retrieves the folder with workspace settings
   */
  get workspaceFolder() {
    return this._workspaceFolder;
  }

  /**
   * Retrieves the folder with scene settings
   */
  get sceneFolder() {
    return this._sceneFolder;
  }

  /**
   * Retrieves the folder with joints settings
   */
  get jointsFolder() {
    return this._jointsFolder;
  }

  /**
   * Checks if a given object is empty {}
   *
   * @param obj - The object to check
   * @returns - True when the object is empty, or false when it is not empty
   */
  private _isEmpty(obj: object): boolean {
    return Object.keys(obj).length === 0;
  }

  /**
   * Creates an input box and a button to modify the working path
   *
   * @param workingPath - The path where the loader looks for mesh files
   * @returns - The controls to trigger callbacks when the path is changed
   */
  createWorkspaceControls(workingPath = '') {
    if (this._isEmpty(this.controls.path)) {
      this._workingPath = workingPath;
      const workspaceSettings = {
        Path: this._workingPath,
        'set path': () => {
          console.debug('set path');
        }
      };
      this._workspaceFolder.add(workspaceSettings, 'Path');
      this.controls.path = this._workspaceFolder.add(
        workspaceSettings,
        'set path'
      );
      this._workspaceFolder.open();
    }
    return this.controls.path;
  }

  /**
   * Creates color selectors to modify the scene background and grid
   *
   * @param bgColor - The background color as a three.js Color
   * @param gridColor - The grid color as a three.js Color
   * @returns - The controls to trigger callbacks when the colors are changed
   */
  createSceneControls(
    bgColor = new Color(0x263238),
    gridColor = new Color(0x263238)
  ) {
    if (this._isEmpty(this.controls.scene.background)) {
      const sceneSettings = {
        Background: this._convertColor2Array(bgColor),
        Grid: this._convertColor2Array(gridColor),
        Height: 0
      };

      this.controls.scene.background = this._sceneFolder.addColor(
        sceneSettings,
        'Background'
      );
      this.controls.scene.grid = this._sceneFolder.addColor(
        sceneSettings,
        'Grid'
      );

      const minHeight = -2;
      const maxHeight = 5;
      const stepSize = 0.1;
      this.controls.scene.height = this._sceneFolder.add(
        sceneSettings,
        'Height',
        minHeight,
        maxHeight,
        stepSize
      );

      this._sceneFolder.open();
    }
    return this.controls.scene;
  }

  /**
   * Converts a three.js Color to an RGB Array
   *
   * @param color - The three.js Color to convert
   * @returns - The [R, G, B] Array with range [0, 255]
   */
  private _convertColor2Array(color: Color): number[] {
    // Note: using hex value instead of the RGB values in Color because
    // those are dependant on the color space
    const hexColor = color.getHexString();
    const colorArray = [
      parseInt(hexColor.slice(0, 2), 16),
      parseInt(hexColor.slice(2, 4), 16),
      parseInt(hexColor.slice(4, 6), 16)
    ];
    return colorArray;
  }

  /**
   * Creates number sliders for each movable robot joint
   *
   * @param joints - An object containing all of the robot's joints
   * @returns - The controls to trigger callbacks when any joint value changes
   */
  createJointControls(joints: IJoints) {
    if (this._isEmpty(this.controls.joints)) {
      Object.keys(joints).forEach((name: string) => {
        // Skip joints which should not be moved
        if (joints[name].jointType === 'fixed') {
          return;
        }

        const limitMin = Number(joints[name].limit.lower);
        const limitMax = Number(joints[name].limit.upper);

        // Skip joint if the limits are not defined
        if (limitMin === 0 && limitMax === 0) {
          return;
        }

        const stepSize = (limitMax - limitMin) / 20;
        const initValue = joints[name].jointValue[0];

        this.controls.joints[name] = this._jointsFolder.add(
          { [name]: initValue },
          name,
          limitMin,
          limitMax,
          stepSize
        );
      });
      this._jointsFolder.open();
    }
    return this.controls.joints;
  }
}
