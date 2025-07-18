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
  private _editorFolder: any;
  private _workingPath = '';

  controls: any = {
    path: {},
    scene: {
      background: {},
      grid: {},
      height: {}
    },
    joints: {},
    lights: {},
    editor: {}
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

    // Add resize functionality
    this._setupResizeHandling({
      minWidth: 150,
      grabZoneWidth: 12
    });

    // Create folders
    this._jointsFolder = this.addFolder('Joints');
    this._jointsFolder.domElement.setAttribute('class', 'dg joints-folder');

    this._workspaceFolder = this.addFolder('Workspace');
    this._workspaceFolder.domElement.setAttribute(
      'class',
      'dg workspace-folder'
    );

    this._sceneFolder = this.addFolder('Scene');
    this._sceneFolder.domElement.setAttribute('class', 'dg scene-folder');

    this._editorFolder = this.addFolder('Editor');
    this._editorFolder.domElement.setAttribute('class', 'dg editor-folder');
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
   * Retrieves the folder with editor settings
   */
  get editorFolder() {
    return this._editorFolder;
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
   * Restricts input on a control to numeric and special characters.
   *
   * @param control - The dat.gui controller to modify.
   */
  private _enforceNumericInput(control: any): void {
    const inputElement = control.domElement as HTMLInputElement;

    inputElement.addEventListener('input', (event: Event) => {
      const target = event.target as HTMLInputElement;
      const originalValue = target.value;

      // Remove any characters that aren't digits, spaces, periods, or minus signs
      const filteredValue = originalValue.replace(/[^\d.\s-]/g, '');

      if (originalValue !== filteredValue) {
        target.value = filteredValue;
        // Trigger dat.gui's internal change detection
        control.updateDisplay();
      }
    });
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

  /**
   * Sets up panel resizing functionality
   * @param minWidth - Minimum width of the panel
   * @param maxWidth - Maximum width of the panel
   * @param grabZoneWidth - Width of the area where the mouse can be clicked
   */
  private _setupResizeHandling(options: {
    minWidth: number;
    grabZoneWidth: number;
  }): void {
    let isResizing = false;
    let startX: number;
    let startWidth: number;

    const { minWidth, grabZoneWidth } = options;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) {
        return;
      }

      const width = startWidth - (e.clientX - startX);
      if (width >= minWidth) {
        this.domElement.style.width = `${width}px`;
      }
    };

    const onMouseUp = () => {
      isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    this.domElement.addEventListener('mousedown', (e: MouseEvent) => {
      if (
        e.clientX <
        this.domElement.getBoundingClientRect().left + grabZoneWidth
      ) {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(getComputedStyle(this.domElement).width, 10);
        e.preventDefault();

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }
    });

    // Show resize cursor when hovering near left edge
    this.domElement.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.domElement.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      this.domElement.style.cursor =
        offsetX < grabZoneWidth || isResizing ? 'ew-resize' : 'auto';
    });
    this.domElement.addEventListener('mouseleave', () => {
      if (!isResizing) {
        this.domElement.style.cursor = 'auto';
      }
    });
  }

  /**
   * Creates controls for the different lights in the scene
   *
   * @returns - The controls to trigger callbacks when light settings change
   */
  createLightControls() {
    if (this._isEmpty(this.controls.lights)) {
      // Create subfolders for each light
      const directionalFolder =
        this._sceneFolder.addFolder('Directional Light');
      const ambientFolder = this._sceneFolder.addFolder('Ambient Light');
      const hemisphereFolder = this._sceneFolder.addFolder('Hemisphere Light');

      // Initialize settings for each light type
      const directionalSettings = {
        Altitude: Math.PI / 4, // 45 degrees elevation
        Azimuth: Math.PI / 4, // 45 degrees around vertical axis
        Color: [255, 255, 255],
        Intensity: 1.0,
        ShowHelper: false
      };

      const ambientSettings = {
        Color: [255, 255, 255],
        Intensity: 0.5
      };

      const hemisphereSettings = {
        SkyColor: [255, 255, 255],
        GroundColor: [38, 50, 56],
        Intensity: 1.0,
        ShowHelper: false
      };

      // Spherical coordinate angle limits and steps
      const minAngle = -Math.PI;
      const maxAngle = Math.PI;
      const angleStep = 0.01;

      // Intensity limits and steps
      const minIntensity = 0.0;
      const maxIntensity = 10.0;
      const intensityStep = 0.01;

      // Controls for directional light
      this.controls.lights.directional = {
        position: {
          altitude: directionalFolder.add(
            directionalSettings,
            'Altitude',
            minAngle,
            maxAngle,
            angleStep
          ),
          azimuth: directionalFolder.add(
            directionalSettings,
            'Azimuth',
            minAngle,
            maxAngle,
            angleStep
          )
        },
        color: directionalFolder.addColor(directionalSettings, 'Color'),
        intensity: directionalFolder.add(
          directionalSettings,
          'Intensity',
          minIntensity,
          maxIntensity,
          intensityStep
        ),
        showHelper: directionalFolder
          .add(directionalSettings, 'ShowHelper')
          .name('Show Helper')
      };

      // Ambient light controls
      this.controls.lights.ambient = {
        color: ambientFolder.addColor(ambientSettings, 'Color'),
        intensity: ambientFolder.add(
          ambientSettings,
          'Intensity',
          minIntensity,
          maxIntensity,
          intensityStep
        )
      };

      // Hemisphere light controls
      this.controls.lights.hemisphere = {
        skyColor: hemisphereFolder
          .addColor(hemisphereSettings, 'SkyColor')
          .name('Sky Color'),
        groundColor: hemisphereFolder
          .addColor(hemisphereSettings, 'GroundColor')
          .name('Ground Color'),
        intensity: hemisphereFolder.add(
          hemisphereSettings,
          'Intensity',
          minIntensity,
          maxIntensity,
          intensityStep
        ),
        showHelper: hemisphereFolder
          .add(hemisphereSettings, 'ShowHelper')
          .name('Show Helper')
      };

      // Open Scene (lights) and directional subfolder
      this._sceneFolder.open();
      directionalFolder.open();
    }

    return this.controls.lights;
  }

  /**
   * Creates controls for the editor mode
   *
   * @returns - The controls to trigger callbacks when editor settings change
   */
  createEditorControls(addJointCallback: () => void, linkNames: string[] = []) {
    if (this._isEmpty(this.controls.editor)) {
      const editorSettings = {
        'Editor Mode': false,
        'Parent Link': 'none',
        'Child Link': 'none',
        'Joint Name': 'new_joint',
        'Joint Type': 'revolute',
        'Origin XYZ': '0 0 0',
        'Origin RPY': '0 0 0',
        'Axis XYZ': '0 0 1',
        'Lower Limit': '0.0',
        'Upper Limit': '0.0',
        // eslint-disable-next-line
        Effort: '0.0',
        // eslint-disable-next-line
        Velocity: '0.0',
        'Add Joint': addJointCallback
      };

      const dropdownOptions = ['none', ...linkNames];

      this.controls.editor.mode = this._editorFolder.add(
        editorSettings,
        'Editor Mode'
      );
      this.controls.editor.parent = this._editorFolder
        .add(editorSettings, 'Parent Link', dropdownOptions)
        .listen();
      this.controls.editor.child = this._editorFolder
        .add(editorSettings, 'Child Link', dropdownOptions)
        .listen();
      this.controls.editor.name = this._editorFolder.add(
        editorSettings,
        'Joint Name'
      );
      this.controls.editor.type = this._editorFolder.add(
        editorSettings,
        'Joint Type',
        ['revolute', 'continuous', 'prismatic', 'fixed', 'floating', 'planar']
      );

      // Add origin and axis controls
      this.controls.editor.origin_xyz = this._editorFolder
        .add(editorSettings, 'Origin XYZ')
        .name('Origin XYZ');
      this.controls.editor.origin_rpy = this._editorFolder
        .add(editorSettings, 'Origin RPY')
        .name('Origin RPY');
      this.controls.editor.axis_xyz = this._editorFolder
        .add(editorSettings, 'Axis XYZ')
        .name('Axis XYZ');

      // Add limit controls
      this.controls.editor.lower = this._editorFolder
        .add(editorSettings, 'Lower Limit')
        .name('Lower Limit');
      this.controls.editor.upper = this._editorFolder
        .add(editorSettings, 'Upper Limit')
        .name('Upper Limit');
      this.controls.editor.effort = this._editorFolder
        .add(editorSettings, 'Effort')
        .name('Effort');
      this.controls.editor.velocity = this._editorFolder
        .add(editorSettings, 'Velocity')
        .name('Velocity');

      // Enforce numeric input for relevant fields
      this._enforceNumericInput(this.controls.editor.origin_xyz);
      this._enforceNumericInput(this.controls.editor.origin_rpy);
      this._enforceNumericInput(this.controls.editor.axis_xyz);
      this._enforceNumericInput(this.controls.editor.lower);
      this._enforceNumericInput(this.controls.editor.upper);
      this._enforceNumericInput(this.controls.editor.effort);
      this._enforceNumericInput(this.controls.editor.velocity);

      this.controls.editor.add = this._editorFolder.add(
        editorSettings,
        'Add Joint'
      );

      this._editorFolder.open();
    }

    return this.controls.editor;
  }
}
